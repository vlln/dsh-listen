// Bounded, opt-in batch execution. DSH owns profile and patch composition.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {runSession} from '../lib/run-session.mjs';
export {runSession} from '../lib/run-session.mjs';

async function json(file){return JSON.parse(await fs.readFile(file,'utf8'));}
async function save(file,value){const temp=file+'.tmp';await fs.writeFile(temp,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});await fs.rename(temp,file);}

export async function runBatch(runDirectory,options={}){
  const directory=path.resolve(runDirectory),run=await json(path.join(directory,'run.json')),manifest=await json(path.join(directory,'manifest.json'));
  const concurrency=options.concurrency??run.concurrency??1;
  if(!Number.isSafeInteger(concurrency)||concurrency<1)throw Error('INVALID_CONCURRENCY');
  const configuredHomes=options.workerHomes??run.worker_homes??[run.dsh_home];
  if(!Array.isArray(configuredHomes)||configuredHomes.length!==concurrency||configuredHomes.some(home=>typeof home!=='string'||!home))throw Error('WORKER_HOMES_REQUIRED: provide one installed DSH home per worker');
  const homes=configuredHomes.map(home=>path.resolve(directory,home));
  if(concurrency>1){const realHomes=await Promise.all(homes.map(home=>fs.realpath(home)));if(new Set(realHomes).size!==concurrency)throw Error('WORKER_HOMES_MUST_BE_DISTINCT');}
  const rows=manifest.samples;
  if(!Array.isArray(rows)||rows.length===0)throw Error('INVALID_BATCH_MANIFEST: expected nonempty samples');
  const ids=new Set(),tasks=[];
  // Validate the entire batch before spawning any session (including later tasks).
  for(const row of rows){
    if(!row||typeof row.id!=='string'||! /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(row.id)||ids.has(row.id))throw Error('INVALID_BATCH_ID');ids.add(row.id);
    if(typeof row.workspace!=='string'||typeof row.task_sha256!=='string')throw Error('INVALID_BATCH_TASK');
    if(row.task_protocol!=='mmau-plain-text-v1')throw Error('BATCH_TASK_PROTOCOL_MISMATCH');
    const workspace=path.resolve(run.project_root??directory,row.workspace),task=await fs.readFile(path.join(workspace,'task.txt'),'utf8');
    if(createHash('sha256').update(task).digest('hex')!==row.task_sha256)throw Error('BATCH_TASK_HASH_MISMATCH');
    if(typeof row.audio_sha256!=='string'||createHash('sha256').update(await fs.readFile(path.join(workspace,'audio.wav'))).digest('hex')!==row.audio_sha256)throw Error('BATCH_AUDIO_HASH_MISMATCH');
    tasks.push({workspace,task});
  }
  if(typeof run.dsh_home!=='string'||typeof run.overlay_path!=='string'||run.session_timeout_ms!==600000)throw Error('INVALID_BATCH_RUN_CONFIG');
  const overlay=path.resolve(directory,run.overlay_path);
  const preset=fileURLToPath(new URL('../config/preset.patch.yml',import.meta.url));
  const env={...process.env,NODE_USE_ENV_PROXY:'0'};
  for(const key of ['DSH_EVALUATION_BUDGET_FILE','DSH_EVALUATION_SESSION_BUDGET_FILE','DSH_EVALUATION_MAX_REQUESTS'])delete env[key];
  // Directory exclusivity is the execution lock: interrupted batches never resume.
  const results=path.join(directory,'results');await fs.mkdir(results,{mode:0o700});
  let stopped=false;
  run.concurrency=concurrency;run.worker_homes=homes;
  run.status='running';await save(path.join(directory,'run.json'),run);
  let nextIndex=0;
  async function worker(home){
    try{while(nextIndex<rows.length){
      const index=nextIndex++,row=rows[index],outputDirectory=path.join(results,row.id);await fs.mkdir(outputDirectory,{mode:0o700});
      const result=stopped?{status:'not_run',model_output:''}:await runSession({command:'dsh',args:['--profile','headless','--patch',preset,'--patch',overlay,'--json','-'],cwd:tasks[index].workspace,env:{...env,DSH_HOME:home},task:tasks[index].task,outputDirectory});
      if(result.stop_batch)stopped=true;
      await save(path.join(outputDirectory,'result.json'),{id:row.id,...result});
      console.log(JSON.stringify({id:row.id,status:result.status,model_requests:result.model_requests??null,duration_ms:result.duration_ms??null}));
    }}catch(error){stopped=true;throw error;}
  }
  try{
    const outcomes=await Promise.allSettled(homes.map(worker));
    const failed=outcomes.find(outcome=>outcome.status==='rejected');if(failed)throw failed.reason;
    run.status=stopped?'stopped':'finished';
  }catch(error){run.status='stopped';run.error=error.message;throw error;}
  finally{await save(path.join(directory,'run.json'),run);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const {positionals,values}=parseArgs({allowPositionals:true,options:{concurrency:{type:'string'},'worker-home':{type:'string',multiple:true}}});
    if(positionals.length!==1)throw Error('Usage: node evaluation/cli/run-batch.mjs RUN_DIRECTORY [--concurrency N] [--worker-home HOME ...]');
    await runBatch(positionals[0],{...(values.concurrency!==undefined?{concurrency:Number(values.concurrency)}:{}),...(values['worker-home']?{workerHomes:values['worker-home']}:{})});
  }catch(error){console.error(error.message);process.exitCode=1;}
}
