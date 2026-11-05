import {evaluationPlugins} from './preset.mjs';
export const conditions=['summary','no-audio','full'];
export const experimentMatrix={schema_version:'audio-experiment-v1',model:{provider:'deepseek-official',model:'deepseek-flash'},concurrency:10,session_timeout_ms:600000,request_limits:null,persona:'You are an Agent',conditions:conditions.map(id=>({id,audio:id!=='no-audio',default_evidence_detail:id==='no-audio'?null:id,allowed_tools:id==='no-audio'?[]:['listen','read_image']}))};
export function formatExperimentTask(row,condition){
 if(!conditions.includes(condition)||typeof row.question!=='string'||!Array.isArray(row.choices)||!row.choices.every(x=>typeof x==='string'))throw Error('INVALID_EXPERIMENT_TASK');
 return `${row.question}\n\nChoices:\n${row.choices.join('\n')}\n\n${condition==='no-audio'?'Audio is not available in this condition.':'Audio path: audio.wav'}\nRespond with only the full text of the chosen answer.`;
}
export function experimentPlugins(baseUrl,{condition,config={},entry='dsh-listen'}={}){
 if(!conditions.includes(condition))throw Error('INVALID_EXPERIMENT_CONDITION');
 const plugins=evaluationPlugins(baseUrl,{...config,defaultEvidenceDetail:condition==='full'?'full':'summary'},entry);
 return condition==='no-audio'?plugins.filter(row=>['persona','compaction'].includes(row.id)):plugins;
}
