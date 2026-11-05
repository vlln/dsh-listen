import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {experimentPlugins,formatExperimentTask} from '../../evaluation/config/experiment.mjs';
import {runSession} from '../../evaluation/lib/run-session.mjs';
import {encodeAsrWav} from '../../src/wav.mjs';

const runtime=process.env.DSH_RUNTIME_ROOT;
const project=fileURLToPath(new URL('../../',import.meta.url));
const answerKey='PRIVATE_ANSWER_KEY_SENTINEL_DO_NOT_SEND_729e';
const row={id:'synthetic-tone',question:'Which description matches the sound?',choices:['A sustained tone','Complete silence','Spoken words','Applause'],answer:answerKey,answer_key:answerKey};

async function workspace(t){
  const root=path.join(project,'.work','experiment-preset-tests');
  await fs.mkdir(root,{recursive:true});
  const directory=await fs.mkdtemp(path.join(root,'case-'));
  t.after(async()=>{
    // Only delete this test's verified direct child, never a caller-provided path.
    assert.equal(path.dirname(path.resolve(directory)),root);
    assert.match(path.basename(directory),/^case-/);
    assert.equal(await fs.realpath(directory),directory);
    await fs.rm(directory,{recursive:true,force:true});
  });
  return directory;
}

function response(res,done){
  const message=done?{role:'assistant',content:'LOCAL_EXPERIMENT_COMPLETE'}:{role:'assistant',tool_calls:[{id:'fixture-listen',type:'function',function:{name:'listen',arguments:JSON.stringify({source_path:'audio.wav',features:['signal']})}}]};
  res.setHeader('Content-Type','text/event-stream');
  const chunk=(delta,finish_reason)=>JSON.stringify({id:'fixture',object:'chat.completion.chunk',created:0,model:'fixture',choices:[{index:0,delta,finish_reason}]});
  res.end(`data: ${chunk(message,null)}\n\ndata: ${chunk({},done?'stop':'tool_calls')}\n\ndata: [DONE]\n\n`);
}

function toolText(message){
  return typeof message.content==='string'?message.content:message.content.filter(block=>block.type==='text').map(block=>block.text).join('\n');
}

