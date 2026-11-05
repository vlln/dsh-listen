import {FEATURES,NUMERIC_FEATURES} from './features.mjs';
const DISPLAY=['spectral_detail','frequency_range_hz','channel_view'];
export function normalizeRequest(args,onlyFeature){
 if(!args||typeof args!=='object'||Array.isArray(args))throw Error('INVALID_REQUEST');
 if(onlyFeature!==undefined&&onlyFeature!=='numeric'&&!FEATURES.includes(onlyFeature))throw Error('INVALID_TOOL_FEATURE');
 const fixed=onlyFeature&&onlyFeature!=='numeric';
 const allowed=new Set(['source_path','attachment_id','from','to',...DISPLAY,'dsp_band_hz',...(fixed?[]:['features'])]);
 for(const name of Object.keys(args))if(!allowed.has(name))throw Error(`UNKNOWN_PARAMETER: ${name}`);
 const pathSet=typeof args.source_path==='string'&&args.source_path.length>0,attachmentSet=typeof args.attachment_id==='string'&&args.attachment_id.length>0;
 if(pathSet===attachmentSet||('source_path'in args&&!pathSet)||('attachment_id'in args&&!attachmentSet))throw Error('INVALID_SOURCE: provide exactly one nonempty source_path or attachment_id; use the supplied audio path for local files.');
 const features=fixed?[onlyFeature]:args.features;
 const available=onlyFeature==='numeric'?NUMERIC_FEATURES.filter(x=>x!=='signal_image'):FEATURES;
 if(!Array.isArray(features)||!features.length||features.some(x=>!available.includes(x))||new Set(features).size!==features.length)throw Error('INVALID_FEATURES');
 if(DISPLAY.some(k=>k in args&&args[k]===null))throw Error('INVALID_NULL_PARAMETER');
 if(('from'in args&&args.from===null)||('to'in args&&args.to===null)||('features'in args&&args.features===null))throw Error('INVALID_NULL_PARAMETER');
 const from=args.from??0,to=args.to??null;
 if(!Number.isFinite(from)||from<0||(to!==null&&(!Number.isFinite(to)||to<=from)))throw Error('INVALID_RANGE');
 if(!features.includes('signal_image')&&DISPLAY.some(k=>k in args))throw Error('PARAMETER_NOT_APPLICABLE: spectral_detail, frequency_range_hz and channel_view require signal_image in features.');
 if(features.includes('band_energy')&&!('dsp_band_hz'in args))throw Error('BAND_REQUIRED: band_energy requires dsp_band_hz.');
 if('dsp_band_hz'in args){
  if(!features.includes('band_energy'))throw Error('PARAMETER_NOT_APPLICABLE: dsp_band_hz requires band_energy in features.');
  if(!Array.isArray(args.dsp_band_hz)||args.dsp_band_hz.length!==2||args.dsp_band_hz.some(x=>!Number.isFinite(x))||args.dsp_band_hz[0]<0||args.dsp_band_hz[1]<=args.dsp_band_hz[0])throw Error('INVALID_FREQUENCY_RANGE');
 }
  const detail=args.spectral_detail??'balanced',view=args.channel_view??'separate',band=args.frequency_range_hz??null;
 if(!['transient','balanced','tonal'].includes(detail)||!['separate','power_mean'].includes(view))throw Error('INVALID_DISPLAY_PARAMETERS');
 if(band!==null&&(!Array.isArray(band)||band.length!==2||band.some(x=>!Number.isFinite(x))||band[0]<0||band[1]<=band[0]))throw Error('INVALID_FREQUENCY_RANGE');
 return {source:pathSet?{kind:'path',value:args.source_path}:{kind:'attachment',value:args.attachment_id},from,to,features:[...features],...('dsp_band_hz'in args?{dsp_band_hz:[...args.dsp_band_hz]}:{}),spectral_detail:detail,frequency_range_hz:band===null?null:[...band],channel_view:view};
}
