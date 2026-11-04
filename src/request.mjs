const FEATURES=['signal','transcript','events'];
const DISPLAY=['spectral_detail','frequency_range_hz','channel_view'];
export function normalizeRequest(args,onlyFeature){
 if(!args||typeof args!=='object'||Array.isArray(args))throw Error('INVALID_REQUEST');
 if(onlyFeature!==undefined&&!FEATURES.includes(onlyFeature))throw Error('INVALID_TOOL_FEATURE');
 const allowed=new Set(['source_path','attachment_id','from','to',...DISPLAY,...(onlyFeature?[]:['features'])]);
 for(const name of Object.keys(args))if(!allowed.has(name))throw Error(`UNKNOWN_PARAMETER: ${name}`);
 const pathSet=typeof args.source_path==='string'&&args.source_path.length>0,attachmentSet=typeof args.attachment_id==='string'&&args.attachment_id.length>0;
 if(pathSet===attachmentSet||('source_path'in args&&!pathSet)||('attachment_id'in args&&!attachmentSet))throw Error('INVALID_SOURCE');
 const features=onlyFeature?[onlyFeature]:(args.features??FEATURES);
 if(!Array.isArray(features)||!features.length||features.some(x=>!FEATURES.includes(x))||new Set(features).size!==features.length)throw Error('INVALID_FEATURES');
 if(DISPLAY.some(k=>k in args&&args[k]===null))throw Error('INVALID_NULL_PARAMETER');
 if(('from'in args&&args.from===null)||('to'in args&&args.to===null)||('features'in args&&args.features===null))throw Error('INVALID_NULL_PARAMETER');
 const from=args.from??0,to=args.to??null;
 if(!Number.isFinite(from)||from<0||(to!==null&&(!Number.isFinite(to)||to<=from)))throw Error('INVALID_RANGE');
 if(to!==null&&to-from>60)throw Error('RANGE_TOO_LARGE');
 if(!features.includes('signal')&&DISPLAY.some(k=>k in args))throw Error('PARAMETER_NOT_APPLICABLE');
 const detail=args.spectral_detail??'balanced',view=args.channel_view??'separate',band=args.frequency_range_hz??null;
 if(!['transient','balanced','tonal'].includes(detail)||!['separate','power_mean'].includes(view))throw Error('INVALID_DISPLAY_PARAMETERS');
 if(band!==null&&(!Array.isArray(band)||band.length!==2||band.some(x=>!Number.isFinite(x))||band[0]<0||band[1]<=band[0]))throw Error('INVALID_FREQUENCY_RANGE');
 return {source:pathSet?{kind:'path',value:args.source_path}:{kind:'attachment',value:args.attachment_id},from,to,features:[...features],spectral_detail:detail,frequency_range_hz:band===null?null:[...band],channel_view:view};
}
