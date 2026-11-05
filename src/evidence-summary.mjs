import {presentEvidence} from './evidence-presentation.mjs';
const MAX_BYTES=16000;
const has=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const size=value=>Buffer.byteLength(JSON.stringify(value),'utf8');

/** A presentation-only projection: the canonical report and its numbers are untouched. */
export function summarizeEvidence(report){
 if(!report||typeof report!=='object'||Array.isArray(report))throw Error('INVALID_EVIDENCE_REPORT');
 report=presentEvidence(report);
 const omitted=[];
 const note=(path,total,shown,unit='items')=>{if(total>shown)omitted.push({path,total_count:total,shown_count:shown,omitted_count:total-shown,unit});};
 const text=(value,path,limit=240)=>{
  const characters=Array.from(value);note(path,characters.length,Math.min(limit,characters.length),'characters');
  return characters.slice(0,limit).join('');
 };
 // Bounds are presentation limits, not new extraction limits or numerical rounding.
 const copy=(value,path,depth=0)=>{
  if(value===null||typeof value==='number'||typeof value==='boolean')return value;
  if(typeof value==='string')return text(value,path);
  if(Array.isArray(value)){
   const limit=path.endsWith('.intervals')?5:path.endsWith('.channels')?8:12;
   note(path,value.length,Math.min(limit,value.length));
   return value.slice(0,limit).map((item,i)=>copy(item,`${path}[${i}]`,depth+1));
  }
  if(value&&typeof value==='object'){
   const keys=Object.keys(value);
   if(depth>=8){note(path,keys.length,0,'fields');return {};}
   const out={};note(path,keys.length,Math.min(24,keys.length),'fields');
   for(const key of keys.slice(0,24))out[key]=copy(value[key],`${path}.${key}`,depth+1);
   return out;
  }
  return null;
 };
 const select=(value,keys,path)=>{
  if(!value||typeof value!=='object')return value===null?null:{};
  const out={};
  for(const key of keys)if(has(value,key))out[key]=copy(value[key],`${path}.${key}`);
  for(const key of Object.keys(value))if(!keys.includes(key)){
   const item=value[key];note(`${path}.${key}`,Array.isArray(item)?item.length:1,0,Array.isArray(item)?'items':'fields');
  }
  return out;
 };
 const result={summary_version:'v1',presentation:'summary'};
 for(const key of ['analysis_id','recipe_version','status','source','coverage','requested_features','available_features','missing_features'])if(has(report,key))result[key]=copy(report[key],key);
 result.evidence={};
 const evidence=report.evidence??{};
 const common=['status','reason','error','method','model_version','coverage','units','preprocessing','limitations'];
 // Priority is independent of the caller's requested feature ordering.
 for(const feature of ['transcript','events','dsp','signal']){
  if(!has(evidence,feature))continue;
  const value=evidence[feature],path=`evidence.${feature}`;
  if(value===null){result.evidence[feature]=null;continue;}
  let out;
  if(feature==='transcript'){
   out=select(value,[...common,'language','timing','timing_adjustments'],path);
   if(typeof value.text==='string'){
    // Replace the generic omitted-field entry with a character-accurate preview count.
    const index=omitted.findIndex(item=>item.path===`${path}.text`);if(index>=0)omitted.splice(index,1);
    out.text=text(value.text,`${path}.text`,1200);
    out.text_character_count=Array.from(value.text).length;
   }else if(has(value,'text'))out.text=copy(value.text,`${path}.text`);
  }else if(feature==='events'){
   out=select(value,[...common,'score_semantics','total_windows','display_truncated'],path);
   if(Array.isArray(value.global_ranked_candidates)){
    const p=`${path}.global_ranked_candidates`,index=omitted.findIndex(item=>item.path===p);if(index>=0)omitted.splice(index,1);
    out.global_ranked_candidates=value.global_ranked_candidates.slice(0,5).map((item,i)=>copy(item,`${p}[${i}]`));
    note(p,value.global_ranked_candidates.length,out.global_ranked_candidates.length);
   }
  }else if(feature==='dsp'){
   out=select(value,[...common],path);
   for(const key of ['measurements','spectral','temporal']){
    const p=`${path}.${key}`,index=omitted.findIndex(item=>item.path===p);if(index>=0)omitted.splice(index,1);
    if(!has(value,key))continue;
    const part=value[key];
    if(key==='measurements')out.measurements=copy(part,p);
    if(key==='spectral')out.spectral=select(part,['method','coverage','parameters','peaks','band_energy','chroma','limitations'],p);
    if(key==='temporal'){
     out.temporal=select(part,['method','coverage','units','parameters','limitations'],p);
      for(const field of ['pitch','rhythm']){const index=omitted.findIndex(item=>item.path===`${p}.${field}`);if(index>=0)omitted.splice(index,1);}
     if(part&&has(part,'pitch'))out.temporal.pitch=select(part.pitch,['method','coverage','units','limitations'],`${p}.pitch`);
     if(part&&has(part,'rhythm'))out.temporal.rhythm=select(part.rhythm,['tempo_candidates','limitations'],`${p}.rhythm`);
    }
   }
  }else{
   out=select(value,[...common,'plot','image'],path);
   const statisticsIndex=omitted.findIndex(item=>item.path===`${path}.statistics`);if(statisticsIndex>=0)omitted.splice(statisticsIndex,1);
   if(value.statistics){
    out.statistics=select(value.statistics,['method','sample_count','sample_rate_hz','coverage','units','parameters','digital_zero','channels','low_energy_fraction','stereo','stereo_unavailable_reason','limitations'],`${path}.statistics`);
    // The generic copy above must not duplicate the energy omission count.
    for(let i=omitted.length-1;i>=0;i--)if(omitted[i].path.startsWith(`${path}.statistics.energy[`)||omitted[i].path===`${path}.statistics.energy`&&omitted[i].shown_count>0)omitted.splice(i,1);
   }
  }
  result.evidence[feature]=out;
 }
 result.fields_omitted=omitted;
 // Keep omission accounting itself bounded: compact long path lists, never silently drop them.
 if(omitted.length>32){
  result.omission_details={entry_count:omitted.length,shown_entry_count:0,recovery:'Use evidence_detail:"full"; detailed omitted-field inventory exceeded summary budget.'};
  result.fields_omitted=[];
 }
 // Text encoding, unusual metadata and long labels must not defeat the hard byte bound.
 // Drop lowest-priority presentation groups first, reporting each whole-group omission.
 for(const feature of ['signal','dsp','events','transcript']){
  if(size(result)<=MAX_BYTES)break;
  if(!has(result.evidence,feature))continue;
  const original=result.evidence[feature];
  const keys=original&&typeof original==='object'?Object.keys(original):[];
  result.evidence[feature]=select(original,['status','reason','error','method','coverage'],`evidence.${feature}`);
  result.fields_omitted=result.fields_omitted.filter(item=>!item.path.startsWith(`evidence.${feature}.`));
  result.fields_omitted.push({path:`evidence.${feature}`,total_count:keys.length,shown_count:Object.keys(result.evidence[feature]??{}).length,omitted_count:keys.filter(key=>!['status','reason','error','method','coverage'].includes(key)).length,unit:'fields',reason:'summary_byte_budget'});
 }
 if(size(result)>MAX_BYTES){
  // Metadata is untrusted too. Preserve a minimal valid summary and explicit recovery.
  return {summary_version:'v1',presentation:'summary',status:text(String(report.status??'unknown'),'status',80),coverage:select(report.coverage,['from','to'],'coverage'),evidence:{},fields_omitted:[{path:'report',total_count:Object.keys(report).length,shown_count:0,omitted_count:Object.keys(report).length,unit:'fields',reason:'summary_byte_budget'}]};
 }
 return result;
}
