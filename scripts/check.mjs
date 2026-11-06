import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {checkManifest,checkBundle,checkSources,checkDependencyBytes,checkPackedBytes,packedResult} from './gates.mjs';
const pkg=JSON.parse(await readFile('package.json','utf8'));checkManifest(pkg);const bundle=await checkBundle(pkg,'.');
let files=[];try{files=await checkSources('src');}catch(e){if(e.code!=='ENOENT')throw e;}
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0)throw Error(`SYNTAX_FAILED: ${file}\n${r.stderr}`);}
const bytes=await checkDependencyBytes('node_modules');
const pack=spawnSync(process.env.npm_execpath?process.execPath:'npm',process.env.npm_execpath?[process.env.npm_execpath,'pack','--dry-run','--json','--ignore-scripts']:['pack','--dry-run','--json','--ignore-scripts'],{encoding:'utf8',env:{...process.env,npm_config_cache:'.work/npm-cache'}});
if(pack.status!==0)throw Error(`PACK_CHECK_FAILED: ${pack.stderr}`);
const packed=packedResult(JSON.parse(pack.stdout),pkg.name);checkPackedBytes(packed.size);
console.log(JSON.stringify({bundle_icon_bytes:bundle.icon,source_files:files.length,dependency_bytes:bytes,dependency_limit:5*1024*1024,package_bytes:packed.size,package_limit:1024*1024}));
