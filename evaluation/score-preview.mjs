// Post-run external scorer only. Never imported by the headless Agent/plugin.
import fs from 'node:fs/promises';import {scorePredictions} from './protocol.mjs';import {predictionFromEvents} from './headless-adapter.mjs';
const runs=JSON.parse(await fs.readFile('.work/preview-runs.json')),manifest=JSON.parse(await fs.readFile('.work/headless-preview/manifest.json')),keys=JSON.parse(await fs.readFile('.work/mmau-prepared/keys.json')).filter(k=>manifest.some(s=>s.id===k.id));
const summary={};
for(const mode of ['baseline','aggregate','split']){
 const predictions=[],traces=[];
 for(const run of runs.filter(r=>r.mode===mode)){
  const events=(await fs.readFile(run.events,'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
  predictions.push(predictionFromEvents(manifest[run.index].id,events,{exitCode:run.code??null}));
  const calls=events.filter(e=>e.type==='tool_call'),results=events.filter(e=>e.type==='tool_result');traces.push({index:run.index,tools:calls.map(c=>c.tool),tool_result_statuses:results.map(r=>r.status),tool_calls:calls.length});
 }
 const scored=scorePredictions(keys,predictions);
 // Outside Agent workspaces: contains answers, and must never be supplied to the Agent.
 await fs.writeFile(`.work/preview-${mode}-official.json`,JSON.stringify(scored.officialRows,null,2),{mode:0o600});
 summary[mode]={total:scored.total,correct:scored.correct,accuracy:scored.accuracy,completion_rate:scored.completion_rate,domains:scored.domains,traces};
}
summary.budget=JSON.parse(await fs.readFile('.work/headless-preview/request-budget.json'));await fs.writeFile('.work/preview-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
