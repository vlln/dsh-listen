// Reuse a prepared manifest and an installed DSH home. No install or inference.
import fs from 'node:fs/promises';import path from 'node:path';import {randomUUID} from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {parseArgs} from 'node:util';
export async function createRun({manifestPath,dshHome,overlayPath,concurrency=1,workerHomes,runsDirectory=path.resolve('.work/evaluation/runs')}){
 if(!Number.isSafeInteger(concurrency)||concurrency<1)throw Error('INVALID_CONCURRENCY');
 const configuredHomes=workerHomes??[dshHome];
 if(!Array.isArray(configuredHomes)||configuredHomes.length!==concurrency)throw Error('WORKER_HOMES_REQUIRED');
 const homes=await Promise.all(configuredHomes.map(home=>fs.realpath(home)));
 if(new Set(homes).size!==homes.length)throw Error('WORKER_HOMES_MUST_BE_DISTINCT');
 const input=await fs.realpath(manifestPath),home=homes[0],overlay=await fs.realpath(overlayPath),manifest=JSON.parse(await fs.readFile(input,'utf8'));
 if(!Array.isArray(manifest.samples)||!manifest.samples.length)throw Error('EMPTY_MANIFEST');
 const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),run=path.join(runsDirectory,id);await fs.mkdir(runsDirectory,{recursive:true});await fs.mkdir(run,{mode:0o700});
 await fs.writeFile(path.join(run,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
 const metadata={run_id:id,status:'prepared',project_root:process.cwd(),source_manifest:input,dsh_home:home,concurrency,worker_homes:homes,overlay_path:overlay,session_timeout_ms:300000,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};
 await fs.writeFile(path.join(run,'run.json'),JSON.stringify(metadata,null,2)+'\n',{flag:'wx',mode:0o600});return run;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const {positionals,values}=parseArgs({allowPositionals:true,options:{concurrency:{type:'string'},'worker-home':{type:'string',multiple:true}}});
 const [manifestPath,dshHome,overlayPath]=positionals;if(positionals.length!==3)throw Error('Usage: node evaluation/cli/create-run.mjs MANIFEST DSH_HOME OVERLAY [--concurrency N] [--worker-home HOME ...]');
 console.log(await createRun({manifestPath,dshHome,overlayPath,concurrency:values.concurrency===undefined?1:Number(values.concurrency),workerHomes:values['worker-home']}));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
