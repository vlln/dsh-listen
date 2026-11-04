import {mkdir} from 'node:fs/promises';
import {makeHostBridge} from './host.mjs';
import {createPipeline} from './pipeline.mjs';
import {makeAudioTools} from './tools.mjs';
import {prepareExtractors} from './configure.mjs';
import {makeAttachmentResolver} from './attachments.mjs';
import {createTaskLifecycle} from './lifecycle.mjs';
export async function installAudioPlugin(ctx,config,{defineTool,secretProvider}={}){
 if(!ctx?.fs||!ctx.workingDirectory||!ctx.attachments||typeof ctx.tools?.register!=='function'||typeof ctx.effect!=='function'||typeof defineTool!=='function')throw Error('INVALID_PLUGIN_SERVICES');
 if(!config||typeof config.scratch!=='string'||!config.scratch)throw Error('INVALID_PLUGIN_CONFIG');
 await mkdir(config.scratch,{recursive:true,mode:0o700});
 const bridge=makeHostBridge({fs:ctx.fs,workingDirectory:ctx.workingDirectory,scratch:config.scratch,localExecution:config.localExecution===true,...(typeof ctx.attachments.readFileStream==='function'?{resolveAttachment:makeAttachmentResolver({attachments:ctx.attachments,scratch:config.scratch})}:{})});
 const extractors=await prepareExtractors(config,{secretProvider});
 const inspect=createPipeline({authorize:bridge.authorize,extractors}),lifecycle=createTaskLifecycle();
 const tools=makeAudioTools({defineTool,inspect,caller:bridge.caller,saveImage:input=>ctx.attachments.saveImage(input),mode:config.mode??'aggregate'});
 for(const tool of tools){const execute=tool.execute;tool.execute=(args,exec)=>lifecycle.run(exec.signal,signal=>execute(args,{...exec,signal}));}
 const cleanups=[];
 try{for(const tool of tools)cleanups.push(ctx.tools.register(tool));}catch(error){for(const cleanup of cleanups.reverse())cleanup();throw error;}
 ctx.effect(()=>async()=>{for(const cleanup of cleanups.reverse())cleanup();await lifecycle.close();});
 return {tools:tools.map(t=>t.name)};
}
