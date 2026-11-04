import {open,readFile,unlink,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

const LOCK_TIMEOUT_MS=5000;
async function acquireLock(file){
 const started=performance.now();
 for(;;){
  try{return await open(file,'wx',0o600);}catch(error){
   if(error.code!=='EEXIST')throw error;
   const remaining=LOCK_TIMEOUT_MS-(performance.now()-started);
   if(remaining<=0)throw Error(`BUDGET_LOCK_TIMEOUT: waited ${LOCK_TIMEOUT_MS}ms for ${file}; check for an active budget writer and remove the lock only after confirming its owner has stopped`);
   await delay(Math.min(25,remaining));
  }
 }
}
async function readState(file){
 let state;
 try{state=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;state={requests:0};}
 if(!state||!Number.isSafeInteger(state.requests)||state.requests<0)throw Error('INVALID_BUDGET_STATE');
 return state;
}
export async function reserveRequest(file,limit=40,counterFile){
 if(typeof file!=='string'||!file||!Number.isSafeInteger(limit)||limit<1||
    (counterFile!==undefined&&(typeof counterFile!=='string'||!counterFile||resolve(counterFile)===resolve(file))))throw Error('INVALID_PREVIEW_BUDGET');
 const lockFile=file+'.lock',lock=await acquireLock(lockFile),pending=new Set();
 async function stage(target,state){
  const temporary=target+'.'+randomUUID()+'.tmp';
  // Same-directory replacement keeps unlocked readers on a complete JSON snapshot.
  const handle=await open(temporary,'wx',0o600);pending.add(temporary);
  try{await handle.writeFile(JSON.stringify(state));}finally{await handle.close();}
  return temporary;
 }
 try{
  const state=await readState(file);
  if(state.requests>=limit)throw Error('HEADLESS_PREVIEW_REQUEST_LIMIT');
  const counter=counterFile===undefined?undefined:await readState(counterFile);
  if(counter&&counter.requests===Number.MAX_SAFE_INTEGER)throw Error('INVALID_BUDGET_STATE');
  state.requests++;
  if(counter)counter.requests++;
  const globalTemporary=await stage(file,state);
  const counterTemporary=counter?await stage(counterFile,counter):undefined;
  // Separate files cannot form a crash-atomic transaction. Charge globally first:
  // any subsequent failure remains fail-closed and never dispatches over budget.
  await rename(globalTemporary,file);pending.delete(globalTemporary);
  if(counterTemporary){await rename(counterTemporary,counterFile);pending.delete(counterTemporary);}
  return state.requests;
 }finally{
  try{for(const temporary of pending)await unlink(temporary);}
  finally{try{await lock.close();}finally{await unlink(lockFile);}}
 }
}
