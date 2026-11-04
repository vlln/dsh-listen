// Evaluation-wide model request ceiling only. Tools are never intercepted.
import {reserveRequest} from './budget.mjs';
export const name='audio-evaluation-request-budget';
export const inject=['llm'];
export function apply(ctx,config={}){
 const maxModelRequests=config.maxModelRequests??40;
 if(!Number.isSafeInteger(maxModelRequests)||maxModelRequests<1)throw Error('INVALID_PREVIEW_BUDGET');
 if(config.budgetFile)ctx.on('llm/stream',async function*(options,next){await reserveRequest(config.budgetFile,maxModelRequests,process.env.DSH_EVALUATION_SESSION_BUDGET_FILE||undefined);yield* next();});
}
