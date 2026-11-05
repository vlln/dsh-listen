import {Worker} from 'node:worker_threads';
import {validatePcm} from './signal.mjs';
import {validateFeatures} from './selective-analysis.mjs';
export async function analyzeSignal(channels,sampleRate,options={}){
 const allowed=new Set(['signal','timeoutMs','offset','columns','detail','frequencyRange','channelView','kind','band','features']);
 for(const key of Object.keys(options))if(!allowed.has(key))throw Error('UNKNOWN_ANALYSIS_PARAMETER');
 if(options.kind!==undefined&&!['signal','dsp','features'].includes(options.kind))throw Error('INVALID_ANALYSIS_KIND');
 if(options.kind==='features')validateFeatures(options.features);
 else if(options.features!==undefined)throw Error('INVALID_ANALYSIS_FEATURES');
 const {signal,timeoutMs=20000,...plotOptions}=options;
 if(signal!==undefined&&!(signal instanceof AbortSignal))throw Error('INVALID_ABORT_SIGNAL');
 if(signal?.aborted)throw Error('CANCELLED');
 validatePcm(channels,sampleRate);
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>180000)throw Error('INVALID_TIMEOUT');
 // Clone only the validated view, never its potentially huge backing store.
 const compact=channels.map(channel=>channel instanceof Float32Array?new Float32Array(channel):new Float64Array(channel));
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./analysis-worker.mjs',import.meta.url),{workerData:{channels:compact,sampleRate,options:plotOptions},transferList:compact.map(channel=>channel.buffer),resourceLimits:{maxOldGenerationSizeMb:256,maxYoungGenerationSizeMb:32}});
  let result,reason;
  const terminate=why=>{if(reason)return;reason=why;void worker.terminate();};
  const abort=()=>terminate('CANCELLED');signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>terminate('TIMEOUT'),timeoutMs);
  worker.on('message',value=>{result=value;});
  worker.on('error',error=>{reason??=error.message;});
  worker.on('exit',code=>{
   clearTimeout(timer);signal?.removeEventListener('abort',abort);
   if(reason)reject(Error(reason));else if(result?.error)reject(Error(result.error));else if(code!==0||!result)reject(Error('ANALYSIS_WORKER_FAILED'));else resolve(result.png?{...result,png:Buffer.from(result.png)}:result);
  });
  if(signal?.aborted)abort();
 });
}
