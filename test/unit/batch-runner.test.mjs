import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runSession,runBatch} from '../../evaluation/run-batch.mjs';

const root=path.resolve('.work/batch-runner-tests');
async function fixture(t){await fs.mkdir(root,{recursive:true});const dir=await fs.mkdtemp(path.join(root,'case-'));t.after(async()=>{assert.equal(path.dirname(dir),root);assert.ok(path.basename(dir).startsWith('case-'));await fs.rm(dir,{recursive:true,force:true});});return dir;}
function session(dir,code,extra={}){return runSession({command:process.execPath,args:['-e',code],cwd:dir,task:'synthetic only',outputDirectory:dir,...extra});}

test('success preserves final text and observed counters, not missing counters',async t=>{
  const dir=await fixture(t);
  const result=await session(dir,`process.stdin.resume();for(const e of [
    {type:'session',sessionId:'synthetic-session'},
    {type:'status',phase:'step_end',usage:{inputTokens:12,outputTokens:3}},
    {type:'tool_call',callId:'a',name:'listen'},
    {type:'tool_result',callId:'a',status:'completed'},
    {type:'final',text:'  exact answer\\n'}])console.log(JSON.stringify(e));console.error('synthetic stderr');`);
  assert.equal(result.status,'complete');assert.equal(result.model_output,'  exact answer\n');
  assert.equal(result.session_id,'synthetic-session');assert.equal(result.model_requests,1);assert.deepEqual(result.usage,{input_tokens:12,output_tokens:3});
  assert.deepEqual(result.tool_calls,[{name:'listen',status:'completed'}]);assert.equal(result.cleanup_failed,false);
  assert.match(await fs.readFile(path.join(dir,'events.jsonl'),'utf8'),/final/);
  assert.match(await fs.readFile(path.join(dir,'stderr.log'),'utf8'),/synthetic stderr/);
});

test('answer words about payment and authentication are not control-plane errors',async t=>{
  const dir=await fixture(t),text='The speaker discusses payment, authentication, and quota.';
  const result=await session(dir,`console.log(JSON.stringify({type:'final',text:${JSON.stringify(text)}}));`);
  assert.equal(result.status,'complete');assert.equal(result.model_output,text);assert.equal(result.stop_batch,false);
});

test('credential and unavailable-model control-plane failures stop the batch',async t=>{
  for(const text of ['MISSING_CREDENTIAL','no API key configured','MODEL_NOT_FOUND','model not available','no configured model','insufficient balance']){
    const dir=await fixture(t),result=await session(dir,`console.log(JSON.stringify({type:'error',message:${JSON.stringify(text)}}));`);
    assert.equal(result.stop_batch,true);assert.equal(result.model_output,'');assert.equal(result.error,'AUTH_QUOTA_OR_BUDGET_FAILURE');
  }
});

test('failure, empty final and spawn errors never become predictions',async t=>{
  for(const code of [`console.log(JSON.stringify({type:'final',text:'wrong'}));process.exitCode=2;`,`console.log(JSON.stringify({type:'final',text:'  '}));`,'']){
    const dir=await fixture(t),result=await session(dir,code);assert.equal(result.status,'failed');assert.equal(result.model_output,'');
    assert.equal(result.model_requests,undefined);assert.equal(result.usage,undefined);
  }
  const dir=await fixture(t),result=await runSession({command:path.join(dir,'does-not-exist'),cwd:dir,task:'',outputDirectory:dir});
  assert.equal(result.status,'failed');assert.match(result.error,/SPAWN_FAILED/);
});

test('deadline does not reset on progress; TERM-resistant child gets bounded KILL',async t=>{
  const dir=await fixture(t),result=await session(dir,`process.on('SIGTERM',()=>console.log(JSON.stringify({type:'final',text:'late'})));setInterval(()=>console.log(JSON.stringify({type:'status',phase:'progress'})),10);`,{timeoutMs:180,graceMs:60});
  assert.equal(result.status,'timeout');assert.equal(result.model_output,'');assert.ok(result.duration_ms>=180);assert.ok(result.duration_ms<2000);
  assert.equal(result.signal,'SIGKILL');assert.equal(result.cleanup_failed,false);
});

