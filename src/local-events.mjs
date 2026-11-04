import {mkdtemp,writeFile,unlink,rmdir,realpath,open} from 'node:fs/promises';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import path from 'node:path';
import {runProcess} from './process.mjs';import {encodeAsrWav} from './wav.mjs';import {eventEvidence} from './events.mjs';
async function modelBytes(file){const handle=await open(file,'r');try{const info=await handle.stat();if(!info.isFile()||info.size>16*1024*1024)throw Error('LOCAL_EVENT_MODEL_LIMIT');const bytes=Buffer.alloc(info.size+1);let n=0;for(;;){const r=await handle.read(bytes,n,bytes.length-n,n);n+=r.bytesRead;if(n>info.size)throw Error('LOCAL_EVENT_MODEL_CHANGED');if(!r.bytesRead)break;}return bytes.subarray(0,n);}finally{await handle.close();}}
export async function makeLocalEventProvider({python,modelPath,scratch,timeoutMs=20000,ffmpeg='ffmpeg'}={}){
 if(typeof python!=='string'||!path.isAbsolute(python)||typeof modelPath!=='string'||!path.isAbsolute(modelPath)||typeof scratch!=='string')throw Error('INVALID_LOCAL_EVENT_CONFIG');
 const model=await realpath(modelPath),bytes=await modelBytes(model);
 const fingerprint=createHash('sha256').update(bytes).digest('hex');
 return {version:`yamnet-litert-v1:${fingerprint}`,async validate(){if(createHash('sha256').update(await modelBytes(model)).digest('hex')!==fingerprint)throw Error('LOCAL_EVENT_MODEL_CHANGED');},async extract(audio,{signal}={}){
  if(!(signal instanceof AbortSignal)||signal.aborted)throw Error('CANCELLED');
  const encoded=encodeAsrWav(audio.channels,audio.sampleRate),dir=await mkdtemp(path.join(scratch,'event-')),input=path.join(dir,'input.wav');
  try{
   await writeFile(input,encoded.bytes,{mode:0o600});
   let modelInput=input;
   if(audio.sampleRate!==16000){modelInput=path.join(dir,'resampled.wav');await runProcess(ffmpeg,['-nostdin','-v','error','-protocol_whitelist','file,pipe','-format_whitelist','wav','-i',input,'-ar','16000','-ac','1','-c:a','pcm_s16le',modelInput],{signal,timeoutMs,maxBytes:1024});}
   const response=await runProcess(python,['-B',fileURLToPath(new URL('./event-runner.py',import.meta.url)),modelInput,model],{signal,timeoutMs,maxBytes:4*1024*1024});
   let data;try{data=JSON.parse(response.toString('utf8'));}catch{throw Error('LOCAL_EVENT_INVALID_JSON');}
   const duration=audio.coverage.to-audio.coverage.from;
   for(const window of data.windows){if(window.to>duration+1/16000+1e-9)throw Error('LOCAL_EVENT_TIME_MISMATCH');window.to=Math.min(window.to,duration);}
   return {...eventEvidence({...data,coverage:audio.coverage,modelVersion:fingerprint}),preprocessing:{...encoded.metadata,input_sample_rate_hz:audio.sampleRate,sample_rate_hz:16000,resampled:audio.sampleRate!==16000,resampler:audio.sampleRate!==16000?'ffmpeg-default-swr':null},window_samples:data.window_samples,hop_samples:data.hop_samples,window_padding:data.windows.map(w=>w.padded_samples)};
  }finally{await unlink(input).catch(()=>{});await unlink(path.join(dir,'resampled.wav')).catch(()=>{});await rmdir(dir);}
 }};
}
