import {mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises';
import path from 'node:path';
export function makeHostBridge({fs,workingDirectory,scratch,resolveAttachment,localExecution=false}={}){
 if(!fs||['resolve','readBytes'].some(name=>typeof fs[name]!=='function')||typeof workingDirectory?.ensure!=='function'||typeof scratch!=='string'||!scratch)throw Error('INVALID_HOST_SERVICES');
 const contexts=new WeakSet();
 async function caller(exec){
  if(!exec?.agent?.session?.id||!(exec.signal instanceof AbortSignal))throw Error('INVALID_CALLER');
  if(exec.signal.aborted)throw Error('CANCELLED');
  const cwd=await workingDirectory.ensure(exec.agent,exec.signal);
  if(exec.signal.aborted)throw Error('CANCELLED');
  const context=Object.freeze({owner:String(exec.agent.session.id),cwd,signal:exec.signal,agent:exec.agent});contexts.add(context);return context;
 }
 async function authorize(source,context){
  if(!contexts.has(context))throw Error('INVALID_CALLER_CONTEXT');
  if(!localExecution)throw Error('UNSUPPORTED_EXECUTION_WORLD');
  if(context.signal.aborted)throw Error('CANCELLED');
  if(source.kind==='attachment'){
   if(typeof resolveAttachment!=='function')throw Error('ATTACHMENT_AUTHORIZATION_UNAVAILABLE');
   return resolveAttachment(source.value,context);
  }
  const target=await fs.resolve(source.value,{cwd:context.cwd,signal:context.signal});
  const bytes=await fs.readBytes(target,context.signal,256*1024*1024);
  if(context.signal.aborted)throw Error('CANCELLED');
  const directory=await mkdtemp(path.join(scratch,'file-')),file=path.join(directory,'source.media');
  try{await writeFile(file,bytes,{mode:0o600});if(context.signal.aborted)throw Error('CANCELLED');}
  catch(error){await unlink(file).catch(()=>{});await rmdir(directory);throw error;}
  return {file,root:directory,scratch,async dispose(){await unlink(file);await rmdir(directory);}};
 }
 return {caller,authorize};
}
