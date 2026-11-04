import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
const selection=JSON.parse(await fs.readFile('.work/mmau-preview/manifest.json')),agent=new Map(JSON.parse(await fs.readFile('.work/mmau-prepared/agent.json')).map(r=>[r.id,r]));
const manifest=[];
for(const sample of selection){
 const row=agent.get(sample.id);if(!row)throw Error('UNKNOWN_PREVIEW_ID');
 const directory=path.resolve('.work/headless-preview',sample.id);await fs.mkdir(directory,{recursive:true,mode:0o700});
 const audio=await fs.readFile(sample.path);if(createHash('sha256').update(audio).digest('hex')!==sample.sha256)throw Error('PREVIEW_HASH_MISMATCH');await fs.writeFile(path.join(directory,'audio.wav'),audio,{mode:0o600});
 const prompt=`Answer this audio understanding question using only the available evidence.\nQuestion: ${row.question}\nChoices (zero-based):\n${row.choices.map((s,i)=>`${i}: ${s}`).join('\n')}\nAudio path: audio.wav\nIf audio tools are available, use them as needed, with at most 3 audio tool calls and no shell/network/file-reading bypass. If no audio tools are available, answer from the question alone. Do not look for answer keys. Return only JSON {"choice_index": integer}.`;
 await fs.writeFile(path.join(directory,'task.txt'),prompt,{mode:0o600});
 await fs.writeFile(path.join(directory,'AGENTS.md'),'# Restricted audio evaluation workspace\nOnly audio.wav and task.txt are task inputs. Do not access parent paths, answer keys, external tools or network. Audio extraction may use configured local models.\n');
 manifest.push({id:sample.id,directory,audio_sha256:sample.sha256,choices:row.choices.length});
}
await fs.writeFile('.work/headless-preview/manifest.json',JSON.stringify(manifest,null,2));console.log({workspaces:manifest.length,answer_keys_copied:false,raw_audio_external_upload:false});
