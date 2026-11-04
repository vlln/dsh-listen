import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import fs from 'node:fs/promises';
const require=createRequire(path.resolve('.work/evaluation-reader/package.json'));
const {asyncBufferFromFile,parquetReadObjects}=await import(pathToFileURL(require.resolve('hyparquet')));const {compressors}=await import(pathToFileURL(require.resolve('hyparquet-compressors')));
const file=await asyncBufferFromFile('.work/mmau-media/test_mini.parquet.partial');
const rows=await parquetReadObjects({file,columns:['other_attributes'],compressors});
const attrs=rows.map(r=>typeof r.other_attributes==='string'?JSON.parse(r.other_attributes):r.other_attributes);
const keys=[...new Set(attrs.flatMap(a=>Object.keys(a)))],domains={};for(const a of attrs){const task=a.task??a.domain??'unknown';domains[task]=(domains[task]??0)+1;}
const summary={rows:attrs.length,attribute_keys:keys,domains,unique_ids:new Set(attrs.map(a=>a.id)).size};await fs.writeFile('.work/mmau-attribute-audit.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
