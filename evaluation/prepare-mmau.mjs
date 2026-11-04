import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import fs from 'node:fs/promises';import {prepareEvaluation} from './protocol.mjs';
const require=createRequire(path.resolve('.work/evaluation-reader/package.json'));const {asyncBufferFromFile,parquetReadObjects}=await import(pathToFileURL(require.resolve('hyparquet')));const {compressors}=await import(pathToFileURL(require.resolve('hyparquet-compressors')));
const file=await asyncBufferFromFile('.work/mmau-media/test_mini.parquet.partial');
const rows=await parquetReadObjects({file,columns:['instruction','choices','answer','other_attributes'],compressors});
const officialEnvelope=JSON.parse(await fs.readFile('.work/metadata/mmau-annotations-api.json'));const official=new Map(JSON.parse(Buffer.from(officialEnvelope.content,'base64')).map(r=>[r.id,r]));
let textMismatch=0;
const samples=rows.map((r,index)=>{const a=JSON.parse(r.other_attributes),o=official.get(a.id);if(!o)throw Error('UNKNOWN_MEDIA_ID');if(o.question!==r.instruction||JSON.stringify(o.choices)!==JSON.stringify(r.choices)||o.answer!==r.answer)textMismatch++;return {...a,audio_id:o.audio_id,question:o.question,choices:o.choices,answer:o.answer,physical_row:index};});
const prepared=prepareEvaluation(samples,{seed:'dsh-listen-v1',developmentPerDomain:10});
const directory='.work/mmau-prepared';await fs.mkdir(directory,{recursive:true,mode:0o700});
await fs.writeFile(`${directory}/agent.json`,JSON.stringify(prepared.agent));await fs.writeFile(`${directory}/keys.json`,JSON.stringify(prepared.keys),{mode:0o600});await fs.writeFile(`${directory}/split.json`,JSON.stringify({seed:prepared.seed,development_ids:prepared.development_ids,test_ids:prepared.test_ids}));
const dev=new Set(prepared.development_ids),selected=[];for(const domain of ['sound','speech','music']){const row=samples.find(r=>r.task===domain&&dev.has(r.id));if(!row)throw Error('MISSING_DEVELOPMENT_DOMAIN');selected.push({id:row.id,domain,physical_row:row.physical_row});}
await fs.writeFile(`${directory}/preview-selection.json`,JSON.stringify(selected,null,2));console.log(JSON.stringify({rows:rows.length,development:prepared.development_ids.length,sealed:prepared.test_ids.length,text_mismatch_against_github:textMismatch,preview_domains:selected.map(r=>r.domain)}));
