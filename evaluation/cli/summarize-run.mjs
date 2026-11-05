// Offline, external post-run scoring only; never imported by the Agent/plugin.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {scorePredictions} from '../lib/protocol.mjs';

const statuses=['complete','timeout','failed','not_run'];
function fail(message){throw Error(message);}
function sampleIds(manifest){
 const rows=Array.isArray(manifest)?manifest:manifest?.samples??manifest?.sample_ids;
 if(!Array.isArray(rows))fail('INVALID_MANIFEST: expected ordered sample_ids or samples');
 const ids=rows.map(row=>typeof row==='string'?row:row?.id);
 if(ids.some(id=>typeof id!=='string'||!id.length))fail('INVALID_MANIFEST_ID');
 if(new Set(ids).size!==ids.length)fail('DUPLICATE_MANIFEST_ID');
 return ids;
}
function measurement(rows,get,{integer=false,distribution=false}={}){
 const values=[];
 for(const row of rows){const value=get(row);if(value===undefined||value===null)continue;
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||(integer&&!Number.isSafeInteger(value)))fail('INVALID_MEASUREMENT');
  values.push(value);
 }
 const measured_samples=values.length,missing_samples=rows.length-measured_samples;
 const summary={measured_samples,missing_samples,total:measured_samples?values.reduce((a,b)=>a+b,0):null};
 if(distribution){
  values.sort((a,b)=>a-b);const n=values.length;
  Object.assign(summary,{count:n,min:n?values[0]:null,max:n?values[n-1]:null,mean:n?summary.total/n:null,median:n?(values[Math.floor((n-1)/2)]+values[Math.floor(n/2)])/2:null,p95:n?values[Math.ceil(n*.95)-1]:null});
 }
 return summary;
}
function grouped(keys,predictions,field){
 const groups=new Map();
 for(let i=0;i<keys.length;i++){
  const label=keys[i][field];if(label===undefined||label===null)continue;
  if(!groups.has(label))groups.set(label,{keys:[],predictions:[]});
  const group=groups.get(label);group.keys.push(keys[i]);group.predictions.push(predictions[i]);
 }
 return Object.fromEntries([...groups].map(([name,group])=>{const score=scorePredictions(group.keys,group.predictions);return [name,{correct:score.correct,total:score.total,accuracy:score.accuracy}];}));
}

/** Pure: all manifest IDs remain in the denominator; no I/O or model calls. */
export function summarizeRun(manifest,results,keys){
 const ids=sampleIds(manifest),expected=new Set(ids);
 if(!Array.isArray(keys)||!Array.isArray(results))fail('INVALID_KEYS_OR_RESULTS');
 const keyMap=new Map(),resultMap=new Map();
 for(const key of keys){
  if(!key||typeof key.id!=='string')fail('INVALID_KEY_ID');
  if(keyMap.has(key.id))fail('DUPLICATE_KEY_ID');keyMap.set(key.id,key);
 }
 const selected=ids.map(id=>{
  const key=keyMap.get(id);if(!key)fail(`MISSING_KEY: ${id}`);
  if(!['sound','speech','music'].includes(key.task)||!['easy','medium','hard'].includes(key.difficulty)||!Array.isArray(key.choices)||key.choices.length<2||!key.choices.every(c=>typeof c==='string')||typeof key.answer!=='string'||!key.choices.includes(key.answer)||(key['sub-category']!=null&&typeof key['sub-category']!=='string'))fail(`INVALID_KEY_METADATA: ${id}`);
  return key;
 });
 for(const row of results){
  if(!row||!expected.has(row.id))fail('UNKNOWN_RESULT_ID');
  if(resultMap.has(row.id))fail('DUPLICATE_RESULT_ID');
  if(!statuses.includes(row.status)||typeof row.model_output!=='string')fail(`INVALID_RESULT: ${row.id}`);
  if(row.usage!=null&&(typeof row.usage!=='object'||Array.isArray(row.usage)))fail('INVALID_USAGE');
  if(row.tool_calls!=null&&(!Array.isArray(row.tool_calls)||row.tool_calls.some(call=>!call||typeof call.name!=='string'||!call.name||typeof call.status!=='string'||!call.status)))fail('INVALID_TOOL_CALLS');
  resultMap.set(row.id,row);
 }
 const rows=ids.map(id=>resultMap.get(id));
 const predictions=ids.map((id,i)=>({id,status:rows[i]?.status??'not_run',model_output:rows[i]?.status==='complete'?rows[i].model_output:''}));
 const scored=scorePredictions(selected,predictions);
 const status_counts=Object.fromEntries(statuses.map(status=>[status,predictions.filter(row=>row.status===status).length]));
 const toolCalls=rows.flatMap(row=>row?.tool_calls??[]),toolCounts=new Map();
 for(const call of toolCalls){if(!toolCounts.has(call.name))toolCounts.set(call.name,new Map());const group=toolCounts.get(call.name);group.set(call.status,(group.get(call.status)??0)+1);}
 const summary={
  schema_version:'run-summary-v1',scoring:{official:false,method:'local scorePredictions string matching',accuracy_unit:'fraction [0,1]',denominator:'all ordered manifest sample IDs; failed, timeout, and missing predictions score zero',official_scorer_executed:false},
  total:scored.total,correct:scored.correct,accuracy:scored.accuracy,
  domains:grouped(selected,predictions,'task'),difficulties:grouped(selected,predictions,'difficulty'),subcategories:grouped(selected,predictions,'sub-category'),
  completion:{completed:scored.completed,total:scored.total,coverage:scored.completion_rate,status_counts,missing_results:rows.filter(row=>row===undefined).length,recorded_not_run:rows.filter(row=>row?.status==='not_run').length,failures:status_counts.failed,timeouts:status_counts.timeout,empty_complete:predictions.filter(row=>row.status==='complete'&&!row.model_output.trim()).length},
  duration_ms:measurement(rows,row=>row?.duration_ms,{distribution:true}),
  model_requests:measurement(rows,row=>row?.model_requests,{integer:true}),
  tools:{...measurement(rows,row=>row?.tool_calls?.length,{integer:true}),by_name_and_status:Object.fromEntries([...toolCounts].map(([name,group])=>[name,Object.fromEntries(group)]))},
  tokens:Object.fromEntries(['input_tokens','output_tokens','cache_read_tokens'].map(field=>[field,measurement(rows,row=>row?.usage?.[field],{integer:true})])),
  measurement_notes:{missing:'Unknown measurements are null totals when entirely absent, never inferred as zero; measured counts include explicit zero.',duration_percentiles:'median averages middle pair; p95 uses nearest rank; only explicit duration_ms included',tokens:'Provider-reported input, output, and cache-read counters are separate; cache-read is not added to input; no combined total or billing inference.'},
  cases:ids.map((id,i)=>({id,domain:selected[i].task,status:predictions[i].status,result_present:rows[i]!==undefined,correct:scorePredictions([selected[i]],[predictions[i]]).correct===1}))
 };
 return {summary,officialRows:scored.officialRows};
}

