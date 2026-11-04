import {Worker} from 'node:worker_threads';
import {validatePcm} from './signal.mjs';
export async function analyzeSignal(channels,sampleRate,options={}){
 const allowed=new Set(['signal','timeoutMs','offset','columns','detail','frequencyRange','channelView']);
 for(const key of Object.keys(options))if(!allowed.has(key))throw Error('UNKNOWN_ANALYSIS_PARAMETER');
 const {signal,timeoutMs=20000,...plotOptions}=options;
 if(signal?.aborted)throw Error('CANCELLED');
 validatePcm(channels,sampleRate);
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>180000)throw Error('INVALID_TIMEOUT');
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./analysis-worker.mjs',import.meta.url),{workerData:{channels,sampleRate,options:plotOptions},resourceLimits:{maxOldGenerationSizeMb:256,maxYoungGenerationSizeMb:32}});
  let result,reason;
  const terminate=why=>{if(reason)return;reason=why;void worker.terminate();};
  const abort=()=>terminate('CANCELLED');signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>terminate('TIMEOUT'),timeoutMs);
  worker.on('message',value=>{result=value;});
  worker.on('error',error=>{reason??=error.message;});
  worker.on('exit',code=>{
   clearTimeout(timer);signal?.removeEventListener('abort',abort);
   if(reason)reject(Error(reason));else if(result?.error)reject(Error(result.error));else if(code!==0||!result)reject(Error('ANALYSIS_WORKER_FAILED'));else resolve({...result,png:Buffer.from(result.png)});
  });
  if(signal?.aborted)abort();
 });
}
