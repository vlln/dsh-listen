export function createTaskLifecycle(){
 const controller=new AbortController(),pending=new Set();let closed=false;
 return {
  async run(callerSignal,operation){
   if(closed)throw Error('PLUGIN_DISABLED');
   if(!(callerSignal instanceof AbortSignal)||typeof operation!=='function')throw Error('INVALID_TASK_CONTEXT');
   const signal=AbortSignal.any([controller.signal,callerSignal]);if(signal.aborted)throw Error('CANCELLED');
   const task=Promise.resolve().then(()=>operation(signal));pending.add(task);
   try{return await task;}finally{pending.delete(task);}
  },
  async close(){closed=true;controller.abort();await Promise.allSettled([...pending]);},
  get active(){return pending.size;}
 };
}