test('managed process group kills a resistant leader and its descendant',async t=>{
  const dir=await fixture(t),pidFile=path.join(dir,'descendant.pid');
  const code=`const {spawn}=require('node:child_process');const fs=require('node:fs');process.on('SIGTERM',()=>{});const c=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],{stdio:'ignore'});fs.writeFileSync(${JSON.stringify(pidFile)},String(c.pid));setInterval(()=>{},1000);`;
  const result=await session(dir,code,{timeoutMs:250,graceMs:80});
  assert.equal(result.status,'timeout');const pid=Number(await fs.readFile(pidFile,'utf8'));
  assert.throws(()=>process.kill(pid,0),{code:'ESRCH'});
});

test('surviving descendant after leader exits is uncertain and stops batch',async t=>{
  const dir=await fixture(t),pidFile=path.join(dir,'descendant.pid');
  const result=await session(dir,`const c=require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(c.pid));c.unref();console.log(JSON.stringify({type:'final',text:'answer'}));`);
  const pid=Number(await fs.readFile(pidFile,'utf8'));try{assert.equal(result.cleanup_failed,true);assert.equal(result.stop_batch,true);assert.equal(result.model_output,'');}finally{try{process.kill(pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}}
});

test('cancellation cleans up and requests batch stop',async t=>{
  const dir=await fixture(t);
  const pending=session(dir,'setInterval(()=>{},1000)',{graceMs:60});
  const timer=setTimeout(()=>process.emit('SIGTERM'),120);
  try{const result=await pending;assert.equal(result.cancelled,true);assert.equal(result.stop_batch,true);assert.equal(result.model_output,'');assert.equal(result.cleanup_failed,false);}finally{clearTimeout(timer);}
});

test('exclusive logs refuse overwrite before starting another command',async t=>{
  const dir=await fixture(t);await fs.writeFile(path.join(dir,'stderr.log'),'keep');
  await assert.rejects(session(dir,`require('node:fs').writeFileSync('spawned','bad')`),{code:'EEXIST'});
  assert.equal(await fs.readFile(path.join(dir,'stderr.log'),'utf8'),'keep');
  await assert.rejects(fs.stat(path.join(dir,'spawned')),{code:'ENOENT'});
});

test('each log is bounded at 32 MiB and overflow cancels session',async t=>{
  const dir=await fixture(t),result=await session(dir,`const b=Buffer.alloc(1024*1024,120);(async()=>{for(let i=0;i<40;i++)if(!process.stderr.write(b))await new Promise(r=>process.stderr.once('drain',r));setInterval(()=>{},1000);})();`,{timeoutMs:5000,graceMs:60});
  assert.equal(result.status,'failed');assert.equal(result.model_output,'');assert.match(result.error,/LOG_LIMIT_EXCEEDED/);
  assert.equal((await fs.stat(path.join(dir,'stderr.log'))).size,32*1024*1024);
});

async function batchFixture(t,count=3){
  const dir=await fixture(t),workspace=path.join(dir,'shared');await fs.mkdir(workspace);
  await fs.writeFile(path.join(workspace,'task.txt'),'synthetic');await fs.writeFile(path.join(workspace,'audio.wav'),'audio');
  const run={project_root:dir,dsh_home:'home',overlay_path:'overlay.yml',session_timeout_ms:600000};
  const samples=Array.from({length:count},(_,i)=>({id:`case-${i}`,workspace:'shared',task_protocol:'mmau-plain-text-v1',task_sha256:createHash('sha256').update('synthetic').digest('hex'),audio_sha256:createHash('sha256').update('audio').digest('hex')}));
  await fs.writeFile(path.join(dir,'run.json'),JSON.stringify(run));await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({samples}));
  // Deliberately opaque to the runner; only DSH may interpret this trusted config.
  await fs.writeFile(path.join(dir,'overlay.yml'),'trusted configuration, not runner-parsed YAML');
  return {dir,run,samples};
}

test('batch rejects empty, unsafe or duplicate ids before any dispatch',async t=>{
  for(const change of [rows=>rows.splice(0),rows=>rows[0].id='../escape',rows=>rows[0].id='.',rows=>rows[0].id='',rows=>rows[1].id=rows[0].id,rows=>rows[2]=null]){
    const {dir,samples}=await batchFixture(t);change(samples);await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({samples}));
    await assert.rejects(runBatch(dir),/INVALID_BATCH_(MANIFEST|ID)/);await assert.rejects(fs.stat(path.join(dir,'results')),{code:'ENOENT'});
  }
});

test('batch validates last task before dispatch',async t=>{
  const {dir,samples}=await batchFixture(t,7);samples[6].task_sha256='changed';await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({samples}));
  await assert.rejects(runBatch(dir),/BATCH_TASK_HASH_MISMATCH/);await assert.rejects(fs.stat(path.join(dir,'results')),{code:'ENOENT'});
});

