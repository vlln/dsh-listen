import {register} from 'node:module';
if(process.env.DSH_RUNTIME_ROOT)register('./runtime-loader.mjs',import.meta.url);
