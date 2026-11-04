// Serial, opt-in batch execution. Importing this module never starts a model.
import fs from 'node:fs/promises';
import {writeSync} from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {StringDecoder} from 'node:string_decoder';
import {fileURLToPath} from 'node:url';

const LOG_LIMIT = 32 * 1024 * 1024;
const STOP_PATTERN = /quota|insufficient|payment|HTTP.?40[129]|HTTP.?429|unauthori[sz]ed|authentication|HEADLESS_PREVIEW_REQUEST_LIMIT|INVALID_BUDGET|EEXIST.*budget/i;

/** Run one shell-free POSIX session. The caller assigns the manifest id. */
export async function runSession({command,args=[],cwd,env,task,outputDirectory,timeoutMs=600000,graceMs=2000}) {
  if(process.platform==='win32')throw Error('POSIX_PROCESS_GROUP_REQUIRED');
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0||!Number.isFinite(graceMs)||graceMs<=0)throw Error('INVALID_SESSION_DEADLINE');
  // Exclusive artifacts are acquired before spawning; never truncate an earlier run.
  const out=await fs.open(path.join(outputDirectory,'events.jsonl'),'wx',0o600);
  let err;
  try{err=await fs.open(path.join(outputDirectory,'stderr.log'),'wx',0o600);}catch(error){await out.close();throw error;}
  const started=performance.now(),deadline=started+timeoutMs;
  let child,reaped=false,settled=false,timedOut=false,cancelled=false,failure,cleanupFailed=false,finalText,exitCode,signal;
  let deadlineTimer,killTimer,finishTimer,stdoutBytes=0,stderrBytes=0,line='',stderrTail='',steps=0;
  const usage={},missingUsage=new Set(),calls=[],byId=new Map();
  const decoder=new StringDecoder('utf8');
  let sawEvents=false;
  const groupExists=()=>{try{process.kill(-child.pid,0);return true;}catch(error){return error.code!=='ESRCH';}};
  let resolveDone;
  const done=new Promise(resolve=>{resolveDone=resolve;});
  function finish(){if(settled)return;settled=true;clearTimeout(deadlineTimer);clearTimeout(killTimer);clearTimeout(finishTimer);child?.stdout?.destroy();child?.stderr?.destroy();resolveDone();}
  function send(sig){
    if(reaped||!child?.pid)return;
    try{process.kill(-child.pid,sig);}catch(error){if(error.code!=='ESRCH'){cleanupFailed=true;failure??=`GROUP_SIGNAL_FAILED: ${error.code}`;}}
  }
  function stop(reason){
    if(settled||timedOut||cancelled||failure)return;
    if(reason==='timeout')timedOut=true;else if(reason==='cancelled')cancelled=true;else failure=reason;
    send('SIGTERM');
    killTimer=setTimeout(()=>{
      // Never signal an old PGID once its leader has been reaped.
      if(reaped){if(groupExists())cleanupFailed=true;finish();return;}
      send('SIGKILL');
      finishTimer=setTimeout(()=>{if(!reaped)cleanupFailed=true;finish();},graceMs);
    },graceMs);
  }
  function event(text){
    if(performance.now()>=deadline){stop('timeout');return;}
    if(timedOut||cancelled||failure)return;
    let row;try{row=JSON.parse(text);}catch{return;}
    sawEvents=true;
    if(row.type==='final'&&typeof row.text==='string')finalText=row.text;
    if(row.type==='status'&&row.phase==='step_end'){
      steps++;
      for(const [target,source] of Object.entries({input_tokens:'inputTokens',output_tokens:'outputTokens',cache_read_tokens:'cacheReadTokens'})){
        const value=row.usage?.[source];
        if(Number.isSafeInteger(value)&&value>=0)usage[target]=(usage[target]??0)+value;else missingUsage.add(target);
      }
    }
    if(row.type==='tool_call'){
      const call={name:row.name??row.toolName??(typeof row.tool==='string'?row.tool:row.tool?.name)??'unknown',status:'pending'};
      calls.push(call);byId.set(row.callId??row.id,call);
    }
    if(row.type==='tool_result'){
      const call=byId.get(row.callId??row.id);
      if(call)call.status=typeof row.status==='string'?row.status:'unknown';
    }
    if((row.type==='error'||row.type==='status'&&row.phase==='error')&&STOP_PATTERN.test(JSON.stringify(row)))stop('AUTH_QUOTA_OR_BUDGET_FAILURE');
  }
  function receive(chunk,isError){
    const used=isError?stderrBytes:stdoutBytes,remaining=LOG_LIMIT-used;
    try{if(remaining>0)writeSync(isError?err.fd:out.fd,chunk.subarray(0,remaining));}catch(error){stop(`LOG_WRITE_FAILED: ${error.code}`);return;}
    if(isError){stderrBytes+=Math.min(chunk.length,remaining);stderrTail=(stderrTail+chunk.toString('utf8')).slice(-65536);if(STOP_PATTERN.test(stderrTail))stop('AUTH_QUOTA_OR_BUDGET_FAILURE');}
    else{
      stdoutBytes+=Math.min(chunk.length,remaining);
      line+=decoder.write(chunk.subarray(0,remaining));
      let index;while((index=line.indexOf('\n'))!==-1){event(line.slice(0,index));line=line.slice(index+1);}
    }
    if(chunk.length>remaining)stop('LOG_LIMIT_EXCEEDED');
  }
  const cancel=()=>stop('cancelled');
  try{
    child=spawn(command,args,{cwd,env:env??process.env,detached:true,shell:false,stdio:['pipe','pipe','pipe']});
    process.on('SIGINT',cancel);process.on('SIGTERM',cancel);
    deadlineTimer=setTimeout(()=>stop('timeout'),Math.max(0,deadline-performance.now()));
    child.stdout.on('data',chunk=>receive(chunk,false));child.stderr.on('data',chunk=>receive(chunk,true));
    child.stdout.on('error',error=>stop(`STDOUT_FAILED: ${error.code}`));child.stderr.on('error',error=>stop(`STDERR_FAILED: ${error.code}`));
    child.stdin.on('error',error=>{if(error.code!=='EPIPE')stop(`STDIN_FAILED: ${error.code}`);});
    child.once('error',error=>{failure=`SPAWN_FAILED: ${error.code}`;reaped=true;finish();});
    child.once('exit',(code,sig)=>{
      reaped=true;exitCode=code;signal=sig;
      if(performance.now()>=deadline&&!timedOut&&!cancelled&&!failure)timedOut=true;
      // Descendants surviving their leader cannot safely be signalled by this PGID.
      if(groupExists())cleanupFailed=true;
      finishTimer=setTimeout(()=>{cleanupFailed=true;finish();},graceMs);
    });
    child.once('close',()=>{line+=decoder.end();if(line)event(line);finish();});
    child.stdin.end(task);
    await done;
  }catch(error){
    failure??=`SESSION_FAILED: ${error.message}`;
    if(child?.pid&&!reaped){send('SIGKILL');await new Promise(resolve=>{const timer=setTimeout(()=>{cleanupFailed=true;resolve();},graceMs);child.once('exit',()=>{clearTimeout(timer);reaped=true;resolve();});});}
  }finally{
    clearTimeout(deadlineTimer);clearTimeout(killTimer);clearTimeout(finishTimer);
    process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);
    child?.stdin?.destroy();child?.stdout?.destroy();child?.stderr?.destroy();
    try{await out.close();}catch{cleanupFailed=true;}try{await err.close();}catch{cleanupFailed=true;}
  }
  const fatal=STOP_PATTERN.test(stderrTail)||failure==='AUTH_QUOTA_OR_BUDGET_FAILURE';
  const complete=!timedOut&&!cancelled&&!failure&&!cleanupFailed&&exitCode===0&&typeof finalText==='string'&&finalText.trim().length>0;
  for(const key of missingUsage)delete usage[key];
  return {status:timedOut?'timeout':complete?'complete':'failed',model_output:complete?finalText:'',duration_ms:Math.round(performance.now()-started),
    ...(steps?{model_requests:steps}:{}),...(Object.keys(usage).length?{usage}:{}),...(sawEvents?{tool_calls:calls}:{}),
    exit_code:exitCode??null,signal:signal??null,cleanup_failed:cleanupFailed,stop_batch:cleanupFailed||cancelled||fatal,
    ...(failure?{error:failure}:{}),...(cancelled?{cancelled:true}:{})};
}

