import {createHash} from 'node:crypto';
// Agent-facing batch adapter: no answer keys, index remapping or JSON response grammar.
export const taskProtocol='mmau-plain-text-v1';
export function assertPreparedTask(sample,text){
 if(sample.task_protocol!==taskProtocol||sample.task_sha256!==createHash('sha256').update(text).digest('hex'))throw Error('PREVIEW_TASK_PROTOCOL_MISMATCH: regenerate prepared tasks before running');
}
export function formatTask(row){
 return `${row.question}\n\nChoices:\n${row.choices.join('\n')}\n\nAudio path: audio.wav\nRespond with only the full text of the chosen answer.`;
}
export function predictionFromEvents(id,events,{exitCode=0}={}){
 const final=events.findLast(e=>e.type==='final');
 const complete=exitCode===0&&typeof final?.text==='string'&&final.text.trim().length>0;
 return {id,status:complete?'complete':'failed',model_output:complete?final.text:''};
}
