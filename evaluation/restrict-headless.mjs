// Test-only headless tool restriction. Not part of plugin distribution.
export const name='audio-evaluation-restriction';
import {reserveRequest} from './budget.mjs';
export const inject=['tools','llm'];
export function apply(ctx,config){
 const mode=config.mode??'aggregate',maxModelRequests=config.maxModelRequests??40;
 if(!Number.isInteger(maxModelRequests)||maxModelRequests<1||maxModelRequests>240)throw Error('INVALID_PREVIEW_BUDGET');
 if(config.budgetFile)ctx.on('llm/stream',async function*(options,next){await reserveRequest(config.budgetFile,maxModelRequests);yield* next();});
 const names=mode==='baseline'?[]:mode==='split'?['audio_signal','audio_transcript','audio_events']:['listen'];
 ctx.on('agent/created',({agent})=>{
  let audioCalls=0;
  // Guard is scope-local and authoritative even if a transport exposes a bypass.
  agent.ctx.on('tools/pre-execute',async(exec,next)=>{
   if(!names.includes(exec.name))return {kind:'deny',reason:'AUDIO_EVALUATION_TOOL_NOT_ALLOWED'};
   if(audioCalls>=3)return {kind:'deny',reason:'AUDIO_EVALUATION_TOOL_LIMIT'};audioCalls++;
   return next();
  });
 });
}
