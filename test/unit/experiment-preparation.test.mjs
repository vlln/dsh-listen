import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import {runBatch} from '../../evaluation/cli/run-batch.mjs';
import {prepareExperiment} from '../../evaluation/cli/prepare-experiment.mjs';
import {conditions,experimentMatrix,formatExperimentTask,experimentPlugins} from '../../evaluation/config/experiment.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
test('single audio experiment preserves choices and excludes references and detail defaults',()=>{
 const row={question:'Question?',choices:['a','b'],answer_key:'SECRET'},text=formatExperimentTask(row,'audio');
 assert.ok(text.includes('a\nb'));assert.ok(!text.includes('SECRET'));assert.ok(text.includes('Audio path: audio.wav'));
 assert.deepEqual(conditions,['audio']);assert.deepEqual(experimentMatrix.conditions,[{id:'audio',audio:true,allowed_tools:['listen','read_image']}]);
 for(const cancelled of ['summary','full','no-audio','bad']){assert.throws(()=>formatExperimentTask(row,cancelled));assert.throws(()=>experimentPlugins(import.meta.url,{condition:cancelled}));}
 assert.equal(experimentMatrix.request_limits,null);assert.equal(experimentMatrix.session_timeout_ms,300000);assert.equal(experimentMatrix.persona,'You are an Agent');assert.doesNotMatch(JSON.stringify(experimentMatrix),/evidence_detail|defaultEvidenceDetail|baseline/);
});
test('prepare frozen single-condition sixty-case experiment without inference or answer copies',{skip:!process.env.DSH_RUNTIME_ROOT},async t=>{
 const base=path.resolve('.work/experiment-preparation-tests');await fs.mkdir(base,{recursive:true});const root=await fs.mkdtemp(path.join(base,'case-'));t.after(async()=>{assert.equal(path.dirname(root),base);assert.match(path.basename(root),/^case-/);assert.equal(await fs.realpath(root),root);await fs.rm(root,{recursive:true,force:true});});
 const homes=Array.from({length:10},(_,i)=>path.join(root,`home-${i}`));for(const h of homes)await fs.mkdir(h);
 const audio=Buffer.from('synthetic audio'),task=formatExperimentTask({question:'Question?',choices:['one','two']},'audio');const samples=[];
 for(let i=0;i<60;i++){const workspace=path.join(root,`source-${i}`);await fs.mkdir(workspace);await fs.writeFile(path.join(workspace,'task.txt'),task);await fs.writeFile(path.join(workspace,'audio.wav'),audio);await fs.writeFile(path.join(workspace,'answers.json'),'DO_NOT_COPY_SECRET');samples.push({id:`case-${i}`,workspace,task_sha256:hash(task),audio_sha256:hash(audio),task_protocol:'mmau-plain-text-v1'});}
 const manifestPath=path.join(root,'source.json');await fs.writeFile(manifestPath,JSON.stringify({samples}));const settings={manifestPath,outputDirectory:path.join(root,'experiment'),workerHomes:homes,modelPatchPath:path.resolve('evaluation/config/model.patch.yml')};
 const {runs}=await prepareExperiment(settings);assert.deepEqual(Object.keys(runs),['audio']);
 const run=runs.audio,metaPath=path.join(run,'run.json'),metadata=JSON.parse(await fs.readFile(metaPath)),manifest=JSON.parse(await fs.readFile(path.join(run,'manifest.json')));
 assert.equal(metadata.session_timeout_ms,300000);assert.equal(metadata.concurrency,10);assert.equal(metadata.experiment.condition,'audio');assert.equal(metadata.status,'prepared');assert.ok(metadata.frozen_files[metadata.preset_path]);assert.equal(manifest.samples.length,60);
 assert.deepEqual((await fs.readdir(manifest.samples[0].workspace)).sort(),['audio.wav','task.txt']);assert.equal(await fs.readFile(path.join(manifest.samples[0].workspace,'task.txt'),'utf8'),task);assert.equal(manifest.samples[0].audio_available,true);
 const overlay=await fs.readFile(metadata.overlay_path,'utf8');assert.doesNotMatch(overlay,/DO_NOT_COPY_SECRET|evidence_detail|defaultEvidenceDetail|baseline/);assert.doesNotMatch(JSON.stringify(metadata.experiment),/evidence_detail|defaultEvidenceDetail|baseline/);
 const plugins=experimentPlugins(import.meta.url,{condition:'audio'});assert.equal(plugins[0].config.prefix,'You are an Agent');assert.deepEqual(plugins.at(-1).config,{});
 const experiment=JSON.parse(await fs.readFile(path.join(settings.outputDirectory,'experiment.json')));assert.deepEqual(Object.keys(experiment.runs),['audio']);assert.equal(experiment.approval,'preparation_only_not_authorized_to_execute');assert.equal(experiment.session_timeout_ms,300000);
  // Both deadlines are individually supported, but a prepared experiment cannot switch.
  await fs.writeFile(metaPath,JSON.stringify({...metadata,session_timeout_ms:600000}));await assert.rejects(runBatch(run),/EXPERIMENT_CONTRACT_CHANGED/);
  await assert.rejects(fs.stat(path.join(run,'results')),{code:'ENOENT'});await fs.writeFile(metaPath,JSON.stringify(metadata));
 const changed={...metadata,overlay_path:path.join(root,'alternate.yml')};await fs.writeFile(changed.overlay_path,'[]');await fs.writeFile(metaPath,JSON.stringify(changed));await assert.rejects(runBatch(run),/CONTRACT_CHANGED/);
 await fs.writeFile(metaPath,JSON.stringify(metadata));await fs.appendFile(metadata.overlay_path,'\n# changed');await assert.rejects(runBatch(run),/FROZEN_CONFIG_HASH/);
 await assert.rejects(prepareExperiment({...settings,audioConfig:{mode:'split'}}),/AGGREGATE/);await assert.rejects(prepareExperiment({...settings,audioConfig:{asrEnabled:true}}),/LOCAL_EXTRACTORS/);
 await assert.rejects(prepareExperiment(settings),{code:'EEXIST'});await assert.rejects(prepareExperiment({...settings,workerHomes:[homes[0]]}),/TEN_WORKER/);await assert.rejects(prepareExperiment({...settings,workerHomes:Array(10).fill(homes[0])}),/DISTINCT/);await assert.rejects(prepareExperiment({...settings,audioConfig:{allowExternalAudio:true}}),/LOCAL_EXTRACTORS/);
 const bad=path.join(root,'bad.yml');await fs.writeFile(bad,'deepseek-official deepseek-flash plugins: []');await assert.rejects(prepareExperiment({...settings,modelPatchPath:bad}),/MODEL_ONLY/);
 const invalidManifest=path.join(root,'invalid.json');await fs.writeFile(invalidManifest,JSON.stringify({samples:samples.slice(1)}));await assert.rejects(prepareExperiment({...settings,manifestPath:invalidManifest}),/SAMPLE_COUNT_MISMATCH/);
 for(const [field,error] of [['task_sha256',/TASK_HASH_MISMATCH/],['audio_sha256',/AUDIO_HASH_MISMATCH/]]){
  await fs.writeFile(invalidManifest,JSON.stringify({samples:samples.map((row,i)=>i?row:{...row,[field]:'invalid'})}));
  await assert.rejects(prepareExperiment({...settings,manifestPath:invalidManifest,outputDirectory:path.join(root,field)}),error);
 }
});
