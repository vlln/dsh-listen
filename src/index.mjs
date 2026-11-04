import {defineTool} from '@deepseek-ai/dsh-tools';
import z from '@deepseek-ai/schemastery';
import {installAudioPlugin} from './plugin.mjs';
export const name='dsh-listen';
export const inject=['tools','fs','workingDirectory','attachments'];
export const Config=z.object({scratch:z.string().description('Private existing deployment scratch location; no automatic model downloads.'),mode:z.union(['aggregate','split']).default('aggregate'),localExecution:z.boolean().default(false).description('Enable only after verifying fs paths refer to the host execution world.')});
export async function apply(ctx,config){await installAudioPlugin(ctx,config,{defineTool});}
