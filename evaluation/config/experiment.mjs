import {evaluationPlugins} from './preset.mjs';
export const conditions=['audio'];
export const experimentMatrix={schema_version:'audio-experiment-v1',model:{provider:'deepseek-official',model:'deepseek-flash'},concurrency:10,session_timeout_ms:600000,request_limits:null,persona:'You are an Agent',conditions:conditions.map(id=>({id,audio:true,allowed_tools:['listen','read_image']}))};
export function formatExperimentTask(row,condition){
 if(!conditions.includes(condition)||typeof row.question!=='string'||!Array.isArray(row.choices)||!row.choices.every(x=>typeof x==='string'))throw Error('INVALID_EXPERIMENT_TASK');
 return `${row.question}\n\nChoices:\n${row.choices.join('\n')}\n\nAudio path: audio.wav\nRespond with only the full text of the chosen answer.`;
}
export function experimentPlugins(baseUrl,{condition,config={},entry='dsh-listen'}={}){
 if(!conditions.includes(condition))throw Error('INVALID_EXPERIMENT_CONDITION');
 return evaluationPlugins(baseUrl,config,entry);
}
