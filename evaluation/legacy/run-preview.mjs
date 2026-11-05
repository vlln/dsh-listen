// Executes only the user-approved nine development tasks; never reads answer keys.
import fs from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';import {assertPreparedTask} from '../lib/headless-adapter.mjs';
const root=process.cwd(),manifest=JSON.parse(await fs.readFile('.work/headless-preview/manifest.json'));
// Validate every task before profile writes or any model dispatch; legacy manifests fail closed.
const tasks=await Promise.all(manifest.map(async sample=>{const text=await fs.readFile(path.join(sample.directory,'task.txt'),'utf8');assertPreparedTask(sample,text);return text;}));
const modelPatch=await fs.readFile('.work/real-preview-model.patch.yml','utf8');
const home=path.resolve('.work/dsh-system-home'),pluginPatch=path.join(home,'profiles/headless/cordis.patch.yml');
const original=await fs.readFile(pluginPatch,'utf8');const runs=[];
try{
 for(const mode of ['aggregate','baseline','split']){
  const runtimePatch=modelPatch.replace('mode: aggregate',`mode: ${mode}`);const runtimeFile=path.resolve(`.work/preview-${mode}.patch.yml`);await fs.writeFile(runtimeFile,runtimePatch);
  const plugin=mode==='baseline'?'- id: dsh-listen\n  disabled: true\n':original.replace('mode: aggregate',`mode: ${mode}`);await fs.writeFile(pluginPatch,plugin);
  for(let index=0;index<manifest.length;index++){
   // Do not reuse historical runs produced under the retired index/JSON protocol.
   const budget=JSON.parse(await fs.readFile('.work/headless-preview/request-budget.json'));if(budget.requests>=40)throw Error('PREVIEW_BUDGET_EXHAUSTED');
   const sample=manifest[index],prefix=path.resolve(`.work/preview-${mode}-${index}`),task=tasks[index];
   const out=await fs.open(prefix+'.jsonl','wx',0o600),err=await fs.open(prefix+'.stderr','wx',0o600);
   const child=spawn('dsh',['--profile','headless','--patch',runtimeFile,'--json','-'],{cwd:sample.directory,env:{...process.env,NODE_USE_ENV_PROXY:'0',DSH_HOME:home},stdio:['pipe',out.fd,err.fd]});child.stdin.end(task);
   const timer=setTimeout(()=>child.kill('SIGTERM'),180000);let code;
   try{code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});}finally{clearTimeout(timer);await out.close();await err.close();}
   const stderr=await fs.readFile(prefix+'.stderr','utf8');runs.push({mode,index,code,events:prefix+'.jsonl'});await fs.writeFile('.work/preview-runs.json',JSON.stringify(runs,null,2));console.log(JSON.stringify({mode,index,code,budget:JSON.parse(await fs.readFile('.work/headless-preview/request-budget.json'))}));
   if(code!==0||/quota|insufficient|payment|HTTP.?402|HTTP.?429/i.test(stderr))throw Error('PREVIEW_STOP_ON_RUN_ERROR');
  }
 }
}finally{await fs.writeFile(pluginPatch,original);}
await fs.writeFile('.work/preview-runs.json',JSON.stringify(runs,null,2));
