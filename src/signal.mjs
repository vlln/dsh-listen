const MAX_SECONDS=60;
const THRESHOLD_POWER=1e-6;
const isLow=power=>power<THRESHOLD_POWER&&Math.abs(power-THRESHOLD_POWER)>1e-18;
export function validatePcm(channels,sampleRate){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('INVALID_RATE');
 if(!Array.isArray(channels)||channels.length<1||channels.length>2)throw Error('INVALID_CHANNEL_COUNT');
 const count=channels[0]?.length;
 if(!count||count>MAX_SECONDS*sampleRate)throw Error('RANGE_LIMIT');
 for(const channel of channels){
  if(!(channel instanceof Float32Array||channel instanceof Float64Array)||channel.length!==count)throw Error('INVALID_PCM_SHAPE');
  for(const value of channel){
   if(!Number.isFinite(value))throw Error('NONFINITE_SAMPLE');
   // Decoder contract is float32 PCM; reject magnitudes not representable there.
   if(Math.abs(value)>3.4028234663852886e38||(value!==0&&Math.abs(value)<1.401298464324817e-45))throw Error('UNSUPPORTED_PCM_MAGNITUDE');
  }
 }
 return count;
}
export function amplitudeDbfs(value){
 if(!Number.isFinite(value)||value<0)throw Error('INVALID_AMPLITUDE');
 return value===0?null:20*Math.log10(Math.max(value,1e-12));
}
export function linearQuantile(values,q){
 if(!Number.isFinite(q)||q<0||q>1)throw Error('INVALID_QUANTILE');
 if(!(Array.isArray(values)||values instanceof Float32Array||values instanceof Float64Array)||[...values].some(v=>typeof v!=='number'||!Number.isFinite(v)))throw Error('INVALID_QUANTILE_VALUES');
 if(!values.length)return null;
 const sorted=[...values].sort((a,b)=>a-b),position=(sorted.length-1)*q;
 return sorted[Math.floor(position)]+(sorted[Math.ceil(position)]-sorted[Math.floor(position)])*(position-Math.floor(position));
}
function levelSummary(channel){
 let sum=0,squares=0,peak=0,near=0,over=0;
 for(const x of channel){sum+=x;squares+=x*x;peak=Math.max(peak,Math.abs(x));if(Math.abs(x)>=.999)near++;if(Math.abs(x)>1)over++;}
 const rms=Math.sqrt(squares/channel.length);
 return {rms,rms_dbfs:amplitudeDbfs(rms),peak,peak_dbfs:amplitudeDbfs(peak),dc:sum/channel.length,near_full_scale_fraction:near/channel.length,overrange_count:over,digital_zero:peak===0};
}
function framePowers(channels,sampleRate,count){
 const window=Math.max(1,Math.round(sampleRate*.025)),hop=Math.max(1,Math.round(sampleRate*.010)),frames=[];
 for(let start=0;start<count;start+=hop){
  const end=Math.min(count,start+window),ownedEnd=Math.min(count,start+hop);
  const powers=channels.map(c=>{let sum=0;for(let i=start;i<end;i++)sum+=c[i]*c[i];return sum/(end-start);});
  frames.push({start,end,ownedEnd,powers,combined:powers.reduce((a,b)=>a+b,0)/powers.length});
 }
 return {frames,window,hop};
}
function relationship(channels,levels){
 if(channels.length!==2)return null;
 let cov=0,lvar=0,rvar=0;
 for(let i=0;i<channels[0].length;i++){const l=channels[0][i]-levels[0].dc,r=channels[1][i]-levels[1].dc;cov+=l*r;lvar+=l*l;rvar+=r*r;}
 const leftConstant=channels[0].every(x=>x===channels[0][0]),rightConstant=channels[1].every(x=>x===channels[1][0]);
 const correlation=!leftConstant&&!rightConstant&&lvar>0&&rvar>0?Math.max(-1,Math.min(1,cov/Math.sqrt(lvar*rvar))):null;
 const left=levels[0].rms,right=levels[1].rms;
 return {correlation,balance_db:left>0&&right>0?20*Math.log10(left/right):null,mute_side:left===0&&right===0?'both':left===0?'left':right===0?'right':null,phase_cancellation_risk:correlation!==null&&correlation<-.8};
}
function energyBins(frames,count,sampleRate,offset){
 const step=Math.max(1,Math.round(sampleRate*.1)),bins=[];
 for(let start=0;start<count;start+=step){
  const end=Math.min(count,start+step);let power=0,weight=0,min=Infinity,max=0;
  for(const f of frames){if(f.start>=end)break;const overlap=Math.max(0,Math.min(end,f.ownedEnd)-Math.max(start,f.start));if(!overlap)continue;power+=f.combined*overlap;weight+=overlap;min=Math.min(min,Math.sqrt(f.combined));max=Math.max(max,Math.sqrt(f.combined));}
  bins.push({from:offset+start/sampleRate,to:offset+end/sampleRate,rms:Math.sqrt(power/weight),min,max});
 }
 return bins;
}
export function describeSignal(channels,sampleRate,{offset=0}={}){
 const count=validatePcm(channels,sampleRate);
 if(!Number.isFinite(offset)||offset<0)throw Error('INVALID_OFFSET');
 const levels=channels.map(levelSummary),{frames,window,hop}=framePowers(channels,sampleRate,count);
 const lowFraction=selector=>frames.reduce((sum,f)=>sum+(isLow(selector(f))?f.ownedEnd-f.start:0),0)/count;
 levels.forEach((level,c)=>{const rms=frames.map(f=>Math.sqrt(f.powers[c]));level.frame_rms_quantiles={p10:linearQuantile(rms,.1),p50:linearQuantile(rms,.5),p90:linearQuantile(rms,.9)};level.low_energy_fraction=lowFraction(f=>f.powers[c]);});
 return {method:'signal-v1',sample_count:count,sample_rate_hz:sampleRate,coverage:{from:offset,to:offset+count/sampleRate},units:{level:'dBFS',amplitude:'full-scale linear',time:'source seconds'},parameters:{window_samples:window,hop_samples:hop,energy_bin_seconds:.1,low_energy_threshold_dbfs:-60,threshold_relative_tolerance:1e-12},digital_zero:levels.every(l=>l.digital_zero),channels:levels,low_energy_fraction:lowFraction(f=>f.combined),stereo:relationship(channels,levels),energy:energyBins(frames,count,sampleRate,offset),limitations:['RMS is not perceptual loudness or LUFS.','Sample peak is not true peak; near-full-scale samples do not prove clipping.','Low energy is not a voice-activity decision.']};
}
