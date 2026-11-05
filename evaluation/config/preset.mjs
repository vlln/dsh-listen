// Keep the installed minimal reference separate from the shell-free evaluation contract.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
export function minimalPlugins(baseUrl){
 const require=createRequire(process.env.DSH_RUNTIME_ROOT?path.join(process.env.DSH_RUNTIME_ROOT,'package.json'):fs.realpathSync(process.argv[1]));
 const yaml=require('js-yaml');
 const schema=yaml.DEFAULT_SCHEMA.extend(new yaml.Type('tag:yaml.org,2002:js',{kind:'scalar',construct:expr=>Function('process',`return (${expr})`)(process)}));
 const web=path.dirname(require.resolve('@deepseek-ai/dsh-web-app/package.json'));
 const patch=yaml.load(fs.readFileSync(path.join(web,'presets/minimal.patch.yml'),'utf8'),{schema});
 const row=patch.flatMap(operation=>operation.insert??[]).find(row=>row.config?.id==='minimal');
 if(!Array.isArray(row?.config?.plugins))throw Error('INVALID_RUNTIME_MINIMAL_PRESET');
 return row.config.plugins;
}
export function evaluationPlugins(baseUrl,config={},entry='dsh-listen'){
 // Canonical evaluation snapshot: overlays must not restore minimal's shell/persona.
 const require=createRequire(process.env.DSH_RUNTIME_ROOT?path.join(process.env.DSH_RUNTIME_ROOT,'package.json'):fs.realpathSync(process.argv[1]));
 const yaml=require('js-yaml');
 const text=fs.readFileSync(new URL('./preset.patch.yml',import.meta.url),'utf8').replace("!!js dshHomePath('data', 'dsh-listen-evaluation')",'evaluation-scratch');
 const patch=yaml.load(text);
 const plugins=patch.flatMap(operation=>operation.insert??[]).find(row=>row.config?.id==='audio-evaluation')?.config?.plugins;
 if(!Array.isArray(plugins)||plugins.at(-1)?.id!=='audio-listen')throw Error('INVALID_EVALUATION_PRESET');
 return [...plugins.slice(0,-1),{id:'audio-listen',name:entry,config}];
}
