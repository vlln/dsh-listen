import {readdir,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
export async function filesUnder(root){
 const out=[];
 async function visit(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const target=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error(`SYMLINK_NOT_ALLOWED: ${target}`);if(entry.isDirectory())await visit(target);else if(entry.isFile())out.push(target);}}
 await visit(root);return out;
}
export async function checkSources(root,{maxLines=400}={}){
 const files=(await filesUnder(root)).filter(f=>f.endsWith('.mjs'));
 for(const file of files){const text=await readFile(file,'utf8');if(text.split('\n').length>maxLines)throw Error(`FILE_LINE_LIMIT: ${file}`);if(/(?:from\s*|import\s*\()\s*['"][^'"]*(?:\.work|scripts\/spike)/.test(text))throw Error(`FORBIDDEN_IMPORT: ${file}`);}
 return files;
}
export function checkManifest(pkg){
 if(Object.keys(pkg.scripts??{}).some(k=>['preinstall','install','postinstall','prepare'].includes(k)))throw Error('INSTALL_SCRIPT_NOT_ALLOWED');
 if(Object.keys(pkg.dependencies??{}).some(k=>k.startsWith('@deepseek-ai/')||k==='tensorflow'||k==='@tensorflow/tfjs-node'))throw Error('FORBIDDEN_CORE_DEPENDENCY');
 for(const version of Object.values(pkg.dependencies??{}))if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('UNPINNED_DEPENDENCY');
}
export async function checkDependencyBytes(root,limit=5*1024*1024){
 let total=0;for(const file of await filesUnder(root))total+=(await stat(file)).size;if(total>limit)throw Error(`DEPENDENCY_SIZE_LIMIT: ${total} > ${limit}`);return total;
}
export function packedResult(report,name){
 const result=Array.isArray(report)?report.find(x=>x.name===name):report?.[name];
 if(!result||result.name!==name||!Number.isInteger(result.size))throw Error('INVALID_PACK_REPORT');return result;
}
export function checkPackedBytes(bytes,limit=1024*1024){if(!Number.isInteger(bytes)||bytes<0||bytes>limit)throw Error('PACKAGE_SIZE_LIMIT');}
