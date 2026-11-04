import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {summarizeRun} from '../../evaluation/summarize-run.mjs';
const key=(id,extra={})=>({id,task:'sound',difficulty:'easy','sub-category':'synthetic',answer:'Water flowing.',choices:['Water flowing.','Engine running.'],...extra});
const result=(id,extra={})=>({id,status:'complete',model_output:'Water flowing.',...extra});
const manifest={samples:[{id:'a'},{id:'b'},{id:'c'},{id:'d'},{id:'e'}]};
const keys=[key('a'),key('b',{task:'speech',difficulty:'medium'}),key('c',{task:'music',difficulty:'hard'}),key('d'),key('e')];
test('all planned IDs stay in denominator and metadata is exported in manifest order',()=>{
 const input=[result('b',{status:'timeout'}),result('a'),result('c',{status:'failed'}),result('d',{status:'not_run'})];
 const before=JSON.stringify({manifest,input,keys});
 const {summary:s,officialRows}=summarizeRun(manifest,input,[...keys,key('unused')]);
 assert.equal(s.total,5);assert.equal(s.correct,1);assert.equal(s.accuracy,.2);assert.equal(s.completion.coverage,.2);
 assert.deepEqual(s.completion.status_counts,{complete:1,timeout:1,failed:1,not_run:2});
 assert.equal(s.completion.missing_results,1);assert.equal(s.completion.recorded_not_run,1);
 assert.deepEqual(s.domains.sound,{correct:1,total:3,accuracy:1/3});
 assert.deepEqual(s.difficulties.hard,{correct:0,total:1,accuracy:0});
 assert.deepEqual(s.subcategories.synthetic,{correct:1,total:5,accuracy:.2});
 assert.deepEqual(officialRows.map(row=>row.id),['a','b','c','d','e']);
 assert.deepEqual(officialRows.map(row=>row.model_output),['Water flowing.','','','','']);
 assert.equal(officialRows[1].difficulty,'medium');assert.equal(officialRows[1]['sub-category'],'synthetic');assert.equal(officialRows[1].answer,'Water flowing.');
 assert.equal(s.scoring.official,false);assert.equal(s.scoring.official_scorer_executed,false);
 assert.deepEqual(s.cases.map(row=>row.correct),[true,false,false,false,false]);
 assert.equal(JSON.stringify({manifest,input,keys}),before);
});
test('raw labels and JSON are never converted, timeout late text and blank complete ignored',()=>{
 for(const output of ['A','0','{"choice_index":0}','Water flowing. Engine running.',' ']){
  const {summary}=summarizeRun(['a'],[result('a',{model_output:output})],[key('a')]);assert.equal(summary.correct,0);
  if(output===' ')assert.equal(summary.completion.completed,0);
 }
 const {officialRows}=summarizeRun(['a'],[result('a',{status:'timeout'})],[key('a')]);assert.equal(officialRows[0].model_output,'');
 const raw='  WATER, flowing!\n';assert.equal(summarizeRun(['a'],[result('a',{model_output:raw})],[key('a')]).officialRows[0].model_output,raw);
});
test('duplicate/unknown IDs, incomplete metadata and malformed measurements fail closed',()=>{
 assert.throws(()=>summarizeRun(['a','a'],[],[key('a')]),/DUPLICATE_MANIFEST/);
 assert.throws(()=>summarizeRun(['a'],[],[key('a'),key('a')]),/DUPLICATE_KEY/);
 assert.throws(()=>summarizeRun(['a'],[],[]),/MISSING_KEY/);
 assert.throws(()=>summarizeRun(['a'],[result('z')],[key('a')]),/UNKNOWN_RESULT/);
 assert.throws(()=>summarizeRun(['a'],[result('a'),result('a')],[key('a')]),/DUPLICATE_RESULT/);
 assert.throws(()=>summarizeRun(['a'],[],[key('a',{difficulty:undefined})]),/INVALID_KEY_METADATA/);
 for(const extra of [{duration_ms:-1},{model_requests:-1},{model_requests:1.2},{usage:{input_tokens:-1}},{tool_calls:[{name:'listen'}]},{status:'late'},{model_output:undefined}])assert.throws(()=>summarizeRun(['a'],[result('a',extra)],[key('a')]),/INVALID_/);
});
test('measurements keep unknown distinct from explicit zero and never double count cache',()=>{
 const {summary:s}=summarizeRun(manifest,[result('a',{duration_ms:10,model_requests:0,tool_calls:[],usage:{input_tokens:100,cache_read_tokens:40}}),result('b',{status:'failed',duration_ms:30,model_requests:2,tool_calls:[{name:'listen',status:'complete'},{name:'listen',status:'failed'}],usage:{input_tokens:50,output_tokens:7}})],keys);
 assert.deepEqual(s.model_requests,{measured_samples:2,missing_samples:3,total:2});
 assert.equal(s.duration_ms.count,2);assert.equal(s.duration_ms.median,20);assert.equal(s.duration_ms.p95,30);
 assert.equal(s.tools.total,2);assert.equal(s.tools.measured_samples,2);assert.deepEqual(s.tools.by_name_and_status,{listen:{complete:1,failed:1}});
 assert.deepEqual(s.tokens.input_tokens,{measured_samples:2,missing_samples:3,total:150});
 assert.deepEqual(s.tokens.output_tokens,{measured_samples:1,missing_samples:4,total:7});
 assert.deepEqual(s.tokens.cache_read_tokens,{measured_samples:1,missing_samples:4,total:40});
 const absent=summarizeRun(['a'],[result('a',{duration_ms:null,model_requests:null,usage:null,tool_calls:null})],[key('a')]).summary;
 assert.equal(absent.tools.total,null);assert.equal(absent.tools.missing_samples,1);
 assert.equal(summarizeRun(['a'],[result('a',{usage:{input_tokens:null}})],[key('a')]).summary.tokens.input_tokens.total,null);
 assert.equal(absent.duration_ms.total,null);assert.equal(absent.duration_ms.median,null);assert.equal(absent.model_requests.total,null);assert.equal(absent.tokens.input_tokens.total,null);
});
const cli=fileURLToPath(new URL('../../evaluation/summarize-run.mjs',import.meta.url));
test('CLI uses only synthetic explicit external keys and refuses overwrite and unsafe paths',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dsh-summary-'));
 try{
  const run=path.join(root,'run'),external=path.join(root,'keys.json');await fs.mkdir(path.join(run,'results','a'),{recursive:true});
  const json=(file,value)=>fs.writeFile(file,JSON.stringify(value));
  await json(path.join(run,'run.json'),{run_id:'synthetic',model:'not-called'});
  await json(path.join(run,'manifest.json'),{samples:[{id:'b'},{id:'a'}]});await json(external,[key('a'),key('b')]);
  const raw=JSON.stringify(result('a',{duration_ms:0}));await fs.writeFile(path.join(run,'results','a','result.json'),raw);
  const execute=(directory=run,keysPath=external)=>spawnSync(process.execPath,[cli,directory,keysPath],{encoding:'utf8'});
  let child=execute();assert.equal(child.status,0,child.stderr);
  const s=JSON.parse(await fs.readFile(path.join(run,'scoring','summary.json'),'utf8'));
  assert.equal(s.total,2);assert.equal(s.correct,1);assert.equal(s.completion.missing_results,1);assert.equal(s.provenance.run.run_id,'synthetic');
  const official=JSON.parse(await fs.readFile(path.join(run,'scoring','official-input.json'),'utf8'));
  assert.deepEqual(official.map(row=>row.id),['b','a']);assert.equal(official[0].model_output,'');
  const predictions=JSON.parse(await fs.readFile(path.join(run,'scoring','predictions.json'),'utf8'));assert.deepEqual(predictions.map(row=>row.status),['not_run','complete']);
  assert.match(await fs.readFile(path.join(run,'scoring','summary.md'),'utf8'),/Unofficial local string matching/);
  const saved=await fs.readFile(path.join(run,'scoring','summary.json'),'utf8');
  child=execute();assert.notEqual(child.status,0);assert.match(child.stderr,/EEXIST/);
  assert.equal(await fs.readFile(path.join(run,'scoring','summary.json'),'utf8'),saved);assert.equal(await fs.readFile(path.join(run,'results','a','result.json'),'utf8'),raw);
  child=execute(run,path.join(run,'run.json'));assert.notEqual(child.status,0);assert.match(child.stderr,/KEYS_MUST_BE_EXTERNAL/);
  await json(path.join(run,'manifest.json'),{samples:[{id:'../outside'}]});child=execute();assert.notEqual(child.status,0);assert.match(child.stderr,/UNSAFE_SAMPLE_ID/);
  await json(path.join(run,'manifest.json'),{samples:[{id:'b'}]});child=execute();assert.notEqual(child.status,0);assert.match(child.stderr,/UNKNOWN_RESULT_ENTRY/);
 }finally{
  // Only this test-created, verified temporary fixture is removed.
  assert.equal(path.dirname(root),os.tmpdir());assert.ok(path.basename(root).startsWith('dsh-summary-'));await fs.rm(root,{recursive:true,force:true});
 }
});
