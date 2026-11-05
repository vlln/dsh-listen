// Presentation only: extraction reports and component caches retain original values.
const EXCLUDED=new Set(['limitations','detail_guidance','score_semantics']);
export function presentEvidence(value){
 if(Array.isArray(value))return value.map(presentEvidence);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!EXCLUDED.has(key)).map(([key,item])=>[key,presentEvidence(item)]));
 return value;
}

// Keep integer counters exact. Round finite non-integers to five significant digits,
// then select the shorter valid JSON number spelling (decimal wins ties).
export function stringifyEvidence(value,space){
 return JSON.stringify(value,(_key,item)=>{
  if(typeof item!=='number'||!Number.isFinite(item)||Number.isInteger(item))return item;
  const rounded=Number(item.toPrecision(5));
  const decimal=String(rounded);
  const scientific=rounded.toExponential().replace('e+','e');
  return JSON.rawJSON(scientific.length<decimal.length?scientific:decimal);
 },space);
}
