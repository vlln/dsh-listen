import test from 'node:test';import assert from 'node:assert/strict';
const configured=!!process.env.DSH_RUNTIME_ROOT;
test('actual SDK defines plugin schema and applies entry without installing SDK closure',{skip:!configured},async()=>{
 const entry=await import('../../src/index.mjs');assert.equal(entry.name,'dsh-listen');assert.deepEqual(entry.inject,['tools','fs','workingDirectory','attachments']);assert.equal(typeof entry.Config,'function');const tools=new Map(),cleanups=[];
 const ctx={fs:{resolve:async p=>({p}),contains:()=>true,processPath:t=>t.p},workingDirectory:{ensure:async()=>'/workspace'},attachments:{saveImage:async()=>({})},tools:{register:t=>{tools.set(t.name,t);return ()=>tools.delete(t.name);}},effect:fn=>{cleanups.push(fn());}};
 await entry.apply(ctx,{scratch:'.work/entry-test',mode:'split'});assert.equal(tools.size,3);for(const dispose of cleanups)dispose();assert.equal(tools.size,0);
});
