import {validatePcm,describeSignal} from './signal.mjs';
import {computeSpectrum,aggregatePower,melToHz,hzToMel} from './spectrum.mjs';
function waveEnvelope(channels,count,columns,offset,sr){
 const buckets=Math.min(count,columns);
 return Array.from({length:buckets},(_,b)=>{
  const start=Math.floor(b*count/buckets),end=Math.floor((b+1)*count/buckets);let min=Infinity,max=-Infinity;
  for(const channel of channels)for(let i=start;i<end;i++){min=Math.min(min,channel[i]);max=Math.max(max,channel[i]);}
  return {from:offset+start/sr,to:offset+end/sr,min,max};
 });
}
function meanChannelPower(channels){
 if(channels.length===1)return channels[0];
 return channels[0].map((row,i)=>Float64Array.from(row,(_,k)=>channels.reduce((sum,channel)=>sum+channel[i][k]/channels.length,0)));
}
export function preparePlot(channels,sampleRate,{offset=0,detail='balanced',frequencyRange=[0,sampleRate/2],channelView='separate',columns=990}={}){
 const count=validatePcm(channels,sampleRate);
 if(!['separate','power_mean'].includes(channelView))throw Error('INVALID_CHANNEL_VIEW');
 if(!Number.isInteger(columns)||columns<1||columns>1200)throw Error('INVALID_PLOT_COLUMNS');
 if(!Array.isArray(frequencyRange)||frequencyRange.length!==2||frequencyRange.some(f=>!Number.isFinite(f))||frequencyRange[0]<0||frequencyRange[1]>sampleRate/2||frequencyRange[0]>=frequencyRange[1])throw Error('INVALID_FREQUENCY_RANGE');
 const frequencies=Float64Array.from({length:128},(_,i)=>melToHz(hzToMel(sampleRate/2)*(i+1)/129));
 const visible=[...frequencies].map((f,i)=>({f,i})).filter(x=>x.f>=frequencyRange[0]&&x.f<=frequencyRange[1]);
 if(!visible.length)throw Error('EMPTY_FREQUENCY_RANGE');
 const spectrum=computeSpectrum(channels,sampleRate,{detail,offset});
 // F08 statistics always use balanced full-band analysis, not display settings.
 const statistics=detail==='balanced'?spectrum:computeSpectrum(channels,sampleRate,{detail:'balanced',offset});
 const rows=spectrum.channels.map(c=>c.frames.map(f=>f.mel_power));
 const grouped=channelView==='power_mean'?[meanChannelPower(rows)]:rows;
 const energy=describeSignal(channels,sampleRate,{offset}).energy;
 const plots=grouped.map((group,index)=>({
  name:channelView==='power_mean'?'POWER MEAN / WAVE ENVELOPE UNION':`CHANNEL ${index+1}`,
  wave:waveEnvelope(channelView==='power_mean'?channels:[channels[index]],count,columns,offset,sampleRate),
  mel:aggregatePower(group,{samples:count,hop:spectrum.parameters.hop,columns}).map(row=>Float64Array.from(visible,b=>row[b.i]))
 }));
 return {method:'plot-data-v1',coverage:spectrum.coverage,parameters:{...spectrum.parameters,frequency_range_hz:[...frequencyRange],channel_view:channelView,display_columns:columns},frequency_hz:visible.map(x=>x.f),reference_power:spectrum.reference_power,color_reference:{unit:'dB relative to shared mel peak',minimum_db:-80,maximum_db:0},channels:plots,energy,spectral_statistics:statistics.channels.map(c=>c.summary),statistics_parameters:statistics.parameters,limitations:['Visible frequency cropping does not change full-band statistics.','Power-mean spectrum preserves channel energy; its waveform is an envelope union, not a mono signal.','Time bins average linear power and can dilute narrow transients.']};
}
