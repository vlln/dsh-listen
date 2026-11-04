import {createHash} from 'node:crypto';
export function eventEvidence({labels,scores,windows,coverage,modelVersion,topK=3,maxWindows=60}={}){
 if(!Array.isArray(labels)||!labels.length||labels.length>2000||labels.some(l=>typeof l!=='string'||!l||l.length>200)||new Set(labels).size!==labels.length)throw Error('INVALID_EVENT_LABELS');
 if(typeof modelVersion!=='string'||!modelVersion||!Number.isFinite(coverage?.from)||!Number.isFinite(coverage?.to)||coverage.from<0||coverage.to<=coverage.from||!Number.isInteger(topK)||topK<1||topK>10||!Number.isInteger(maxWindows)||maxWindows<1||maxWindows>60)throw Error('INVALID_EVENT_CONTEXT');
 if(!Array.isArray(scores)||!Array.isArray(windows)||!scores.length||scores.length!==windows.length||scores.length>10000)throw Error('INVALID_EVENT_SHAPE');
 const rank=values=>values.map((score,index)=>({label:labels[index],score,index})).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,topK).map(({index,...v})=>v);
 const means=new Float64Array(labels.length);let previous=-Infinity;
 const output=scores.map((row,i)=>{
  if(!(Array.isArray(row)||row instanceof Float32Array||row instanceof Float64Array)||row.length!==labels.length||[...row].some(x=>!Number.isFinite(x)||x<0||x>1))throw Error('INVALID_EVENT_SCORES');
  const w=windows[i];if(!Number.isFinite(w?.from)||!Number.isFinite(w?.to)||w.from<0||w.to<=w.from||w.to>coverage.to-coverage.from+1e-9||w.from<previous)throw Error('INVALID_EVENT_WINDOW');previous=w.from;
  for(let k=0;k<labels.length;k++)means[k]+=row[k]/scores.length;
  return {from:coverage.from+w.from,to:coverage.from+w.to,timing:'window',ranked_candidates:rank([...row])};
 });
 const shown=output.length<=maxWindows?output:Array.from({length:maxWindows},(_,i)=>output[Math.floor(i*output.length/maxWindows)]);
 return {status:'ready',method:'fixed-event-evidence-v1',model_version:modelVersion,label_hash:createHash('sha256').update(JSON.stringify(labels)).digest('hex'),coverage:{...coverage},global_ranked_candidates:rank([...means]),windows:shown,total_windows:output.length,display_truncated:shown.length!==output.length,score_semantics:'raw fixed-classifier scores, not calibrated existence probabilities',limitations:['Ranked labels are candidates, not confirmed detections.','An unknown or low-scoring class is not silence.','Model-window support is not exact event duration.']};
}
