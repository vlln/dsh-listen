// Reuse a prepared manifest and an installed DSH home. No install or inference.
import fs from 'node:fs/promises';import path from 'node:path';import {randomUUID} from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
export async function createRun({manifestPath,dshHome,overlayPath,maxModelRequests,runsDirectory=path.resolve('.work/evaluation/runs')}){
 if(!Number.isSafeInteger(maxModelRequests)||maxModelRequests<1)throw Error('INVALID_MODEL_REQUEST_LIMIT');
 const input=await fs.realpath(manifestPath),home=await fs.realpath(dshHome),overlay=await fs.realpath(overlayPath),manifest=JSON.parse(await fs.readFile(input,'utf8'));
 if(!Array.isArray(manifest.samples)||!manifest.samples.length)throw Error('EMPTY_MANIFEST');
 const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),run=path.join(runsDirectory,id);await fs.mkdir(runsDirectory,{recursive:true});await fs.mkdir(run,{mode:0o700});
 await fs.writeFile(path.join(run,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
 const metadata={run_id:id,status:'prepared',project_root:process.cwd(),source_manifest:input,dsh_home:home,overlay_path:overlay,session_timeout_ms:600000,max_model_requests:maxModelRequests,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};
 await fs.writeFile(path.join(run,'run.json'),JSON.stringify(metadata,null,2)+'\n',{flag:'wx',mode:0o600});await fs.writeFile(path.join(run,'budget.json'),'{"requests":0}\n',{flag:'wx',mode:0o600});return run;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [manifestPath,dshHome,overlayPath,limit]=process.argv.slice(2);if(process.argv.length!==6){console.error('Usage: node evaluation/create-run.mjs MANIFEST DSH_HOME OVERLAY MAX_MODEL_REQUESTS');process.exitCode=1;}else createRun({manifestPath,dshHome,overlayPath,maxModelRequests:Number(limit)}).then(console.log).catch(error=>{console.error(error.message);process.exitCode=1;});
}
