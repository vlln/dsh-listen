// Headless has no Web session controller: select through the native registry.
export const name='audio-evaluation-headless-preset';
export const inject=['agentPresets'];
export function apply(ctx){
 ctx.on('agent/created',async({agent})=>{await ctx.get('agentPresets').select(agent,'audio-evaluation');});
}
