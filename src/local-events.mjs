import {mkdtemp,writeFile,unlink,rmdir,readFile,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import path from 'node:path';
import {runProcess} from './process.mjs';import {encodeAsrWav} from './wav.mjs';import {eventEvidence} from './events.mjs';
export async function makeLocalEventProvider({python,modelPath,scratch,timeoutMs=20000}={}){
 if(typeof python!=='string'||!path.isAbsolute(python)||typeof modelPath!=='string'||!path.isAbsolute(modelPath)||typeof scratch!=='string')throw Error('INVALID_LOCAL_EVENT_CONFIG');
 const model=await realpath(modelPath),bytes=await readFile(model);if(bytes.length>16*1024*1024)throw Error('LOCAL_EVENT_MODEL_LIMIT');
 const fingerprint=createHash('sha256').update(bytes).digest('hex');
 return {version:`yamnet-litert-v1:${fingerprint}`,async validate(){if(createHash('sha256').update(await readFile(model)).digest('hex')!==fingerprint)throw Error('LOCAL_EVENT_MODEL_CHANGED');},async extract(audio,{signal}={}){
  if(!(signal instanceof AbortSignal)||signal.aborted)throw Error('CANCELLED');
  if(audio.sampleRate!==16000)throw Error('EVENT_REQUIRES_16000');
  const encoded=encodeAsrWav(audio.channels,audio.sampleRate),dir=await mkdtemp(path.join(scratch,'event-')),input=path.join(dir,'input.wav');
  try{
   await writeFile(input,encoded.bytes,{mode:0o600});
   const response=await runProcess(python,['-B',fileURLToPath(new URL('./event-runner.py',import.meta.url)),input,model],{signal,timeoutMs,maxBytes:4*1024*1024});
   let data;try{data=JSON.parse(response.toString('utf8'));}catch{throw Error('LOCAL_EVENT_INVALID_JSON');}
   return {...eventEvidence({...data,coverage:audio.coverage,modelVersion:fingerprint}),preprocessing:encoded.metadata,window_samples:data.window_samples,hop_samples:data.hop_samples,window_padding:data.windows.map(w=>w.padded_samples)};
  }finally{await unlink(input).catch(()=>{});await rmdir(dir);}
 }};
}
