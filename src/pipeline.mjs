import {randomUUID} from 'node:crypto';
import {NUMERIC_FEATURES} from './features.mjs';
import {normalizeRequest} from './request.mjs';
import {EvidenceCache,evidenceKey} from './cache.mjs';
import {decodeAudio} from './decode.mjs';
import {analyzeSignal} from './analysis.mjs';
function extractionFailure(error){
 const raw=error?.message??'',code=/^(?:TIMEOUT|PROCESS_(?:SPAWN_FAILED|OUTPUT_LIMIT|EXIT_\d+)|ASR_(?:OVER_RANGE|REQUEST_LIMIT|TIMEOUT|NETWORK_FAILED|HTTP_\d+|INVALID_[A-Z_]+)|LOCAL_(?:ASR|EVENT)_[A-Z_]+|INVALID_FREQUENCY_RANGE|INVALID_BAND|EMPTY_FREQUENCY_RANGE|AGGREGATE_SAMPLE_LIMIT)$/.test(raw)?raw:'EXTRACTION_FAILED';
 const recovery=code.includes('TIMEOUT')?'Retry a shorter source interval; a component timeout does not mean silence.':code==='ASR_OVER_RANGE'?'PCM exceeds the model input amplitude range; signal evidence remains valid, but this extractor does not silently clip.':code==='PROCESS_SPAWN_FAILED'?'The configured local executable is unavailable; check deployment, not the audio path.':(code.includes('FREQUENCY_RANGE')||code==='INVALID_BAND')?'Choose a visible band within 0 to sample_rate_hz/2, or omit frequency_range_hz.':code==='AGGREGATE_SAMPLE_LIMIT'?'Select a shorter interval to fit the aggregate multichannel sample limit.':'This component could not produce evidence; use available components or inspect a shorter interval. Repeated identical calls may not help.';
 return {code,recovery};
}
export function createPipeline({authorize,decode=decodeAudio,analyze=analyzeSignal,analyzeVersion='signal-v1',extractors={},cache=new EvidenceCache()}={}){
 if(typeof authorize!=='function'||typeof decode!=='function'||typeof analyze!=='function')throw Error('INVALID_PIPELINE');
 if(typeof analyzeVersion!=='string'||!analyzeVersion)throw Error('INVALID_ANALYZER_VERSION');
 for(const [feature,provider] of Object.entries(extractors))if(!['transcript','events'].includes(feature)||!provider||typeof provider.version!=='string'||!provider.version||typeof provider.extract!=='function')throw Error('INVALID_EXTRACTOR_CONFIGURATION');
 return async function inspect(args,context,onlyFeature){
  const request=normalizeRequest(args,onlyFeature);
  if(!context||typeof context.owner!=='string'||!context.owner||!(context.signal instanceof AbortSignal))throw Error('INVALID_CALLER');
  const checkCancel=()=>{if(context.signal.aborted)throw Error('CANCELLED');};checkCancel();
  const propagateCancel=error=>{checkCancel();if(error?.message==='CANCELLED')throw error;};
  // Authorization always precedes cache access, and identity comes from decoded snapshot.
  const source=await authorize(request.source,context);
  let audio;
  try{checkCancel();audio=await decode(source.file,{...source,from:request.from,to:request.to===null?undefined:request.to,signal:context.signal});checkCancel();}finally{if(source.dispose)await source.dispose();}
  const evidence={},pending=[],results=new Map();let hits=0,computed=0,png;
  const failed=error=>({status:'failed',reason:'extraction_failed',error:extractionFailure(error)});
  const accept=(feature,key,result)=>{
   checkCancel();
   if(!result||result.status!=='ready'){
    const error=Error(typeof result?.error==='string'?result.error:result?.error?.code??'INVALID_EXTRACTOR_RESULT');
    propagateCancel(error);results.set(feature,failed(error));return;
   }
   if(feature==='signal_image'&&typeof result.png_base64!=='string'){results.set(feature,failed(Error('INVALID_EXTRACTOR_RESULT')));return;}
   computed++;cache.set(key,result);results.set(feature,result);
  };
  for(const feature of request.features){
   checkCancel();
   const numeric=NUMERIC_FEATURES.includes(feature),provider=numeric?{version:analyzeVersion+'-selective-v1'}:extractors[feature];
   if(!provider){results.set(feature,{status:'unavailable',reason:'not_configured'});continue;}
   try{if(provider.validate)await provider.validate();checkCancel();}catch(error){propagateCancel(error);results.set(feature,{status:'unavailable',reason:'provider_changed'});continue;}
   const parameters=feature==='signal_image'?{detail:request.spectral_detail,frequencyRange:request.frequency_range_hz,channelView:request.channel_view}:feature==='band_energy'?{band:request.dsp_band_hz}:{};
   const key=evidenceKey({owner:context.owner,sourceHash:audio.source.sha256,range:[audio.coverage.from,audio.coverage.to],component:feature,version:provider.version,parameters});
   const cached=cache.get(key);
   if(cached?.status==='ready'){hits++;results.set(feature,cached);continue;}
   if(numeric){pending.push({feature,key});continue;}
   try{accept(feature,key,await provider.extract(audio,{signal:context.signal}));}
   catch(error){propagateCancel(error);results.set(feature,failed(error));}
  }
  if(pending.length){
   checkCancel();
   const features=pending.map(item=>item.feature);
   try{
    const value=await analyze(audio.channels,audio.sampleRate,{signal:context.signal,offset:audio.coverage.from,kind:'features',features,...(features.includes('signal_image')?{detail:request.spectral_detail,...(request.frequency_range_hz?{frequencyRange:request.frequency_range_hz}:{}),channelView:request.channel_view}:{}),...(features.includes('band_energy')?{band:request.dsp_band_hz}:{})});
    checkCancel();
    for(const {feature,key} of pending){
     let result=value?.evidence?.[feature];
     if(feature==='signal_image'&&result?.status==='ready'&&value.png)result={...result,png_base64:value.png.toString('base64')};
     accept(feature,key,result);
    }
   }catch(error){propagateCancel(error);for(const {feature} of pending)results.set(feature,failed(error));}
  }
  checkCancel();
  for(const feature of request.features){
   const result=results.get(feature);
   if(feature==='signal_image'&&result.status==='ready'){png=Buffer.from(result.png_base64,'base64');const {png_base64,...visible}=result;evidence[feature]=visible;}else evidence[feature]=result;
  }
  const available=request.features.filter(f=>evidence[f].status==='ready'),missing=request.features.filter(f=>evidence[f].status!=='ready');
  return {analysis_id:randomUUID(),recipe_version:'v1',status:available.length===request.features.length?'complete':available.length?'partial':'failed',source:audio.source,coverage:audio.coverage,requested_features:request.features,available_features:available,missing_features:missing,evidence,execution:{cache_hits:hits,components_computed:computed},png};
 };
}
