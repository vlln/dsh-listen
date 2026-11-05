// Shell-free POSIX session execution; importing never starts a model.
import fs from 'node:fs/promises';
import {writeSync} from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {StringDecoder} from 'node:string_decoder';

const LOG_LIMIT = 32 * 1024 * 1024;
const STOP_PATTERN = /quota|insufficient|payment|HTTP.?40[129]|HTTP.?429|unauthori[sz]ed|authentication|MISSING_CREDENTIAL|no API key|MODEL_NOT_FOUND|not available|no[^\r\n]*model|HEADLESS_PREVIEW_REQUEST_LIMIT|BUDGET_LOCK_TIMEOUT|INVALID_BUDGET|EEXIST.*budget/i;

/** Run one shell-free POSIX session. The caller assigns the manifest id. */
export async function runSession({command,args=[],cwd,env,task,outputDirectory,timeoutMs=300000,graceMs=2000}) {
  if(process.platform==='win32')throw Error('POSIX_PROCESS_GROUP_REQUIRED');
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0||!Number.isFinite(graceMs)||graceMs<=0)throw Error('INVALID_SESSION_DEADLINE');
  // Exclusive artifacts are acquired before spawning; never truncate an earlier run.
  const out=await fs.open(path.join(outputDirectory,'events.jsonl'),'wx',0o600);
  let err;
  try{err=await fs.open(path.join(outputDirectory,'stderr.log'),'wx',0o600);}catch(error){await out.close();throw error;}
  const started=performance.now(),deadline=started+timeoutMs;
  let child,reaped=false,settled=false,timedOut=false,cancelled=false,failure,cleanupFailed=false,finalText,exitCode,signal,sessionId;
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
    if(row.type==='session'&&typeof (row.sessionId??row.id)==='string')sessionId=row.sessionId??row.id;
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
    ...(sessionId?{session_id:sessionId}:{}),...(steps?{model_requests:steps}:{}),...(Object.keys(usage).length?{usage}:{}),...(sawEvents?{tool_calls:calls}:{}),
    exit_code:exitCode??null,signal:signal??null,cleanup_failed:cleanupFailed,stop_batch:cleanupFailed||cancelled||fatal,
    ...(failure?{error:failure}:{}),...(cancelled?{cancelled:true}:{})};
}

