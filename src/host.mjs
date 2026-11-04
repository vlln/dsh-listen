export function makeHostBridge({fs,workingDirectory,scratch,resolveAttachment}={}){
 if(!fs||['resolve','contains','processPath'].some(name=>typeof fs[name]!=='function')||typeof workingDirectory?.ensure!=='function'||typeof scratch!=='string'||!scratch)throw Error('INVALID_HOST_SERVICES');
 const contexts=new WeakSet();
 async function caller(exec){
  if(!exec?.agent?.session?.id||!(exec.signal instanceof AbortSignal))throw Error('INVALID_CALLER');
  if(exec.signal.aborted)throw Error('CANCELLED');
  const cwd=await workingDirectory.ensure(exec.agent,exec.signal);
  if(exec.signal.aborted)throw Error('CANCELLED');
  const context={owner:String(exec.agent.session.id),cwd,signal:exec.signal,agent:exec.agent};contexts.add(context);return context;
 }
 async function authorize(source,context){
  if(!contexts.has(context))throw Error('INVALID_CALLER_CONTEXT');
  if(context.signal.aborted)throw Error('CANCELLED');
  if(source.kind==='attachment'){
   if(typeof resolveAttachment!=='function')throw Error('ATTACHMENT_AUTHORIZATION_UNAVAILABLE');
   return resolveAttachment(source.value,context);
  }
  const root=await fs.resolve(context.cwd,{signal:context.signal}),file=await fs.resolve(source.value,{cwd:context.cwd,signal:context.signal});
  if(!fs.contains(root,file))throw Error('ACCESS_DENIED');
  if(context.signal.aborted)throw Error('CANCELLED');
  return {file:fs.processPath(file),root:fs.processPath(root),scratch};
 }
 return {caller,authorize};
}
