import {mkdtemp,writeFile,readFile,unlink,rmdir,realpath,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {encodeAsrWav} from './wav.mjs';
import {runProcess} from './process.mjs';
import {parseAsrResponse} from './asr.mjs';
export async function makeLocalAsrProvider({python,modelDirectory,scratch,timeoutMs=180000}={}){
 if(typeof python!=='string'||typeof modelDirectory!=='string'||typeof scratch!=='string'||!path.isAbsolute(python)||!path.isAbsolute(modelDirectory))throw Error('INVALID_LOCAL_ASR_CONFIG');
 const model=await realpath(modelDirectory),weights=await stat(path.join(model,'weights.safetensors')),config=await stat(path.join(model,'config.json'));
 if(!weights.isFile()||!config.isFile())throw Error('LOCAL_ASR_MODEL_MISSING');
 const fingerprint=async()=>{const w=await stat(path.join(model,'weights.safetensors'));return JSON.stringify({model,size:w.size,mtime:w.mtimeMs,ctime:w.ctimeMs,config:await readFile(path.join(model,'config.json'),'utf8'),runner:await readFile(new URL('./mlx-runner.py',import.meta.url),'utf8'),python});};
 const initial=await fingerprint(),identity=createHash('sha256').update(initial).digest('hex');
 return {version:`mlx-whisper-local-v1:${identity}`,async validate(){if(await fingerprint()!==initial)throw Error('LOCAL_ASR_MODEL_CHANGED');},async extract(audio,{signal}={}){
  if(!(signal instanceof AbortSignal)||signal.aborted)throw Error('CANCELLED');
  const encoded=encodeAsrWav(audio.channels,audio.sampleRate),directory=await mkdtemp(path.join(scratch,'asr-')),input=path.join(directory,'input.wav');
  try{
   await writeFile(input,encoded.bytes,{mode:0o600});
   const output=await runProcess(python,['-B',fileURLToPath(new URL('./mlx-runner.py',import.meta.url)),input,model],{signal,timeoutMs,maxBytes:1024*1024});
   let result;try{result=JSON.parse(output.toString('utf8'));}catch{throw Error('LOCAL_ASR_INVALID_JSON');}
   return {...parseAsrResponse(result,audio.coverage),preprocessing:encoded.metadata,method:'local-mlx-whisper'};
  }finally{await unlink(input).catch(()=>{});await rmdir(directory);}
 }};
}
