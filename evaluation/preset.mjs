// Build from the installed runtime's actual minimal definition, not an allowlist.
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
 return [...minimalPlugins(baseUrl),{id:'audio-listen',name:entry,config}];
}
