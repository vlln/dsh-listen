import {createHash} from 'node:crypto';
export function prepareEvaluation(samples,{seed='dsh-listen-v1',developmentPerDomain=10}={}){
 if(!Array.isArray(samples)||!Number.isInteger(developmentPerDomain)||developmentPerDomain<0)throw Error('INVALID_DATASET');
 const ids=new Set(),groups=new Map(),agent=[],keys=[];
 for(const row of samples){
  if(!row||typeof row.id!=='string'||ids.has(row.id)||!['sound','speech','music'].includes(row.task)||typeof row.question!=='string'||!Array.isArray(row.choices)||row.choices.length<2||!row.choices.every(c=>typeof c==='string')||!row.choices.includes(row.answer)||typeof row.audio_id!=='string')throw Error('INVALID_DATASET');
  ids.add(row.id);agent.push({id:row.id,audio_id:row.audio_id,question:row.question,choices:[...row.choices]});keys.push({id:row.id,task:row.task,choices:[...row.choices],answer:row.answer});
  const group=groups.get(row.task)??[];group.push(row.id);groups.set(row.task,group);
 }
 const development_ids=[];
 for(const ids of groups.values()){ids.sort((a,b)=>createHash('sha256').update(`${seed}:${a}`).digest('hex').localeCompare(createHash('sha256').update(`${seed}:${b}`).digest('hex')));development_ids.push(...ids.slice(0,developmentPerDomain));}
 // Same source audio must never leak between development and sealed test questions.
 const selected=new Set(development_ids),devAudio=new Set(samples.filter(s=>selected.has(s.id)).map(s=>s.audio_id));
 const dev=new Set(samples.filter(s=>devAudio.has(s.audio_id)).map(s=>s.id));
 development_ids.splice(0,development_ids.length,...dev);
 const test_ids=[...ids].filter(id=>!dev.has(id));
 return {version:'evaluation-v1',seed,agent,keys,development_ids,test_ids};
}
function tokenSet(text){return new Set(text.toLowerCase().match(/[\p{L}\p{N}_]+/gu)??[]);}
function officialTokenMatch(answer,prediction,choices){const a=tokenSet(answer),p=tokenSet(prediction);if(!p.size||[...a].some(t=>!p.has(t)))return false;for(const c of choices){const ts=tokenSet(c);if(ts.size===a.size&&[...ts].every(t=>a.has(t)))continue;if([...ts].some(t=>!a.has(t)&&p.has(t)))return false;}return true;}
export function scorePredictions(keys,predictions){
 const expected=new Set(keys.map(k=>k.id)),byId=new Map();if(expected.size!==keys.length)throw Error('DUPLICATE_KEY_ID');
 for(const p of predictions){if(!expected.has(p.id)||byId.has(p.id))throw Error('DUPLICATE_OR_UNKNOWN_PREDICTION');byId.set(p.id,p);}
 let correct=0,completed=0;const domains={},officialRows=[];
 for(const key of keys){const prediction=byId.get(key.id);const index=prediction?.choice_index;const valid=prediction?.status==='complete'&&Number.isInteger(index)&&index>=0&&index<key.choices.length;const text=valid?key.choices[index]:'';const match=valid&&officialTokenMatch(key.answer,text,key.choices);correct+=Number(match);completed+=Number(valid);const d=domains[key.task]??={correct:0,total:0};d.total++;d.correct+=Number(match);officialRows.push({...key,model_output:text});}
 return {total:keys.length,correct,completed,accuracy:keys.length?correct/keys.length:null,completion_rate:keys.length?completed/keys.length:null,domains,officialRows};
}
