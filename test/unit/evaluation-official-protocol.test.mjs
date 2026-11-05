import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {formatTask,predictionFromEvents,assertPreparedTask,taskProtocol} from '../../evaluation/lib/headless-adapter.mjs';
import {prepareEvaluation,scorePredictions} from '../../evaluation/lib/protocol.mjs';
const row={id:'synthetic',audio_id:'synthetic.wav',task:'sound',question:'Which sound is heard?',choices:['Water flowing.','Engine running.'],answer:'Water flowing.',difficulty:'easy','sub-category':'synthetic'};
test('adapter keeps question and choice text/order without an index or JSON grammar',()=>{
 const prompt=formatTask(row);assert.ok(prompt.startsWith(`${row.question}\n\nChoices:\n${row.choices.join('\n')}`));
 assert.doesNotMatch(prompt,/choice_index|zero-based|0:|1:|tool calls|network|question alone/);assert.equal(prompt,`${row.question}\n\nChoices:\n${row.choices.join('\n')}\n\nAudio path: audio.wav\nRespond with only the full text of the chosen answer.`);
 assert.ok(!prompt.includes('synthetic'));assert.ok(!prompt.includes('difficulty'));
});
test('legacy or changed prepared tasks fail closed before dispatch',()=>{
 const text=formatTask(row),sample={task_protocol:taskProtocol,task_sha256:createHash('sha256').update(text).digest('hex')};
 assert.doesNotThrow(()=>assertPreparedTask(sample,text));
 assert.throws(()=>assertPreparedTask({},text),/PROTOCOL_MISMATCH/);
 assert.throws(()=>assertPreparedTask({...sample,task_protocol:'old'},text),/PROTOCOL_MISMATCH/);
 assert.throws(()=>assertPreparedTask(sample,text+' changed'),/PROTOCOL_MISMATCH/);
});
test('batch final text is raw model_output, with missing/failed/blank finals empty',()=>{
 const text='  Water flowing.\n';assert.deepEqual(predictionFromEvents('s',[{type:'final',text:'old'},{type:'final',text}]),{id:'s',status:'complete',model_output:text});
 for(const [events,options] of [[[],{}],[[{type:'final',text:' '}],{}],[[{type:'final',text:'Water flowing.'}],{exitCode:1}],[[{type:'final',text:{choice_index:0}}],{}]])assert.deepEqual(predictionFromEvents('s',events,options),{id:'s',status:'failed',model_output:''});
});
test('official export retains scorer metadata only outside Agent and includes every planned row',()=>{
 const other={...row,id:'missing'};const {keys,agent}=prepareEvaluation([row,other],{developmentPerDomain:0});
 assert.deepEqual(Object.keys(agent[0]).sort(),['audio_id','choices','id','question']);
 const scored=scorePredictions(keys,[{id:row.id,status:'complete',model_output:'Water flowing.'}]);
 assert.equal(scored.total,2);assert.equal(scored.correct,1);assert.equal(scored.completed,1);
 assert.deepEqual(scored.officialRows[0],{...keys[0],model_output:'Water flowing.'});
 assert.equal(scored.officialRows[0].difficulty,'easy');assert.equal(scored.officialRows[0]['sub-category'],'synthetic');assert.equal(scored.officialRows[1].model_output,'');
 assert.equal(scorePredictions(keys,[{id:row.id,status:'complete',choice_index:0}]).correct,0);
 assert.equal(scorePredictions(keys,[{id:row.id,status:'failed',model_output:row.answer}]).correct,0);
 assert.throws(()=>scorePredictions(keys,[{id:'unknown'}]),/UNKNOWN/);
});
const cases=[
 ['Water flowing.',true],['WATER, flowing!',true],['The answer is water flowing.',true],
 ['Water flowing, engine running.',false],['Water',false],['0',false],['A',false],
 ['{"choice_index":0}',false],['',false],['Engine running.',false]
];
test('raw text scoring does not coerce labels/JSON or strip contradictory explanations',()=>{
 for(const [model_output,match] of cases)assert.equal(scorePredictions([row],[{id:row.id,status:'complete',model_output}]).correct,Number(match),model_output);
});
const scorer=fileURLToPath(new URL('../../.work/metadata/mmau-evaluation.py',import.meta.url));
test('synthetic cases agree with cached official Python string_match when available',t=>{
 if(!fs.existsSync(scorer)){t.skip('cached official scorer absent; no download');return;}
 const script=`import ast,json,re,sys\nsource=ast.parse(open(sys.argv[1]).read())\nfunction=next(n for n in source.body if isinstance(n,ast.FunctionDef) and n.name=='string_match')\nexec(compile(ast.Module(body=[function],type_ignores=[]),sys.argv[1],'exec'))\ncases=json.load(sys.stdin)\nprint(json.dumps([string_match(c['answer'],c['prediction'],c['choices']) for c in cases]))`;
 const result=spawnSync('python3',['-c',script,path.resolve(scorer)],{input:JSON.stringify(cases.map(([prediction])=>({answer:row.answer,prediction,choices:row.choices}))),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
 if(result.error?.code==='ENOENT'){t.skip('python3 unavailable');return;}
 assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),cases.map(([,match])=>match));
});
