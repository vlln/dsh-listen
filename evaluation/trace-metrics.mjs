export function traceMetrics(events){
 const calls=events.filter(e=>e.type==='tool_call'),results=events.filter(e=>e.type==='tool_result');
 const usage=events.filter(e=>e.type==='status'&&e.phase==='step_end'&&e.usage).map(e=>e.usage);
 const totals={input_tokens:0,output_tokens:0,cache_read_tokens:0};
 for(const row of usage){totals.input_tokens+=row.inputTokens??0;totals.output_tokens+=row.outputTokens??0;totals.cache_read_tokens+=row.cacheReadTokens??0;}
 const requested={},available={},errors=[];let truncatedResults=0;
 for(const r of results){if(r.truncated){truncatedResults++;continue;}if(r.status!=='completed'){errors.push({call_id:r.callId,status:r.status});continue;}let data;try{data=JSON.parse(r.result);}catch{continue;}for(const f of data.requested_features??[])requested[f]=(requested[f]??0)+1;for(const f of data.available_features??[])available[f]=(available[f]??0)+1;}
 return {model_steps:usage.length,tool_calls:calls.length,tool_errors:errors.length,truncated_results:truncatedResults,requested_components:requested,available_components:available,...totals,token_semantics:'sum of per-step inputTokens/outputTokens; cacheReadTokens reported separately; not monetary cost',errors};
}
