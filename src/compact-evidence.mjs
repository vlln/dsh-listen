// Stateless presentation factoring. Canonical reports and numeric evidence are untouched.
const stable=value=>Array.isArray(value)?'['+value.map(stable).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}':JSON.stringify(value);
const bytes=value=>Buffer.byteLength(JSON.stringify(value));
export function compactEvidence(report){
 const out=structuredClone(report),definitions={};
 // Execution bookkeeping stays in the canonical tool value, not model evidence.
 for(const key of ['analysis_id','recipe_version','execution'])delete out[key];
 const rows=Object.values(out.evidence??{}).filter(x=>x&&typeof x==='object');
 for(const row of rows)if(stable(row.coverage)===stable(out.coverage))delete row.coverage;
 // Local coverage inherits report.coverage when absent. Keep extra sampling fields.
 for(const row of rows)if(row.coverage&&out.coverage&&row.coverage.from===out.coverage.from&&row.coverage.to===out.coverage.to){delete row.coverage.from;delete row.coverage.to;if(!Object.keys(row.coverage).length)delete row.coverage;}
 // Factor common parameters among features using the same numerical method.
 const groups=new Map();
 for(const row of rows)if(row.parameters){const family=row.parameters.pitch_method?'pitch':row.parameters.rhythm_method?'rhythm':row.method;const group=groups.get(family)??[];group.push(row);groups.set(family,group);}
 for(const group of groups.values()){
  if(group.length<2)continue;
  const common=Object.fromEntries(Object.entries(group[0].parameters).filter(([key,value])=>group.every(row=>Object.hasOwn(row.parameters,key)&&stable(row.parameters[key])===stable(value))));
  if(!Object.keys(common).length)continue;
  const id='p'+Object.keys(definitions).length;
  const before=group.reduce((n,row)=>n+bytes(row.parameters),0);
  const projected=group.map(row=>({...row,parameters:Object.fromEntries(Object.entries(row.parameters).filter(([key])=>!Object.hasOwn(common,key))),parameters_ref:id}));
  const after=bytes({[id]:common})+projected.reduce((n,row)=>n+bytes(row.parameters)+bytes({parameters_ref:id}),0);
  if(after>=before)continue;
  definitions[id]=common;
  group.forEach((row,i)=>{row.parameters=projected[i].parameters;row.parameters_ref=id;if(!Object.keys(row.parameters).length)delete row.parameters;});
 }
 if(Object.keys(definitions).length)out.parameter_sets=definitions;
 return out;
}

// Inverse used for equivalence tests and offline consumers. Audit fields are not reconstructed.
export function expandEvidence(report){
 const out=structuredClone(report);
 for(const row of Object.values(out.evidence??{}))if(row&&typeof row==='object'){
  if(row.parameters_ref){const base=out.parameter_sets?.[row.parameters_ref];if(!base)throw Error('UNKNOWN_PARAMETER_SET');row.parameters={...base,...row.parameters};delete row.parameters_ref;}
  row.coverage={...out.coverage,...row.coverage};
 }
 delete out.parameter_sets;return out;
}
