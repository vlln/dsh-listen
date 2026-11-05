import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';
if(!process.env.DSH_RUNTIME_ROOT)throw Error('SYSTEM_TEST_REQUIRES_INSTALLED_RUNTIME');
test('real Cordis disable aborts and awaits an in-flight audio tool before returning',{timeout:10000},async()=>{
 const {Context}=await import('@deepseek-ai/cordis'),entry=await import('../../src/index.mjs');
 const ctx=new Context(),tools=new Map();let notifyStarted,stopped=false,images=0;
 const started=new Promise(resolve=>{notifyStarted=resolve;});
 ctx.provide('fs',{resolve:async()=>{throw Error('SHOULD_NOT_REACH_DECODE');},readBytes:async()=>{throw Error('SHOULD_NOT_READ');}});
 ctx.provide('workingDirectory',{ensure:async(agent,signal)=>{notifyStarted();await new Promise(resolve=>{if(signal.aborted)resolve();else signal.addEventListener('abort',resolve,{once:true});});await new Promise(resolve=>setImmediate(resolve));stopped=true;throw Error('CANCELLED');}});
 ctx.provide('attachments',{saveImage:async()=>{images++;throw Error('SHOULD_NOT_SAVE');}});
 ctx.provide('tools',{register:tool=>{tools.set(tool.name,tool);return ()=>tools.delete(tool.name);}});
 const fiber=await ctx.plugin(entry,{scratch:path.resolve(`.work/disable-system-${process.pid}`),localExecution:true});
 const tool=tools.get('listen');const task=tool.execute({source_path:'never-read.wav',features:['signal_image']},{agent:{session:{id:'disable-fixture'}},signal:new AbortController().signal});
 const rejected=assert.rejects(task,/CANCELLED/);await started;await fiber.dispose();await rejected;
 assert.equal(stopped,true);assert.equal(tools.size,0);assert.equal(images,0);
 await assert.rejects(tool.execute({source_path:'never-read.wav'},{agent:{session:{id:'disabled'}},signal:new AbortController().signal}),/PLUGIN_DISABLED/);
});
