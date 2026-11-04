import {defineTool} from '@deepseek-ai/dsh-tools';
import z from '@deepseek-ai/schemastery';
import {installAudioPlugin} from './plugin.mjs';
export const name='dsh-listen';
export const inject=['tools','fs','workingDirectory','attachments'];
export const Config=z.object({
 scratch:z.string().description('Private deployment scratch location; no automatic model downloads.'),
 mode:z.union(['aggregate','split']).default('aggregate'),
 localExecution:z.boolean().default(false).description('Enable only after verifying fs paths refer to host execution world.'),
 asrEnabled:z.boolean().default(false),
 asrMode:z.union(['api','local']).default('api'),
 asrPython:z.string().default(''),
 asrModelDirectory:z.string().default(''),
 asrEndpoint:z.string().default(''),
 asrModel:z.string().default(''),
 asrRequiresKey:z.boolean().default(false).description('Credential resolver must be supplied by deployment; never put keys in this field.'),
 asrTimeoutMs:z.number().default(20000),
 eventsEnabled:z.boolean().default(false),
 eventsPython:z.string().default(''),
 eventsModelPath:z.string().default(''),
 eventsTimeoutMs:z.number().default(20000),
 allowExternalAudio:z.boolean().default(false).description('Deployment permission only; requires user approval before external audio processing.')
});
export async function apply(ctx,config){await installAudioPlugin(ctx,config,{defineTool});}