function safeId(id){if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)||id==='.'||id==='..')fail('UNSAFE_SAMPLE_ID');}
async function readJson(filename){return JSON.parse(await fs.readFile(filename,'utf8'));}
function summaryMarkdown(summary){
 const lines=['# Offline run summary','','**Unofficial local string matching; official scorer not executed.**','',`Overall: ${summary.correct}/${summary.total}; accuracy ${summary.accuracy??'N/A'} (fraction).`,`Completion: ${summary.completion.completed}/${summary.total}; coverage ${summary.completion.coverage??'N/A'}.`,`Missing results: ${summary.completion.missing_results}; failures: ${summary.completion.failures}; timeouts: ${summary.completion.timeouts}; recorded not_run: ${summary.completion.recorded_not_run}.`,''];
 for(const dimension of ['domains','difficulties','subcategories']){lines.push(`## ${dimension}`,'','| Group | Correct | Total | Accuracy |','|---|---:|---:|---:|');for(const [name,value] of Object.entries(summary[dimension]))lines.push(`| ${JSON.stringify(name).replaceAll('|','\\|')} | ${value.correct} | ${value.total} | ${value.accuracy??'N/A'} |`);lines.push('');}
 lines.push('## Measured operations','','Missing measurements are unknown, not zero. Token counters remain separate; no billing estimate.','','```json',JSON.stringify({duration_ms:summary.duration_ms,model_requests:summary.model_requests,tools:summary.tools,tokens:summary.tokens},null,2),'```','');return lines.join('\n');
}
async function main(args){
 if(args.length!==2)fail('Usage: node evaluation/cli/summarize-run.mjs RUN_DIRECTORY EXTERNAL_KEYS_PATH');
 const runDirectory=await fs.realpath(path.resolve(args[0])),keysPath=await fs.realpath(path.resolve(args[1]));
 const relative=path.relative(runDirectory,keysPath);
 if(relative===''||(!relative.startsWith(`..${path.sep}`)&&relative!=='..'&&!path.isAbsolute(relative)))fail('KEYS_MUST_BE_EXTERNAL_TO_RUN');
 const run=await readJson(path.join(runDirectory,'run.json'));
 if(!run||typeof run!=='object'||Array.isArray(run))fail('INVALID_RUN');
 const manifest=await readJson(path.join(runDirectory,'manifest.json')),ids=sampleIds(manifest);
 ids.forEach(safeId);const expected=new Set(ids),results=[];
 const resultDirectory=path.join(runDirectory,'results');
 let entries=[];try{entries=await fs.readdir(resultDirectory,{withFileTypes:true});}catch(error){if(error.code!=='ENOENT')throw error;}
 for(const entry of entries){if(!expected.has(entry.name))fail(`UNKNOWN_RESULT_ENTRY: ${entry.name}`);if(!entry.isDirectory())fail('INVALID_RESULT_DIRECTORY');}
 for(const id of ids){
  try{const row=await readJson(path.join(resultDirectory,id,'result.json'));if(row?.id!==id)fail(`RESULT_ID_MISMATCH: ${id}`);results.push(row);}
  catch(error){if(error.code!=='ENOENT')throw error;}
 }
 const {summary,officialRows}=summarizeRun(manifest,results,await readJson(keysPath));
 summary.provenance={run,manifest};
 // Refuse any existing scoring directory, including symlinks; raw artifacts are read-only.
 const output=path.join(runDirectory,'scoring');await fs.mkdir(output,{mode:0o700});
 await fs.writeFile(path.join(output,'official-input.json'),JSON.stringify(officialRows,null,2)+'\n',{flag:'wx',mode:0o600});
 await fs.writeFile(path.join(output,'summary.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx',mode:0o600});
 const byId=new Map(results.map(row=>[row.id,row]));
 const predictions=ids.map(id=>{const row=byId.get(id);return {id,status:row?.status??'not_run',model_output:row?.status==='complete'?row.model_output:''};});
 await fs.writeFile(path.join(output,'predictions.json'),JSON.stringify(predictions,null,2)+'\n',{flag:'wx',mode:0o600});
 await fs.writeFile(path.join(output,'summary.md'),summaryMarkdown(summary),{flag:'wx',mode:0o600});
 console.log(JSON.stringify({total:summary.total,correct:summary.correct,accuracy:summary.accuracy,official:false}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});
