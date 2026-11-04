import FFT from 'fft.js';
import {validatePcm,linearQuantile} from './signal.mjs';
const DETAILS={transient:1024,balanced:2048,tonal:4096};
const LOG_STEP=Math.log(6.4)/27;
export function hzToMel(hz){if(!Number.isFinite(hz)||hz<0)throw Error('INVALID_FREQUENCY');return hz<1000?hz/(200/3):15+Math.log(hz/1000)/LOG_STEP;}
export function melToHz(mel){if(!Number.isFinite(mel)||mel<0)throw Error('INVALID_MEL');return mel<15?mel*(200/3):1000*Math.exp((mel-15)*LOG_STEP);}
export function makeMelFilters(sr,size,bands=128){
 if(!Number.isInteger(sr)||sr<8000||sr>192000||!Object.values(DETAILS).includes(size)||!Number.isInteger(bands)||bands<1||bands>256)throw Error('INVALID_FILTER');
 const ceiling=hzToMel(sr/2),edges=Float64Array.from({length:bands+2},(_,i)=>melToHz(ceiling*i/(bands+1)));
 return Array.from({length:bands},(_,m)=>Float64Array.from({length:size/2+1},(_,k)=>{
  const f=k*sr/size,lower=(f-edges[m])/(edges[m+1]-edges[m]),upper=(edges[m+2]-f)/(edges[m+2]-edges[m+1]);
  return Math.max(0,Math.min(lower,upper))*2/(edges[m+2]-edges[m]);
 }));
}
function validPower(values){if(!(Array.isArray(values)||values instanceof Float64Array||values instanceof Float32Array)||!values.length||[...values].some(v=>!Number.isFinite(v)||v<0))throw Error('INVALID_POWER');}
export function applyMel(power,filters){
 validPower(power);if(!Array.isArray(filters)||!filters.length||filters.some(f=>f.length!==power.length))throw Error('MEL_SHAPE');
 for(const filter of filters)validPower(filter);
 return Float64Array.from(filters,filter=>{const value=filter.reduce((sum,w,k)=>sum+w*power[k],0);if(!Number.isFinite(value))throw Error('POWER_OVERFLOW');return value;});
}
export function displayPowerDb(power,reference){
 if(!Number.isFinite(power)||power<0||!Number.isFinite(reference)||reference<0||power>reference*(1+1e-12))throw Error('INVALID_DISPLAY');
 return reference===0?null:Math.max(-80,Math.min(0,10*Math.log10(Math.max(power/reference,1e-12))));
}
function spectralStatistics(power,sr,size){
 let sum=0,moment=0,log=0,average=0;
 for(let k=0;k<power.length;k++){sum+=power[k];moment+=k*sr/size*power[k];const p=Math.max(power[k],1e-12);log+=Math.log(p);average+=p;}
 if(sum===0)return null;
 let accumulated=0,rolloff=0;
 for(let k=0;k<power.length;k++){accumulated+=power[k];if(accumulated>=.85*sum){rolloff=k*sr/size;break;}}
 return {centroid_hz:moment/sum,rolloff_hz:rolloff,flatness:Math.exp(log/power.length)/(average/power.length)};
}
function summarizeFrames(frames){
 const valid=frames.filter(f=>f.statistics);if(!valid.length)return null;
 return Object.fromEntries(['centroid_hz','rolloff_hz','flatness'].map(name=>{const values=valid.map(f=>f.statistics[name]);return [name,{p10:linearQuantile(values,.1),p50:linearQuantile(values,.5),p90:linearQuantile(values,.9)}];}));
}
export function computeSpectrum(channels,sampleRate,{detail='balanced',offset=0}={}){
 const count=validatePcm(channels,sampleRate);
 if(!Object.hasOwn(DETAILS,detail))throw Error('INVALID_DETAIL');
 if(!Number.isFinite(offset)||offset<0)throw Error('INVALID_OFFSET');
 const size=DETAILS[detail],hop=size/4,fft=new FFT(size),filters=makeMelFilters(sampleRate,size),window=Float64Array.from({length:size},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/size));
 const frameCount=Math.max(1,Math.ceil((count-size)/hop)+1);let reference=0;
 const results=channels.map(channel=>{
  const frames=[];
  for(let j=0;j<frameCount;j++){
   const start=j*hop,valid=Math.min(size,count-start),input=new Float64Array(size),output=fft.createComplexArray();let square=0;
   for(let i=0;i<valid;i++){input[i]=channel[start+i]*window[i];square+=channel[start+i]**2;}
   fft.realTransform(output,input);
   const power=Float64Array.from({length:size/2+1},(_,k)=>output[2*k]**2+output[2*k+1]**2),mel=applyMel(power,filters);
   for(const p of mel)reference=Math.max(reference,p);
   const statistics=valid===size&&square/valid>1e-6?spectralStatistics(power,sampleRate,size):null;
   frames.push({from:offset+start/sampleRate,to:offset+(start+valid)/sampleRate,center:offset+(start+(size-1)/2)/sampleRate,timing:'window',padded_samples:size-valid,mel_power:mel,statistics});
  }
  return {frames,valid_fraction:frames.filter(f=>f.statistics).length/frames.length,summary:summarizeFrames(frames)};
 });
 return {method:'spectrum-v1',coverage:{from:offset,to:offset+count/sampleRate},parameters:{detail,fft_size:size,hop,window:'periodic_hann',center:false,power:'unnormalized_rfft_squared_no_single_sided_doubling',mel_bands:128,mel_scale:'slaney',reference:'shared_mel_peak'},reference_power:reference,channels:results,limitations:['Relative spectral dB is not dBFS or cross-recording loudness.','Window support is not exact event duration.','Padded and low-energy frames are excluded from spectral statistics.']};
}
export function aggregatePower(rows,{samples,hop,columns}){
 if(!Array.isArray(rows)||!rows.length||!Number.isInteger(samples)||samples<1||!Number.isInteger(hop)||hop<1||!Number.isInteger(columns)||columns<1||columns>1200)throw Error('INVALID_BIN');
 const bands=rows[0].length;for(const row of rows){validPower(row);if(row.length!==bands)throw Error('MEL_SHAPE');}
 return Array.from({length:columns},(_,c)=>{
  const start=c*samples/columns,end=(c+1)*samples/columns,result=new Float64Array(bands);let total=0;
  for(let j=Math.min(rows.length-1,Math.floor(start/hop));j<rows.length;j++){
   const a=j*hop,b=j===rows.length-1?samples:Math.min(samples,(j+1)*hop);if(a>=end)break;
   const weight=Math.max(0,Math.min(end,b)-Math.max(start,a));const nextTotal=total+weight;for(let k=0;k<bands;k++)result[k]=result[k]*(total/nextTotal)+rows[j][k]*(weight/nextTotal);total=nextTotal;
  }
  if(total<=0)throw Error('UNCOVERED_BIN');return result;
 });
}
