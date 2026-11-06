import {readdir,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
export async function filesUnder(root){
 const out=[];
 async function visit(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const target=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error(`SYMLINK_NOT_ALLOWED: ${target}`);if(entry.isDirectory())await visit(target);else if(entry.isFile())out.push(target);}}
 await visit(root);return out;
}
export async function checkSources(root,{maxLines=400}={}){
 const files=(await filesUnder(root)).filter(f=>f.endsWith('.mjs'));
 for(const file of files){const text=await readFile(file,'utf8');if(text.split('\n').length>maxLines)throw Error(`FILE_LINE_LIMIT: ${file}`);if(/(?:from\s*|import\s*(?:\(\s*)?)\s*['"][^'"]*(?:\.work|scripts\/spike)/.test(text))throw Error(`FORBIDDEN_IMPORT: ${file}`);}
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
// Installable-bundle contract: what `dsh plugin add` and the Plugins page actually read.
export async function checkBundle(pkg,root='.'){
 const patch=pkg.dsh?.bundle?.patch;if(typeof patch!=='string'||!patch)throw Error('BUNDLE_PATCH_MISSING');
 const packed=new Set(pkg.files??[]);for(const required of ['src',patch.replace(/^\.\//,''),pkg.icon?.replace(/^\.\//,''),'locale'])if(required&&!packed.has(required))throw Error(`BUNDLE_FILES_MISSING: ${required}`);
 if(pkg.exports?.['./package.json']!=='./package.json')throw Error('BUNDLE_PACKAGE_EXPORT_MISSING');
 if(pkg.exports?.['./locale/*.json']!=='./locale/*.json')throw Error('BUNDLE_LOCALE_EXPORT_MISSING');
 if(typeof pkg.engines?.dsh!=='string'||!pkg.engines.dsh.trim())throw Error('BUNDLE_ENGINES_DSH_MISSING');
 const icon=pkg.icon;if(typeof icon!=='string'||!icon)throw Error('BUNDLE_ICON_MISSING');
 const target=path.resolve(root,icon),inside=path.relative(path.resolve(root),target);
 if(inside.startsWith('..')||path.isAbsolute(inside))throw Error('BUNDLE_ICON_OUTSIDE_PACKAGE');
 if(!/\.(svg|png|jpe?g|webp)$/i.test(icon))throw Error('BUNDLE_ICON_FORMAT');
 const info=await stat(target);if(info.size>256*1024)throw Error('BUNDLE_ICON_TOO_LARGE');
 if(icon.endsWith('.svg')){const text=await readFile(target,'utf8');if(!/^<svg[\s>]/.test(text.trim())||/<script|<image|xlink:href=|href="https?:/.test(text)||/currentColor/.test(text))throw Error('BUNDLE_ICON_NOT_SELF_CONTAINED');}
 const patchText=await readFile(path.resolve(root,patch),'utf8'),namePattern=new RegExp(`name:\\s*['\"]?${pkg.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}['\"]?`);if(!namePattern.test(patchText))throw Error('BUNDLE_PATCH_NAME_MISMATCH');
 for(const locale of ['locale/en.json','locale/zh.json']){const data=JSON.parse(await readFile(path.resolve(root,locale),'utf8'));if(typeof data?.meta?.title!=='string'||!data.meta.title)throw Error(`BUNDLE_LOCALE_TITLE: ${locale}`);}
 return {patch,icon:info.size};
}
