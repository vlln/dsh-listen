import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {formatTask,taskProtocol} from '../lib/headless-adapter.mjs';
const selection=JSON.parse(await fs.readFile('.work/mmau-preview/manifest.json')),agent=new Map(JSON.parse(await fs.readFile('.work/mmau-prepared/agent.json')).map(r=>[r.id,r]));
const manifest=[];
for(const sample of selection){
 const row=agent.get(sample.id);if(!row)throw Error('UNKNOWN_PREVIEW_ID');
 const directory=path.resolve('.work/headless-preview',sample.id);await fs.mkdir(directory,{recursive:true,mode:0o700});
 const audio=await fs.readFile(sample.path);if(createHash('sha256').update(audio).digest('hex')!==sample.sha256)throw Error('PREVIEW_HASH_MISMATCH');await fs.writeFile(path.join(directory,'audio.wav'),audio,{mode:0o600});
 const prompt=formatTask(row);
 await fs.writeFile(path.join(directory,'task.txt'),prompt,{mode:0o600});
 await fs.writeFile(path.join(directory,'AGENTS.md'),'# Restricted audio evaluation workspace\nOnly audio.wav and task.txt are task inputs. Do not access parent paths, answer keys, external tools or network. Audio extraction may use configured local models.\n');
 manifest.push({id:sample.id,directory,audio_sha256:sample.sha256,choices:row.choices.length,task_protocol:taskProtocol,task_sha256:createHash('sha256').update(prompt).digest('hex')});
}
await fs.writeFile('.work/headless-preview/manifest.json',JSON.stringify(manifest,null,2));console.log({workspaces:manifest.length,answer_keys_copied:false,raw_audio_external_upload:false});
