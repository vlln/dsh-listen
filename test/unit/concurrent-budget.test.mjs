import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,readFile,writeFile,open,unlink,rm,readdir} from 'node:fs/promises';
import path from 'node:path';
import {setTimeout as delay,setImmediate as immediate} from 'node:timers/promises';
import {reserveRequest} from '../../evaluation/budget.mjs';
import {apply} from '../../evaluation/request-budget.mjs';

const root=path.resolve('.work/concurrent-budget-tests');
const moduleURL=new URL('../../evaluation/budget.mjs',import.meta.url).href;
async function fixture(t){
 await mkdir(root,{recursive:true});const dir=await mkdtemp(path.join(root,'case-'));
 t.after(async()=>{assert.equal(path.dirname(dir),root);assert.ok(path.basename(dir).startsWith('case-'));await rm(dir,{recursive:true,force:true});});return dir;
}
async function state(file){return JSON.parse(await readFile(file,'utf8'));}
function worker(t,file,limit,counterFile,attempts){
 const code=`import {reserveRequest} from ${JSON.stringify(moduleURL)};
 process.send('ready');process.once('message',async()=>{
  const accepted=[],errors=[];
  for(let i=0;i<${attempts};i++){try{accepted.push(await reserveRequest(${JSON.stringify(file)},${limit},${JSON.stringify(counterFile)}));}catch(error){errors.push(error.message);}}
  process.send({accepted,errors});process.disconnect();
 });`;
 const child=spawn(process.execPath,['--input-type=module','-e',code],{stdio:['ignore','pipe','pipe','ipc']});
 t.after(()=>{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');});
 let stderr='',report;child.stderr.on('data',data=>stderr+=data);
 const ready=new Promise((resolve,reject)=>{child.once('message',resolve);child.once('error',reject);child.once('exit',code=>reject(Error(`worker exited before ready: ${code} ${stderr}`)));});
 child.on('message',message=>{if(message!=='ready')report=message;});
 const result=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>{if(code!==0||!report)reject(Error(`worker failed: ${code} ${stderr}`));else resolve(report);});});
 return {ready,result,start:()=>child.send('start')};
}

test('independent processes reserve exactly the global ceiling with exact shared session sums and atomic readable snapshots',async t=>{
 const dir=await fixture(t),file=path.join(dir,'global.json'),counters=[0,1,2].map(i=>path.join(dir,`session-${i}.json`));
 await writeFile(file,JSON.stringify({requests:0,metadata:'preserved',padding:'x'.repeat(32768)}));
 const workers=Array.from({length:9},(_,i)=>worker(t,file,53,counters[i%3],13));
 await Promise.all(workers.map(w=>w.ready));
 let running=true,observations=0;
 const reader=(async()=>{while(running){const snapshot=await state(file);assert.ok(snapshot.requests>=0&&snapshot.requests<=53);assert.equal(snapshot.padding.length,32768);observations++;await immediate();}})();
 const resultsPromise=Promise.all(workers.map(w=>w.result));
 for(const w of workers)w.start();
 let results;try{results=await resultsPromise;}finally{running=false;await reader;}
 const accepted=results.flatMap(r=>r.accepted);
 assert.equal(accepted.length,53);assert.deepEqual(accepted.sort((a,b)=>a-b),Array.from({length:53},(_,i)=>i+1));
 assert.equal(results.flatMap(r=>r.errors).length,9*13-53);
 for(const result of results)for(const error of result.errors)assert.equal(error,'HEADLESS_PREVIEW_REQUEST_LIMIT');
 const counts=await Promise.all(counters.map(state));
 for(let i=0;i<3;i++)assert.equal(counts[i].requests,results.reduce((sum,r,j)=>sum+(j%3===i?r.accepted.length:0),0));
 assert.equal(counts.reduce((sum,s)=>sum+s.requests,0),53);
 assert.equal((await state(file)).requests,53);assert.equal((await state(file)).metadata,'preserved');assert.ok(observations>0);
 assert.deepEqual((await readdir(dir)).sort(),['global.json','session-0.json','session-1.json','session-2.json']);
});

