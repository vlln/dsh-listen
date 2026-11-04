import {spawn} from 'node:child_process';
export async function runProcess(command,args,{signal,timeoutMs=20000,maxBytes=1024*1024,cwd}={}){
 if(typeof command!=='string'||!command||command.includes('\0')||!Array.isArray(args)||args.some(a=>typeof a!=='string'||a.includes('\0')))throw Error('INVALID_PROCESS_ARGUMENTS');
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>180000||!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>256*1024*1024)throw Error('INVALID_PROCESS_LIMITS');
 if(signal!==undefined&&!(signal instanceof AbortSignal))throw Error('INVALID_ABORT_SIGNAL');
 if(signal?.aborted)throw Error('CANCELLED');
 if(process.platform==='win32')throw Error('UNSUPPORTED_PROCESS_PLATFORM');
 return new Promise((resolve,reject)=>{
  const chunks=[];let length=0,reason=null,forceTimer,spawnFailure=false;
  const child=spawn(command,args,{cwd,shell:false,stdio:['ignore','pipe','pipe'],detached:true,windowsHide:true});
  const send=kind=>{if(!child.pid)return;try{process.kill(-child.pid,kind);}catch(error){if(error.code!=='ESRCH')reason??='PROCESS_TERMINATION_FAILED';}};
  const stop=code=>{if(reason)return;reason=code;send('SIGTERM');forceTimer=setTimeout(()=>send('SIGKILL'),100);};
  const abort=()=>stop('CANCELLED');
  signal?.addEventListener('abort',abort,{once:true});
  const timeout=setTimeout(()=>stop('TIMEOUT'),timeoutMs);
  child.stdout.on('data',chunk=>{if(reason)return;length+=chunk.length;if(length>maxBytes){stop('PROCESS_OUTPUT_LIMIT');return;}chunks.push(chunk);});
  // Drain, never retain or expose arbitrary stderr, arguments or environment.
  child.stderr.on('data',()=>{});
  child.on('error',()=>{spawnFailure=true;reason??='PROCESS_SPAWN_FAILED';});
  child.on('close',code=>{
   clearTimeout(timeout);clearTimeout(forceTimer);signal?.removeEventListener('abort',abort);
   // Direct-child close does not imply descendants are gone; force remaining group.
   if(child.pid)send('SIGKILL');
   if(reason)reject(Error(reason));else if(spawnFailure)reject(Error('PROCESS_SPAWN_FAILED'));else if(code!==0)reject(Error(`PROCESS_EXIT_${code}`));else resolve(Buffer.concat(chunks));
  });
  if(signal?.aborted)abort();
 });
}
