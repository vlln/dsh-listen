import {createHash} from 'node:crypto';
import {encodeAsrWav} from './wav.mjs';
function parseResponse(data,coverage){
 if(!data||typeof data.text!=='string'||data.text.length>100000)throw Error('ASR_INVALID_SCHEMA');
 const segments=[];
 if(data.segments!==undefined){
  if(!Array.isArray(data.segments)||data.segments.length>10000)throw Error('ASR_INVALID_SEGMENTS');
  for(const s of data.segments){if(typeof s.text!=='string'||!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<0||s.end<s.start||s.end>coverage.to-coverage.from+1e-3)throw Error('ASR_INVALID_TIMESTAMPS');segments.push({text:s.text,from:coverage.from+s.start,to:coverage.from+s.end,timing:'estimated'});}
 }
 return {status:'ready',text:data.text,language:typeof data.language==='string'?data.language:null,segments,timing:segments.length?'estimated':'unavailable',coverage,limitations:['ASR text may hallucinate in music or noise; absence of text is not absence of speech.','Segment timestamps are estimated, not forced alignment.']};
}
export function makeAsrProvider({endpoint,model,allowExternal=false,secretProvider,timeoutMs=20000,maxResponseBytes=1024*1024}={}){
 let url;try{url=new URL(endpoint);}catch{throw Error('ASR_INVALID_ENDPOINT');}
 const local=['127.0.0.1','[::1]','localhost'].includes(url.hostname);
 if(url.username||url.password||url.hash||url.search||(!local&&!allowExternal)||(!['https:'].includes(url.protocol)&&!(local&&url.protocol==='http:')))throw Error('ASR_ENDPOINT_NOT_AUTHORIZED');
 if(typeof model!=='string'||!model||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>180000||!Number.isInteger(maxResponseBytes)||maxResponseBytes<1||maxResponseBytes>4*1024*1024||(secretProvider!==undefined&&typeof secretProvider!=='function'))throw Error('ASR_INVALID_CONFIGURATION');
 const identity=createHash('sha256').update(JSON.stringify({endpoint:url.href,model,response:'verbose_json',native_rate:true})).digest('hex');
 return {version:`asr-api-v1:${identity}`,async extract(audio,{signal}={}){
  if(!(signal instanceof AbortSignal)||!Number.isFinite(audio?.coverage?.from)||!Number.isFinite(audio?.coverage?.to))throw Error('INVALID_ASR_CONTEXT');
  if(signal.aborted)throw Error('CANCELLED');
  const encoded=encodeAsrWav(audio.channels,audio.sampleRate);if(encoded.bytes.length>20*1024*1024)throw Error('ASR_REQUEST_LIMIT');
  const controller=new AbortController();let reason;
  const abort=()=>{reason='CANCELLED';controller.abort();};signal.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>{reason='ASR_TIMEOUT';controller.abort();},timeoutMs);
  try{
   let key=null;
   if(secretProvider){
    const pending=Promise.resolve().then(()=>secretProvider({signal:controller.signal}));
    let onAbort;
    const interrupted=new Promise((_,reject)=>{onAbort=()=>reject(Error(reason??'CANCELLED'));controller.signal.addEventListener('abort',onAbort,{once:true});if(controller.signal.aborted)onAbort();});
    try{key=await Promise.race([pending,interrupted]);}finally{controller.signal.removeEventListener('abort',onAbort);}
   }
   if(signal.aborted)throw Error('CANCELLED');
   const form=new FormData();form.append('file',new Blob([encoded.bytes],{type:'audio/wav'}),'audio.wav');form.append('model',model);form.append('response_format','verbose_json');
   let response;try{response=await fetch(url,{method:'POST',body:form,headers:key?{Authorization:`Bearer ${key}`}:{},signal:controller.signal,redirect:'error'});}catch{throw Error('ASR_NETWORK_FAILED');}
   if(!response.ok){await response.body?.cancel();throw Error(`ASR_HTTP_${response.status}`);}
   const reader=response.body.getReader(),chunks=[];let size=0;
   try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maxResponseBytes){await reader.cancel();throw Error('ASR_RESPONSE_LIMIT');}chunks.push(value);}}finally{reader.releaseLock();}
   let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Error('ASR_INVALID_JSON');}
   if(signal.aborted)throw Error('CANCELLED');
   return {...parseResponse(data,audio.coverage),preprocessing:encoded.metadata};
  }catch(error){if(reason)throw Error(reason);if(error.message?.startsWith('ASR_')||error.message==='CANCELLED')throw error;throw Error('ASR_RESPONSE_FAILED');}
  finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
 }};
}
