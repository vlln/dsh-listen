import test from 'node:test';import assert from 'node:assert/strict';
test('real Cordis mounts declared services and disposes registered tools',{skip:!process.env.DSH_RUNTIME_ROOT},async()=>{
 const {Context}=await import('@deepseek-ai/cordis'),entry=await import('../../src/index.mjs');const ctx=new Context(),tools=new Map();
 ctx.provide('fs',{resolve:async p=>({p}),contains:()=>true,processPath:t=>t.p});ctx.provide('workingDirectory',{ensure:async()=>'/workspace'});ctx.provide('attachments',{saveImage:async()=>({})});ctx.provide('tools',{register:t=>{tools.set(t.name,t);return ()=>tools.delete(t.name);}});
 const fiber=await ctx.plugin(entry,{scratch:'.work/cordis-test',mode:'aggregate'});assert.equal(tools.size,1);const tool=tools.get('listen');await assert.rejects(tool.execute({source_path:'x'},{agent:{session:{id:'s'}},signal:new AbortController().signal}),/UNSUPPORTED_EXECUTION_WORLD/);await fiber.dispose();assert.equal(tools.size,0);
});
