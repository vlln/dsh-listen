import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export async function resolve(specifier,context,nextResolve){
 if(specifier.startsWith('@deepseek-ai/')&&process.env.DSH_RUNTIME_ROOT){const require=createRequire(path.join(process.env.DSH_RUNTIME_ROOT,'package.json'));return {url:pathToFileURL(require.resolve(specifier)).href,shortCircuit:true};}
 return nextResolve(specifier,context);
}