test('batch validates every task protocol and task/audio hash before results',async t=>{
  for(const [key,value,error] of [['task_protocol','changed','BATCH_TASK_PROTOCOL_MISMATCH'],['task_sha256','changed','BATCH_TASK_HASH_MISMATCH'],['audio_sha256','changed','BATCH_AUDIO_HASH_MISMATCH']]){
    const {dir,samples}=await batchFixture(t,3);samples[2][key]=value;await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({samples}));
    await assert.rejects(runBatch(dir),new RegExp(error));await assert.rejects(fs.stat(path.join(dir,'results')),{code:'ENOENT'});
  }
});

test('all cases launch without budget patch or env despite stale limits and exhausted budget',async t=>{
  for(const staleLimit of [undefined,0,-1,'obsolete',3]){
    const {dir,run}=await batchFixture(t,7),bin=path.join(dir,'bin'),calls=path.join(dir,'calls.jsonl'),lock=path.join(dir,'active.lock');await fs.mkdir(bin);
    run.max_model_requests=staleLimit;run.authorized_cases=1;await fs.writeFile(path.join(dir,'run.json'),JSON.stringify(run));
    const staleBudget=JSON.stringify({requests:3});await fs.writeFile(path.join(dir,'budget.json'),staleBudget);
    const fake=`#!${process.execPath}
import fs from 'node:fs';
fs.writeFileSync(${JSON.stringify(lock)},'active',{flag:'wx'});
fs.appendFileSync(${JSON.stringify(calls)},JSON.stringify({args:process.argv.slice(2),budgetEnv:Object.keys(process.env).filter(key=>key.startsWith('DSH_EVALUATION_')),home:process.env.DSH_HOME,cwd:process.cwd()})+'\\n');
let task='';process.stdin.on('data',chunk=>task+=chunk);process.stdin.on('end',()=>{
  if(task!=='synthetic')process.exit(2);
  for(let i=0;i<2;i++)console.log(JSON.stringify({type:'status',phase:'step_end'}));
  fs.unlinkSync(${JSON.stringify(lock)});
  console.log(JSON.stringify({type:'final',text:'synthetic answer'}));
});
`;
    await fs.writeFile(path.join(bin,'dsh'),fake,{mode:0o700});
    const overrides={PATH:bin+path.delimiter+(process.env.PATH??''),DSH_EVALUATION_BUDGET_FILE:path.join(dir,'inherited-budget.json'),DSH_EVALUATION_SESSION_BUDGET_FILE:path.join(dir,'inherited-session.json'),DSH_EVALUATION_MAX_REQUESTS:'0'};
    const old=Object.fromEntries(Object.keys(overrides).map(key=>[key,process.env[key]]));Object.assign(process.env,overrides);
    try{await runBatch(dir);}finally{for(const [key,value] of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
    const observed=(await fs.readFile(calls,'utf8')).trim().split('\n').map(JSON.parse);assert.equal(observed.length,7);
    const preset=fileURLToPath(new URL('../../evaluation/preset.patch.yml',import.meta.url));
    for(const call of observed){
      assert.deepEqual(call.args,['--profile','headless','--patch',preset,'--patch',path.join(dir,'overlay.yml'),'--json','-']);
      assert.deepEqual(call.budgetEnv,[]);assert.equal(call.home,path.join(dir,run.dsh_home));assert.equal(call.cwd,path.join(dir,'shared'));
    }
    for(let i=0;i<7;i++){
      const output=path.join(dir,'results',`case-${i}`),result=JSON.parse(await fs.readFile(path.join(output,'result.json'),'utf8'));
      assert.equal(result.status,'complete');assert.equal(result.model_requests,2);assert.equal(result.model_output,'synthetic answer');
      assert.deepEqual((await fs.readdir(output)).sort(),['events.jsonl','result.json','stderr.log']);
      assert.match(await fs.readFile(path.join(output,'events.jsonl'),'utf8'),/synthetic answer/);assert.equal(await fs.readFile(path.join(output,'stderr.log'),'utf8'),'');
    }
    assert.equal(await fs.readFile(path.join(dir,'budget.json'),'utf8'),staleBudget);
    assert.equal(JSON.parse(await fs.readFile(path.join(dir,'run.json'),'utf8')).status,'finished');
    await assert.rejects(runBatch(dir),{code:'EEXIST'});
  }
});