test('a process retries a contended lock until its owner releases it',async t=>{
 const dir=await fixture(t),file=path.join(dir,'global.json'),counter=path.join(dir,'session.json');
 const lock=await open(file+'.lock','wx');
 const w=worker(t,file,2,counter,1);await w.ready;w.start();
 try{await delay(180);await assert.rejects(readFile(file),{code:'ENOENT'});}
 finally{await lock.close();await unlink(file+'.lock');}
 const result=await w.result;assert.deepEqual(result,{accepted:[1],errors:[]});assert.equal((await state(counter)).requests,1);
});

test('stale lock times out boundedly with actionable error and is never stolen',async t=>{
 const dir=await fixture(t),file=path.join(dir,'global.json');await writeFile(file+'.lock','stale owner');
 const w=worker(t,file,1,undefined,1);await w.ready;const started=performance.now();w.start();
 const result=await w.result,elapsed=performance.now()-started;
 assert.deepEqual(result.accepted,[]);assert.equal(result.errors.length,1);
 assert.match(result.errors[0],/BUDGET_LOCK_TIMEOUT.*5000ms.*active budget writer.*confirming its owner has stopped/);
 assert.ok(elapsed>=4900,`elapsed ${elapsed}`);assert.ok(elapsed<9000,`elapsed ${elapsed}`);
 assert.equal(await readFile(file+'.lock','utf8'),'stale owner');await assert.rejects(readFile(file),{code:'ENOENT'});
});

test('invalid session state and unavailable session directory do not consume global budget',async t=>{
 const dir=await fixture(t),file=path.join(dir,'global.json'),counter=path.join(dir,'session.json');
 await writeFile(file,JSON.stringify({requests:3}));await writeFile(counter,JSON.stringify({requests:-1}));
 await assert.rejects(reserveRequest(file,5,counter),/INVALID_BUDGET_STATE/);
 await assert.rejects(reserveRequest(file,5,path.join(dir,'missing','session.json')),{code:'ENOENT'});
 assert.equal((await state(file)).requests,3);assert.deepEqual((await readdir(dir)).sort(),['global.json','session.json']);
 await assert.rejects(reserveRequest(file,5,file),/INVALID_PREVIEW_BUDGET/);
});

test('request interceptor counts the environment-selected session before dispatch and refuses excess',async t=>{
 const dir=await fixture(t),file=path.join(dir,'global.json'),counter=path.join(dir,'session.json');
 const old=process.env.DSH_EVALUATION_SESSION_BUDGET_FILE;process.env.DSH_EVALUATION_SESSION_BUDGET_FILE=counter;
 try{
  let intercept,dispatches=0;apply({on(event,handler){assert.equal(event,'llm/stream');intercept=handler;}},{budgetFile:file,maxModelRequests:2});
  async function* next(){dispatches++;assert.equal((await state(counter)).requests,dispatches);yield 'offline';}
  for(let i=0;i<2;i++){const values=[];for await(const value of intercept({},next))values.push(value);assert.deepEqual(values,['offline']);}
  await assert.rejects(async()=>{for await(const value of intercept({},next))assert.fail(value);},/REQUEST_LIMIT/);
  assert.equal(dispatches,2);assert.equal((await state(file)).requests,2);assert.equal((await state(counter)).requests,2);
  delete process.env.DSH_EVALUATION_SESSION_BUDGET_FILE;
  const withoutSession=path.join(dir,'without-session.json');
  apply({on(event,handler){intercept=handler;}},{budgetFile:withoutSession,maxModelRequests:1});
  async function* noSessionNext(){yield 'offline without session';}
  for await(const value of intercept({},noSessionNext))assert.equal(value,'offline without session');
  assert.equal((await state(withoutSession)).requests,1);assert.equal((await state(counter)).requests,2);
 }finally{if(old===undefined)delete process.env.DSH_EVALUATION_SESSION_BUDGET_FILE;else process.env.DSH_EVALUATION_SESSION_BUDGET_FILE=old;}
});