{
  const condition='audio';
  test('installed runtime audio experiment: exact persona, tools, schema and unified evidence',{skip:!runtime,timeout:60000},async t=>{
    const directory=await workspace(t),seen=[];
    const server=http.createServer(async(req,res)=>{
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const body=JSON.parse(Buffer.concat(chunks));seen.push(body);
      response(res,body.messages.some(message=>message.role==='tool'));
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    t.after(()=>{server.closeAllConnections();server.close();});
    await fs.writeFile(path.join(directory,'audio.wav'),encodeAsrWav([Float32Array.from({length:2400},(_,i)=>.2*Math.sin(i*.1))],24000).bytes);
    const plugins=experimentPlugins(import.meta.url,{condition,config:{scratch:path.join(directory,'scratch'),localExecution:true},entry:fileURLToPath(new URL('../../src/index.mjs',import.meta.url))});
    // Replace the entire canonical plugins row, rather than patching a nested listen
    // config and accidentally retaining the evaluation persona or filesystem tools.
    const canonical=await fs.readFile(new URL('../../evaluation/config/preset.patch.yml',import.meta.url),'utf8');
    const start=canonical.indexOf('        plugins:\n'),end=canonical.indexOf('\n# Match the official web Host/Agent split:');
    assert.ok(start>0&&end>start,'canonical snapshot must contain one replaceable plugins row');
    const localPreset=path.join(directory,'preset.patch.yml');
    await fs.copyFile(fileURLToPath(new URL('../../evaluation/config/headless-preset.mjs',import.meta.url)),path.join(directory,'headless-preset.mjs'));
    await fs.writeFile(localPreset,canonical.slice(0,start)+`        plugins: ${JSON.stringify(plugins)}\n`+canonical.slice(end));
    const modelPatch=path.join(directory,'model.patch.yml');
    await fs.writeFile(modelPatch,`- id: agent-default-model\n  config: {provider: experiment-local-fixture, model: fixture}\n- id: llm-pi-ai\n  config:\n    providers:\n      experiment-local-fixture:\n        api: openai-completions\n        baseURL: http://127.0.0.1:${server.address().port}/v1\n        apiKeyEnv: DSH_LISTEN_FIXTURE_KEY\n        models:\n          - id: fixture\n            name: Offline experiment fixture\n            contextWindow: 128000\n            input: [text, image]\n`);
    const task=formatExperimentTask(row,condition);
    assert.ok(!task.includes(answerKey));
    assert.match(task,/audio\.wav/);
    const result=await runSession({command:'dsh',args:['--profile','headless','--patch',localPreset,'--patch',modelPatch,'--json','-'],cwd:directory,env:{...process.env,DSH_HOME:path.join(directory,'home'),DSH_LISTEN_FIXTURE_KEY:'synthetic-not-a-secret',NODE_OPTIONS:`--import ${fileURLToPath(new URL('../helpers/register-runtime.mjs',import.meta.url))}`,NODE_USE_ENV_PROXY:'0'},task,outputDirectory:directory,timeoutMs:45000});
    assert.equal(result.status,'complete',await fs.readFile(path.join(directory,'stderr.log'),'utf8'));
    assert.equal(result.model_output,'LOCAL_EXPERIMENT_COMPLETE');
    // Headless also sends a session-title request. Identify agent turns by the
    // exact task user message, not the persona/tools whose correctness we test.
    const turns=seen.filter(request=>request.messages.some(message=>message.role==='user'&&toolText(message)===task));
    assert.equal(turns.length,2);
    for(const request of seen){
      assert.ok(!JSON.stringify(request).includes(answerKey),'answer key must never enter any transport request');
      if(!turns.includes(request)){
        assert.match(toolText(request.messages.find(message=>message.role==='system')),/^Create a concise title/);
        assert.deepEqual(request.tools??[],[],'ancillary title generation must not gain tools');
      }
    }
    for(const request of turns){
      assert.deepEqual((request.tools??[]).map(tool=>tool.function.name).sort(),['listen','read_image']);
      const schema=request.tools.find(tool=>tool.function.name==='listen').function.parameters;
      assert.equal(Object.hasOwn(schema.properties,'evidence_detail'),false,'actual transported schema must not expose a detail selector');
      assert.doesNotMatch(JSON.stringify(request.tools),/evidence_detail|defaultEvidenceDetail/);
      const persona=request.messages.filter(message=>message.role==='system').map(message=>toolText(message)).join('\n');
      assert.equal(persona,'You are an Agent');
      assert.ok(!JSON.stringify(request).includes(answerKey),'answer key must never enter an actual transport request');
    }
    assert.equal(result.tool_calls.length,1);
    assert.equal(result.tool_calls[0].name,'listen');
    assert.equal(result.tool_calls[0].status,'completed');
    const output=toolText(turns[1].messages.find(message=>message.role==='tool'));
    assert.doesNotMatch(output,/limitations|detail_guidance|evidence_detail|"presentation"/);
    assert.match(output,/"energy"\s*:\s*\[/,'unified output must retain requested frame evidence');
    const call=turns[1].messages.find(message=>message.role==='assistant'&&message.tool_calls)?.tool_calls[0];
    assert.ok(call,'captured second request must include the original tool call');
    assert.deepEqual(JSON.parse(call.function.arguments),{source_path:'audio.wav',features:['signal']});
  });
}

test('experiment wall-clock deadline expires despite continuous step progress',{timeout:5000},async t=>{
  const directory=await workspace(t);
  const script=`process.stdin.resume(); const tick=()=>console.log(JSON.stringify({type:'status',phase:'step_end',usage:{inputTokens:1,outputTokens:1,cacheReadTokens:0}})); tick(); setInterval(tick,15); setTimeout(()=>{console.log(JSON.stringify({type:'final',text:'TOO_LATE'}));process.exit(0)},1000);`;
  const result=await runSession({command:process.execPath,args:['-e',script],cwd:directory,env:process.env,task:'Synthetic progress fixture',outputDirectory:directory,timeoutMs:150,graceMs:50});
  assert.equal(result.status,'timeout');
  assert.ok(result.model_requests>=2,'child must emit ongoing progress before the deadline');
  assert.equal(result.model_output,'');
  assert.equal(result.cleanup_failed,false);
  assert.equal(result.stop_batch,false);
  assert.ok(result.duration_ms>=150&&result.duration_ms<1500,JSON.stringify(result));
  assert.match(await fs.readFile(path.join(directory,'events.jsonl'),'utf8'),/step_end/);
});
