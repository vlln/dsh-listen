import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const require=createRequire(path.resolve('.work/evaluation-reader/package.json'));const {asyncBufferFromFile,parquetReadObjects}=await import(pathToFileURL(require.resolve('hyparquet')));const {compressors}=await import(pathToFileURL(require.resolve('hyparquet-compressors')));
const selection=JSON.parse(await fs.readFile('.work/mmau-prepared/preview-selection.json'));await fs.mkdir('.work/mmau-preview/audio',{recursive:true});const file=await asyncBufferFromFile('.work/mmau-media/test_mini.parquet.partial'),manifest=[];
for(const selected of selection){
 const [row]=await parquetReadObjects({file,columns:['context'],utf8:false,rowStart:selected.physical_row,rowEnd:selected.physical_row+1,compressors});
 const bytes=row.context?.bytes;if(!(bytes instanceof Uint8Array)||bytes.length>256*1024*1024)throw Error('INVALID_AUDIO_BYTES');
 const name=`${selected.id}.media`,output=path.join('.work/mmau-preview/audio',name);await fs.writeFile(output,bytes,{mode:0o600});manifest.push({...selected,path:output,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await fs.writeFile('.work/mmau-preview/manifest.json',JSON.stringify(manifest,null,2));console.log(JSON.stringify({development_only:true,samples:manifest.length,bytes:manifest.reduce((n,r)=>n+r.bytes,0),domains:manifest.map(r=>r.domain)}));
