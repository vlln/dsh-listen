import {randomUUID} from 'node:crypto';
import {normalizeRequest} from './request.mjs';
import {EvidenceCache,evidenceKey} from './cache.mjs';
import {decodeAudio} from './decode.mjs';
import {analyzeSignal} from './analysis.mjs';
export function createPipeline({authorize,decode=decodeAudio,analyze=analyzeSignal,analyzeVersion='signal-v1',extractors={},cache=new EvidenceCache()}={}){
 if(typeof authorize!=='function'||typeof decode!=='function'||typeof analyze!=='function')throw Error('INVALID_PIPELINE');
 if(typeof analyzeVersion!=='string'||!analyzeVersion)throw Error('INVALID_ANALYZER_VERSION');
 for(const [feature,provider] of Object.entries(extractors))if(!['transcript','events'].includes(feature)||!provider||typeof provider.version!=='string'||!provider.version||typeof provider.extract!=='function')throw Error('INVALID_EXTRACTOR_CONFIGURATION');
 return async function inspect(args,context,onlyFeature){
  const request=normalizeRequest(args,onlyFeature);
  if(!context||typeof context.owner!=='string'||!context.owner||!(context.signal instanceof AbortSignal))throw Error('INVALID_CALLER');
  const checkCancel=()=>{if(context.signal.aborted)throw Error('CANCELLED');};checkCancel();
  // Authorization always precedes cache access, and identity comes from decoded snapshot.
  const source=await authorize(request.source,context);checkCancel();
  const audio=await decode(source.file,{...source,from:request.from,to:request.to===null?undefined:request.to,signal:context.signal});checkCancel();
  const evidence={},missing=[];let hits=0,computed=0,png;
  for(const feature of request.features){
   checkCancel();
   const provider=feature==='signal'?{version:analyzeVersion}:extractors[feature];
   if(!provider){evidence[feature]={status:'unavailable',reason:'not_configured'};missing.push(feature);continue;}
   const parameters=feature==='signal'?{detail:request.spectral_detail,frequencyRange:request.frequency_range_hz,channelView:request.channel_view}:{};
   const key=evidenceKey({owner:context.owner,sourceHash:audio.source.sha256,range:[audio.coverage.from,audio.coverage.to],component:feature,version:provider.version,parameters});
   let result=cache.get(key);
   if(result){hits++;}else{
    try{
     if(feature==='signal'){
      const value=await analyze(audio.channels,audio.sampleRate,{signal:context.signal,offset:audio.coverage.from,detail:request.spectral_detail,...(request.frequency_range_hz?{frequencyRange:request.frequency_range_hz}:{}),channelView:request.channel_view});
      result={status:'ready',statistics:value.statistics,plot:value.plot,image:value.image,png_base64:value.png.toString('base64')};
     }else result=await provider.extract(audio,{signal:context.signal});
     checkCancel();
     if(!result||result.status!=='ready')throw Error('INVALID_EXTRACTOR_RESULT');
     computed++;cache.set(key,result);
    }catch(error){checkCancel();evidence[feature]={status:'failed',reason:'extraction_failed'};missing.push(feature);continue;}
   }
   if(feature==='signal'){png=Buffer.from(result.png_base64,'base64');const {png_base64,...visible}=result;evidence[feature]=visible;}else evidence[feature]=result;
  }
  checkCancel();
  const available=request.features.filter(f=>!missing.includes(f));
  return {analysis_id:randomUUID(),recipe_version:'v1',status:available.length===request.features.length?'complete':available.length?'partial':'failed',source:audio.source,coverage:audio.coverage,requested_parameters:request,requested_features:request.features,available_features:available,missing_features:missing,evidence,execution:{cache_hits:hits,components_computed:computed},png};
 };
}
