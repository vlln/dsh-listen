import test from 'node:test';import assert from 'node:assert/strict';import {mkdir,mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import path from 'node:path';import {apply,inject} from '../../evaluation/request-budget.mjs';
test('request budget forwards explicit240 or default40 and blocks dispatch at ceiling',async t=>{
 const root=path.resolve('.work/restriction-tests');await mkdir(root,{recursive:true});const dir=await mkdtemp(path.join(root,'case-'));t.after(async()=>{assert.equal(path.dirname(dir),root);assert.ok(path.basename(dir).startsWith('case-'));await rm(dir,{recursive:true,force:true});});
 for(const limit of [40,240,321]){
  const budgetFile=path.join(dir,`budget-${limit}.json`);await writeFile(budgetFile,JSON.stringify({requests:limit-1}));let stream,dispatches=0;
  apply({on:(event,fn)=>{assert.equal(event,'llm/stream');stream=fn;}},{budgetFile,...(limit!==40?{maxModelRequests:limit}:{})});
  const next=async function*(){dispatches++;yield 'synthetic';};const collect=async()=>{const rows=[];for await(const row of stream({},next))rows.push(row);return rows;};
  assert.deepEqual(await collect(),['synthetic']);await assert.rejects(collect(),/REQUEST_LIMIT/);assert.equal(dispatches,1);assert.equal(JSON.parse(await readFile(budgetFile,'utf8')).requests,limit);
 }
});
test('request budget rejects unsupported ceilings before registering hooks',()=>{for(const maxModelRequests of [0,Number.MAX_SAFE_INTEGER+1,'240',1.5])assert.throws(()=>apply({on:()=>assert.fail('unexpected hook')},{maxModelRequests}),/INVALID_PREVIEW_BUDGET/);});
test('request budget has no tools dependency or agent/tool interception, including legacy shim',async()=>{
 assert.deepEqual(inject,['llm']);apply({on:()=>assert.fail('unexpected hook')},{});
 const legacy=await import('../../evaluation/restrict-headless.mjs');assert.equal(legacy.apply,apply);assert.deepEqual(legacy.inject,['llm']);
});