async function json(file){return JSON.parse(await fs.readFile(file,'utf8'));}
async function save(file,value){const temp=file+'.tmp';await fs.writeFile(temp,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});await fs.rename(temp,file);}

export async function runBatch(runDirectory){
  const directory=path.resolve(runDirectory),run=await json(path.join(directory,'run.json')),manifest=await json(path.join(directory,'manifest.json'));
  const rows=manifest.samples;
  if(!Array.isArray(rows)||rows.length!==10)throw Error('INVALID_BATCH_MANIFEST: expected ten samples');
  const ids=new Set(),tasks=[];
  // Validate the entire batch before spawning any session (including later tasks).
  for(const row of rows){
    if(typeof row.id!=='string'||! /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(row.id)||ids.has(row.id))throw Error('INVALID_BATCH_ID');ids.add(row.id);
    if(typeof row.workspace!=='string'||typeof row.task_sha256!=='string')throw Error('INVALID_BATCH_TASK');
    if(row.task_protocol!=='mmau-plain-text-v1')throw Error('BATCH_TASK_PROTOCOL_MISMATCH');
    const workspace=path.resolve(run.project_root??directory,row.workspace),task=await fs.readFile(path.join(workspace,'task.txt'),'utf8');
    if(createHash('sha256').update(task).digest('hex')!==row.task_sha256)throw Error('BATCH_TASK_HASH_MISMATCH');
    if(typeof row.audio_sha256!=='string'||createHash('sha256').update(await fs.readFile(path.join(workspace,'audio.wav'))).digest('hex')!==row.audio_sha256)throw Error('BATCH_AUDIO_HASH_MISMATCH');
    tasks.push({workspace,task});
  }
  if(typeof run.dsh_home!=='string'||typeof run.overlay_path!=='string'||!run.model||run.session_timeout_ms!==600000||run.max_audio_calls!==3||run.max_model_requests!==40)throw Error('INVALID_BATCH_RUN_CONFIG');
  const home=path.resolve(directory,run.dsh_home),overlay=path.resolve(directory,run.overlay_path),budget=path.join(directory,'budget.json');
  const overlayText=await fs.readFile(overlay,'utf8');
  // The existing restriction enforces three tool executions and forty requests.
  const restriction=fileURLToPath(new URL('./restrict-headless.mjs',import.meta.url));
  if(!overlayText.includes(restriction)||!overlayText.includes(budget)||!/^\s*budgetFile:\s*\S+/m.test(overlayText))throw Error('MISSING_BATCH_RESTRICTION');
  const budgetState=await json(budget);
  if(!Number.isSafeInteger(budgetState.requests)||budgetState.requests<0||budgetState.requests>40)throw Error('INVALID_BATCH_BUDGET');
  // Directory exclusivity is the execution lock: interrupted batches never resume.
  const results=path.join(directory,'results');await fs.mkdir(results,{mode:0o700});
  let stopped=budgetState.requests>=40;
  run.status='running';await save(path.join(directory,'run.json'),run);
  try{
    for(let index=0;index<rows.length;index++){
      const row=rows[index],outputDirectory=path.join(results,row.id);await fs.mkdir(outputDirectory,{mode:0o700});
      let before;
      if(!stopped){const state=await json(budget);before=state.requests;if(!Number.isSafeInteger(before)||before<0||before>=40)stopped=true;}
      const result=stopped?{status:'not_run',model_output:''}:await runSession({command:'dsh',args:['--profile','headless','--patch',overlay,'--json','-'],cwd:tasks[index].workspace,env:{...process.env,DSH_HOME:home,NODE_USE_ENV_PROXY:'0'},task:tasks[index].task,outputDirectory});
      if(result.status!=='not_run'){
        try{const after=(await json(budget)).requests;if(!Number.isSafeInteger(after)||after<before||after>40)throw Error('INVALID_BATCH_BUDGET');result.model_requests=after-before;}
        catch(error){delete result.model_requests;result.stop_batch=true;result.error=error.message;}
      }
      await save(path.join(outputDirectory,'result.json'),{id:row.id,...result});
      console.log(JSON.stringify({id:row.id,status:result.status,model_requests:result.model_requests??null,duration_ms:result.duration_ms??null}));
      if(result.stop_batch)stopped=true;
    }
    run.status=stopped?'stopped':'finished';
  }catch(error){run.status='stopped';run.error=error.message;throw error;}
  finally{await save(path.join(directory,'run.json'),run);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==3){console.error('Usage: node evaluation/run-batch.mjs RUN_DIRECTORY');process.exitCode=1;}
  else runBatch(process.argv[2]).catch(error=>{console.error(error.message);process.exitCode=1;});
}
