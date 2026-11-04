// Test-only headless tool restriction. Not part of plugin distribution.
export const name='audio-evaluation-restriction';
export const inject=['tools'];
export function apply(ctx,config){
 const mode=config.mode??'aggregate';
 const names=mode==='baseline'?[]:mode==='split'?['audio_signal','audio_transcript','audio_events']:['listen'];
 ctx.on('agent/created',({agent})=>{
  // Guard is scope-local and authoritative even if a transport exposes a bypass.
  agent.ctx.on('tools/pre-execute',async(exec,next)=>{
   if(!names.includes(exec.name))return {kind:'deny',reason:'AUDIO_EVALUATION_TOOL_NOT_ALLOWED'};
   return next();
  });
 });
}
