import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRun} from '../../evaluation/create-run.mjs';

test('creating a run references existing home and inputs without copying media or installing',async()=>{
  const base=path.resolve('.work/create-run-tests');await fs.mkdir(base,{recursive:true});const root=await fs.mkdtemp(path.join(base,'case-'));
  try{
    const home=path.join(root,'home'),manifestPath=path.join(root,'manifest.json'),overlayPath=path.join(root,'overlay.yml');await fs.mkdir(home);
    const manifest={samples:[{id:'one',workspace:'shared/one'}]};await fs.writeFile(manifestPath,JSON.stringify(manifest));await fs.writeFile(overlayPath,'[]\n');
    const input={manifestPath,dshHome:home,overlayPath,runsDirectory:path.join(root,'runs')};
    const run=await createRun(input),r=JSON.parse(await fs.readFile(path.join(run,'run.json')));
    assert.equal(r.dsh_home,home);assert.equal(Object.hasOwn(r,'max_model_requests'),false);assert.equal(r.session_timeout_ms,600000);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(run,'manifest.json'))),manifest);
    assert.deepEqual((await fs.readdir(run)).sort(),['manifest.json','run.json']);assert.deepEqual(await fs.readdir(home),[]);assert.notEqual(await createRun(input),run);
    const cli=fileURLToPath(new URL('../../evaluation/create-run.mjs',import.meta.url));
    const cliRun=execFileSync(process.execPath,[cli,manifestPath,home,overlayPath],{encoding:'utf8'}).trim();
    assert.equal(JSON.parse(await fs.readFile(path.join(cliRun,'run.json'),'utf8')).status,'prepared');
    assert.deepEqual((await fs.readdir(cliRun)).sort(),['manifest.json','run.json']);
    assert.ok(path.resolve(cliRun).startsWith(path.resolve('.work/evaluation/runs')+path.sep));await fs.rm(cliRun,{recursive:true,force:true});
    assert.throws(()=>execFileSync(process.execPath,[cli,manifestPath,home,overlayPath,'19'],{encoding:'utf8',stdio:'pipe'}),error=>error.status===1&&/Usage:/.test(error.stderr));
  }finally{assert.equal(path.dirname(root),base);assert.ok(path.basename(root).startsWith('case-'));await fs.rm(root,{recursive:true,force:true});}
});
