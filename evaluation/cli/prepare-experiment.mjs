// Preparation only. No child model process, package installation or answer-key reads.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {experimentMatrix,conditions,experimentPlugins} from '../config/experiment.mjs';
import {createRun} from './create-run.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const save=(file,data)=>fs.writeFile(file,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
export async function prepareExperiment({manifestPath,outputDirectory,workerHomes,modelPatchPath,audioConfig={},expectedSamples=60}){
 if(!Array.isArray(workerHomes)||workerHomes.length!==10)throw Error('TEN_WORKER_HOMES_REQUIRED');
 const homes=await Promise.all(workerHomes.map(x=>fs.realpath(x)));if(new Set(homes).size!==10)throw Error('WORKER_HOMES_MUST_BE_DISTINCT');
 if(audioConfig.allowExternalAudio||audioConfig.asrEnabled&&audioConfig.asrMode!=='local')throw Error('LOCAL_EXTRACTORS_ONLY');
 if(audioConfig.mode&&audioConfig.mode!=='aggregate')throw Error('AGGREGATE_MODE_REQUIRED');
 const source=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 if(!Number.isInteger(expectedSamples)||expectedSamples<1)throw Error('INVALID_EXPECTED_SAMPLES');
 if(!Array.isArray(source.samples)||source.samples.length!==expectedSamples)throw Error(`SAMPLE_COUNT_MISMATCH: expected ${expectedSamples}, received ${source.samples?.length}`);
 const model=await fs.readFile(modelPatchPath,'utf8');
 const canonicalModel=await fs.readFile(new URL('../config/model.patch.yml',import.meta.url),'utf8');
 if(model.trim()!==canonicalModel.trim())throw Error('MODEL_ONLY_PATCH_REQUIRED');
 const root=path.resolve(outputDirectory);await fs.mkdir(root,{mode:0o700});
 const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const ids=new Set(),cases=[];
 for(const row of source.samples){
  if(!row||! /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(row.id)||ids.has(row.id))throw Error('INVALID_EXPERIMENT_ID');ids.add(row.id);
  const workspace=path.resolve(row.workspace),task=await fs.readFile(path.join(workspace,'task.txt'),'utf8');
  if(row.task_protocol!=='mmau-plain-text-v1'||hash(task)!==row.task_sha256)throw Error('TASK_HASH_MISMATCH');
  const suffix='\n\nAudio path: audio.wav\nRespond with only the full text of the chosen answer.';
  if(!task.endsWith(suffix))throw Error('TASK_FORMAT_MISMATCH');
  const audio=await fs.readFile(path.join(workspace,'audio.wav'));if(hash(audio)!==row.audio_sha256)throw Error('AUDIO_HASH_MISMATCH');
  // Preserve exact question/options; never load references or keys to reconstruct tasks.
  cases.push({id:row.id,task,audio,audio_sha256:row.audio_sha256});
 }
 const presetBytes=await fs.readFile(new URL('../config/preset.patch.yml',import.meta.url));
 const runtimeHelper=await fs.readFile(new URL('../config/headless-preset.mjs',import.meta.url));
 await fs.writeFile(path.join(root,'preset.patch.yml'),presetBytes,{flag:'wx',mode:0o600});
 await fs.writeFile(path.join(root,'headless-preset.mjs'),runtimeHelper,{flag:'wx',mode:0o600});
 const artifacts={'preset.patch.yml':hash(presetBytes),'headless-preset.mjs':hash(runtimeHelper)};
 const runs={};
 for(const condition of conditions){
  const dir=path.join(root,condition);await fs.mkdir(dir,{mode:0o700});const samples=[];
  for(const item of cases){const workspace=path.join(dir,item.id);await fs.mkdir(workspace,{mode:0o700});const task=item.task;await fs.writeFile(path.join(workspace,'task.txt'),task,{flag:'wx',mode:0o600});await fs.writeFile(path.join(workspace,'audio.wav'),item.audio,{flag:'wx',mode:0o600});samples.push({id:item.id,workspace,task_protocol:'mmau-plain-text-v1',task_sha256:hash(task),audio_sha256:item.audio_sha256,audio_available:true});}
  const plugins=experimentPlugins(import.meta.url,{condition,config:audioConfig});
  const overlay=model+'\n- id: preset-audio-evaluation\n  name: "@deepseek-ai/dsh-agent-preset"\n  config: '+JSON.stringify({id:'audio-evaluation',plugins})+'\n';
  const overlayPath=path.join(dir,'overlay.yml');await fs.writeFile(overlayPath,overlay,{flag:'wx',mode:0o600});
  const manifest=path.join(dir,'manifest.json');await save(manifest,{samples});
  const run=await createRun({manifestPath:manifest,dshHome:homes[0],workerHomes:homes,concurrency:10,overlayPath,runsDirectory:path.join(dir,'runs')});
  const runPath=path.join(run,'run.json'),metadata=JSON.parse(await fs.readFile(runPath,'utf8'));
  metadata.experiment={schema_version:experimentMatrix.schema_version,condition,allowed_tools:experimentMatrix.conditions.find(x=>x.id===condition).allowed_tools,persona:experimentMatrix.persona};
  metadata.preset_path=path.join(root,'preset.patch.yml');metadata.frozen_files=Object.fromEntries([...Object.entries(artifacts).map(([file,digest])=>[path.join(root,file),digest]),[overlayPath,hash(overlay)],[path.join(run,'manifest.json'),hash(await fs.readFile(path.join(run,'manifest.json')))]]);
  async function freezeTree(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())await freezeTree(file);else if(item.isFile())metadata.frozen_files[file]=hash(await fs.readFile(file));}}
  for(const home of homes){for(const file of ['package.json','cordis.patch.yml'].map(x=>path.join(home,'profiles/headless',x))){try{metadata.frozen_files[file]=hash(await fs.readFile(file));}catch(error){if(error.code!=='ENOENT')throw error;}}try{await freezeTree(path.join(home,'profiles/headless/node_modules/dsh-listen'));}catch(error){if(error.code!=='ENOENT')throw error;}}
  metadata.experiment_contract_sha256=hash(JSON.stringify({experiment:metadata.experiment,preset_path:metadata.preset_path,overlay_path:metadata.overlay_path,worker_homes:metadata.worker_homes,concurrency:metadata.concurrency,session_timeout_ms:metadata.session_timeout_ms,frozen_files:metadata.frozen_files}));
  await fs.writeFile(runPath,JSON.stringify(metadata,null,2)+'\n',{mode:0o600});runs[condition]=run;
 }
 await save(path.join(root,'experiment.json'),{...experimentMatrix,commit,sample_count:cases.length,expected_samples:expectedSamples,source_manifest_sha256:hash(await fs.readFile(manifestPath)),model_patch_sha256:hash(model),runs,approval:'preparation_only_not_authorized_to_execute',source_case_ids:cases.map(x=>x.id)});
 return {directory:root,runs};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [manifestPath,outputDirectory,settingsPath]=process.argv.slice(2);if(process.argv.length!==5)throw Error('Usage: node evaluation/cli/prepare-experiment.mjs MANIFEST NEW_OUTPUT_DIRECTORY LOCAL_SETTINGS_JSON');const settings=JSON.parse(await fs.readFile(settingsPath,'utf8'));console.log(JSON.stringify(await prepareExperiment({...settings,manifestPath,outputDirectory})));}catch(error){console.error(error.message);process.exitCode=1;}
}
