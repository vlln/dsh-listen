import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {checkManifest,checkSources,checkDependencyBytes} from './gates.mjs';
const pkg=JSON.parse(await readFile('package.json','utf8'));checkManifest(pkg);
let files=[];try{files=await checkSources('src');}catch(e){if(e.code!=='ENOENT')throw e;}
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0)throw Error(`SYNTAX_FAILED: ${file}\n${r.stderr}`);}
const bytes=await checkDependencyBytes('node_modules');
console.log(JSON.stringify({source_files:files.length,dependency_bytes:bytes,limit:5*1024*1024}));
