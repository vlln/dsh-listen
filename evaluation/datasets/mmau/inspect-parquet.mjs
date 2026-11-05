import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import {stat,writeFile} from 'node:fs/promises';
const require=createRequire(path.resolve('.work/evaluation-reader/package.json'));
const {asyncBufferFromFile,parquetMetadataAsync,parquetSchema}=await import(pathToFileURL(require.resolve('hyparquet')));
const input=process.argv[2];if(!input)throw Error('PARQUET_PATH_REQUIRED');
const info=await stat(input);if(info.size!==1213407227)throw Error('MEDIA_NOT_COMPLETE');
const file=await asyncBufferFromFile(input),metadata=await parquetMetadataAsync(file),schema=parquetSchema(metadata);
const summary={rows:Number(metadata.num_rows),columns:schema.children.map(c=>c.element.name),row_groups:metadata.row_groups.length,schema:metadata.schema.map(c=>({name:c.name,type:c.type,converted_type:c.converted_type,num_children:c.num_children}))};
await writeFile('.work/mmau-parquet-schema.json',JSON.stringify(summary,null,2));console.log(JSON.stringify({rows:summary.rows,columns:summary.columns,row_groups:summary.row_groups}));
