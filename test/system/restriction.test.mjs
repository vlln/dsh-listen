import test from 'node:test';import assert from 'node:assert/strict';import {mkdir,mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import path from 'node:path';import {apply} from '../../evaluation/restrict-headless.mjs';
test('restriction forwards explicit240 or default40 and blocks dispatch at ceiling',async t=>{
 const root=path.resolve('.work/restriction-tests');await mkdir(root,{recursive:true});const dir=await mkdtemp(path.join(root,'case-'));t.after(async()=>{assert.equal(path.dirname(dir),root);assert.ok(path.basename(dir).startsWith('case-'));await rm(dir,{recursive:true,force:true});});
 for(const limit of [40,240]){
  const budgetFile=path.join(dir,`budget-${limit}.json`);await writeFile(budgetFile,JSON.stringify({requests:limit-1}));let stream,dispatches=0;
  apply({on:(event,fn)=>{if(event==='llm/stream')stream=fn;}},{budgetFile,...(limit===240?{maxModelRequests:limit}:{})});
  const next=async function*(){dispatches++;yield 'synthetic';};const collect=async()=>{const rows=[];for await(const row of stream({},next))rows.push(row);return rows;};
  assert.deepEqual(await collect(),['synthetic']);await assert.rejects(collect(),/REQUEST_LIMIT/);assert.equal(dispatches,1);assert.equal(JSON.parse(await readFile(budgetFile,'utf8')).requests,limit);
 }
});
test('restriction rejects unsupported request ceilings before registering hooks',()=>{for(const maxModelRequests of [0,241,'240',1.5])assert.throws(()=>apply({on:()=>assert.fail('unexpected hook')},{maxModelRequests}),/INVALID_PREVIEW_BUDGET/);});
test('headless evaluation guard blocks non-audio bypasses for all surfaces',async()=>{for(const mode of ['baseline','aggregate','split']){let created,guard;apply({on:(name,callback)=>{assert.equal(name,'agent/created');created=callback;}},{mode});created({agent:{ctx:{on:(name,callback)=>{assert.equal(name,'tools/pre-execute');guard=callback;}}}});assert.equal((await guard({name:'bash'},async()=>({kind:'allow'}))).kind,'deny');const tool=mode==='split'?'audio_signal':'listen';assert.equal((await guard({name:tool},async()=>({kind:'allow'}))).kind,mode==='baseline'?'deny':'allow');}});
