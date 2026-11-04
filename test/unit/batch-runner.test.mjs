import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runSession,runBatch} from '../../evaluation/run-batch.mjs';

const root=path.resolve('.work/batch-runner-tests');
async function fixture(t){await fs.mkdir(root,{recursive:true});const dir=await fs.mkdtemp(path.join(root,'case-'));t.after(async()=>{assert.equal(path.dirname(dir),root);assert.ok(path.basename(dir).startsWith('case-'));await fs.rm(dir,{recursive:true,force:true});});return dir;}
function session(dir,code,extra={}){return runSession({command:process.execPath,args:['-e',code],cwd:dir,task:'synthetic only',outputDirectory:dir,...extra});}

test('success preserves final text and observed counters, not missing counters',async t=>{
  const dir=await fixture(t);
  const result=await session(dir,`process.stdin.resume();for(const e of [
    {type:'status',phase:'step_end',usage:{inputTokens:12,outputTokens:3}},
    {type:'tool_call',callId:'a',name:'listen'},
    {type:'tool_result',callId:'a',status:'completed'},
    {type:'final',text:'  exact answer\\n'}])console.log(JSON.stringify(e));console.error('synthetic stderr');`);
  assert.equal(result.status,'complete');assert.equal(result.model_output,'  exact answer\n');
  assert.equal(result.model_requests,1);assert.deepEqual(result.usage,{input_tokens:12,output_tokens:3});
  assert.deepEqual(result.tool_calls,[{name:'listen',status:'completed'}]);assert.equal(result.cleanup_failed,false);
  assert.match(await fs.readFile(path.join(dir,'events.jsonl'),'utf8'),/final/);
  assert.match(await fs.readFile(path.join(dir,'stderr.log'),'utf8'),/synthetic stderr/);
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

test('batch validates every task hash before creating results or launching commands',async t=>{
  const dir=await fixture(t),workspace=path.join(dir,'shared');await fs.mkdir(workspace);await fs.writeFile(path.join(workspace,'task.txt'),'synthetic');
  await fs.writeFile(path.join(dir,'run.json'),JSON.stringify({project_root:dir}));
  const samples=Array.from({length:10},(_,i)=>({id:`case-${i}`,workspace:'shared',task_protocol:'mmau-plain-text-v1',task_sha256:'wrong'}));
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({samples}));
  await assert.rejects(runBatch(dir),/BATCH_TASK_HASH_MISMATCH/);
  await assert.rejects(fs.stat(path.join(dir,'results')),{code:'ENOENT'});
  // A correct first task must not hide a changed later task.
  samples.forEach(row=>{row.task_sha256=createHash('sha256').update('synthetic').digest('hex');row.audio_sha256=createHash('sha256').update('audio').digest('hex');});
  await fs.writeFile(path.join(workspace,'audio.wav'),'audio');samples[9].task_sha256='changed';
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({samples}));
  await assert.rejects(runBatch(dir),/BATCH_TASK_HASH_MISMATCH/);
  samples[9].task_sha256=samples[0].task_sha256;samples[9].audio_sha256='changed';
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({samples}));
  await assert.rejects(runBatch(dir),/BATCH_AUDIO_HASH_MISMATCH/);
});
