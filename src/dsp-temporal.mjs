import FFT from 'fft.js';
import {validatePcm} from './signal.mjs';

const MAX_PITCH_FRAMES=200, PITCH_SECONDS=.064, MIN_PERIODICITY=.8;
const clamp=value=>Math.max(0,Math.min(1,value));

// Original-rate, zero-padded FFT gives linear (not circular) autocorrelation.
// Rectangular support and overlap-energy normalization preserve periodicity at
// long lags without a Hann taper bias. No decimation, aliasing or channel sum.
function pitchFrames(channel,sampleRate,count,offset){
 const length=Math.round(PITCH_SECONDS*sampleRate);
 if(count<length)return [];
 const frameCount=Math.min(MAX_PITCH_FRAMES,Math.floor((count-length)/length)+1);
 const size=2**Math.ceil(Math.log2(2*length-1)),fft=new FFT(size);
 const input=new Float64Array(size),spectrum=fft.createComplexArray(),correlation=fft.createComplexArray();
 const prefix=new Float64Array(length+1),values=new Float64Array(Math.ceil(sampleRate/60)+2);
 const minLag=Math.max(1,Math.floor(sampleRate/1000)),maxLag=Math.ceil(sampleRate/60);
 const frames=[];
 for(let f=0;f<frameCount;f++){
  const start=frameCount===1?0:Math.round(f*(count-length)/(frameCount-1));
  const frame={from:offset+start/sampleRate,to:offset+(start+length)/sampleRate,candidates:[]};
  frames.push(frame);
  const anchor=channel[start];let mean=0,peak=0;
  for(let i=0;i<length;i++)mean+=channel[start+i]-anchor;
  mean/=length;
  for(let i=0;i<length;i++)peak=Math.max(peak,Math.abs((channel[start+i]-anchor)-mean));
  if(peak===0)continue;
  input.fill(0);prefix[0]=0;
  for(let i=0;i<length;i++){const x=((channel[start+i]-anchor)-mean)/peak;input[i]=x;prefix[i+1]=prefix[i]+x*x;}
  if(prefix[length]<=length*1e-12)continue;
  fft.realTransform(spectrum,input);fft.completeSpectrum(spectrum);
  for(let k=0;k<size;k++){spectrum[2*k]=spectrum[2*k]**2+spectrum[2*k+1]**2;spectrum[2*k+1]=0;}
  fft.inverseTransform(correlation,spectrum);
  for(let lag=minLag-1;lag<=maxLag+1;lag++){
   const denominator=Math.sqrt(prefix[length-lag]*(prefix[length]-prefix[lag]));
   values[lag]=denominator>0?clamp(correlation[2*lag]/denominator):0;
  }
  const peaks=[];
  for(let lag=minLag;lag<=maxLag;lag++){
   const a=values[lag-1],b=values[lag],c=values[lag+1];
   if(b<MIN_PERIODICITY||b<a||b<=c)continue;
   const curvature=a-2*b+c,shift=curvature===0?0:Math.max(-.5,Math.min(.5,.5*(a-c)/curvature));
   const frequency=sampleRate/(lag+shift);
   if(frequency<59.9||frequency>1000.1)continue;
   peaks.push({frequency_hz:Math.max(60,Math.min(1000,frequency)),periodicity:b});
  }
  // Prefer the shortest strong period, retaining subharmonic alternatives.
  const best=peaks.reduce((m,p)=>Math.max(m,p.periodicity),0);
  frame.candidates=peaks.filter(p=>p.periodicity>=best*.98).slice(0,3);
 }
 return frames;
}

function rhythmEvidence(power,hopSeconds,offset,duration,wantTempo=true){
 // Five adjacent power blocks form trailing 50 ms overlapping windows.
 // Only complete windows participate: no zero-padding startup attack. This
 // suppresses carrier-phase power ripple before attack thresholding.
 const smooth=new Float64Array(power.length),width=5;
 let sum=0,peakPower=0,peakNovelty=0;
 for(let i=0;i<power.length;i++){
  sum+=power[i];if(i>=width)sum-=power[i-width];
  if(i>=width-1){smooth[i]=Math.max(0,sum/width);peakPower=Math.max(peakPower,smooth[i]);}
 }
 const novelty=new Float64Array(power.length);
 if(peakPower>0)for(let i=width;i<power.length;i++){
  const rise=smooth[i]-smooth[i-1];
  // Require both a substantial clip-relative attack and a local power rise.
  // Normalizing tiny carrier ripples to their own maximum fabricates tempo.
  if(rise>=.1*peakPower&&rise>=.2*smooth[i-1])novelty[i]=rise/peakPower;
  peakNovelty=Math.max(peakNovelty,novelty[i]);
 }
 const onsets=[],separation=Math.ceil(.06/hopSeconds);
 if(peakNovelty>=.05)for(let i=1;i<novelty.length;i++){
  if(novelty[i]<Math.max(.03,.1*peakNovelty)||novelty[i]<(novelty[i-1]??0)||novelty[i]<=(novelty[i+1]??0))continue;
  const previous=onsets.at(-1);
  if(previous&&i-previous.index<separation){if(novelty[i]>previous.strength)onsets[onsets.length-1]={index:i,strength:novelty[i]};}
  else onsets.push({index:i,strength:novelty[i]});
 }
 const limitations=[
  'Energy-onset novelty uses positive differences of trailing 50 ms overlapping full-band channel-mean power windows, not spectral flux; soft attacks can be missed.',
  'Onset times are trailing-window detection times with one energy-hop resolution; early attacks before a complete window are omitted. Strengths are relative power changes, not calibrated confidence.',
  'Autocorrelation-peak tempo scores measure novelty periodicity, not confidence; inferred half/double metrical alternatives have null scores. No beat grid or semantic labels are inferred.'
 ];
 const tempo=[];
 if(!wantTempo){}
  else if(duration<3||onsets.length<4){limitations.push('Insufficient duration or onsets for tempo (requires at least 3 seconds and 4 detected onsets).');}
 else{
  const minLag=Math.ceil(60/240/hopSeconds),maxLag=Math.min(Math.floor(60/40/hopSeconds),Math.floor(power.length/3));
  const scores=new Float64Array(maxLag+2);
  for(let lag=minLag-1;lag<=maxLag+1;lag++){
   let dot=0,left=0,right=0;
   for(let i=lag;i<novelty.length;i++){dot+=novelty[i]*novelty[i-lag];left+=novelty[i]**2;right+=novelty[i-lag]**2;}
   scores[lag]=left>0&&right>0?clamp(dot/Math.sqrt(left*right)):0;
  }
  for(let lag=minLag;lag<=maxLag;lag++)if(scores[lag]>=.2&&scores[lag]>=scores[lag-1]&&scores[lag]>scores[lag+1]){
   tempo.push({bpm:60/(lag*hopSeconds),score:scores[lag],kind:'autocorrelation_peak'});
  }
  tempo.sort((a,b)=>b.score-a.score||b.bpm-a.bpm);
  const strongest=tempo[0];
  if(strongest)for(const factor of [.5,2]){
   const bpm=strongest.bpm*factor;
   if(bpm>=40&&bpm<=240&&duration>=3*60/bpm&&!tempo.some(c=>Math.abs(c.bpm-bpm)<2))tempo.push({bpm,score:null,kind:'metrical_alternative',parent_bpm:strongest.bpm});
  }
  tempo.sort((a,b)=>b.score-a.score||b.bpm-a.bpm);
  if(!tempo.length)limitations.push('No sufficiently periodic onset novelty found in the supported tempo range.');
 }
 return {onsets:onsets.map(({index,strength})=>({time:offset+index*hopSeconds,strength})),tempo_candidates:tempo.slice(0,6),limitations};
}

export function temporalEvidence(channels,sampleRate,{offset=0,features=['pitch','pitch_frames','onsets','tempo']}={}){
 if(!Array.isArray(features)||features.some(f=>!['pitch','pitch_frames','onsets','tempo'].includes(f)))throw Error('INVALID_TEMPORAL_FEATURES');
 const wantPitch=features.includes('pitch')||features.includes('pitch_frames'),wantRhythm=features.includes('onsets')||features.includes('tempo');
 const count=validatePcm(channels,sampleRate);
 if(!Number.isFinite(offset)||offset<0)throw Error('INVALID_OFFSET');
 const hop=Math.round(sampleRate*.01),power=wantRhythm?new Float64Array(Math.ceil(count/hop)):null;
 let selected=0,highest=-1;
 // Channel selection is needed only for pitch; power blocks only for rhythm.
 for(let c=0;c<channels.length;c++){
  let total=0,mean=0,seen=0;
  const anchor=channels[c][0];
  for(let start=0;start<count;start+=hop){
   const end=Math.min(count,start+hop);let square=0;
   for(let i=start;i<end;i++){
    const value=channels[c][i];
    if(wantRhythm)square+=value**2;
    if(wantPitch){const x=value-anchor,delta=x-mean;mean+=delta/++seen;total+=delta*(x-mean);}
   }
   if(wantRhythm)power[start/hop]+=square/(end-start)/channels.length;
  }
  if(wantPitch&&total>highest){highest=total;selected=c;}
 }
 const frames=wantPitch?pitchFrames(channels[selected],sampleRate,count,offset):[];
 return {
  method:'temporal-v1',
  parameters:{pitch_method:'original_rate_fft_overlap_normalized_autocorrelation',pitch_channel:selected,pitch_channel_selection:'highest_full_clip_dc_removed_energy_first_on_tie',pitch_channel_index_base:0,pitch_sample_rate_hz:sampleRate,pitch_window_seconds:PITCH_SECONDS,pitch_window:'rectangular_dc_removed',pitch_max_frames:MAX_PITCH_FRAMES,pitch_frame_selection:'uniform_full_window_starts_including_first_and_last',pitch_range_hz:[60,1000],pitch_min_periodicity:MIN_PERIODICITY,rhythm_method:'full_band_power_energy_onset',rhythm_hop_samples:hop,rhythm_hop_seconds:hop/sampleRate,rhythm_window_hops:5,rhythm_window_seconds:5*hop/sampleRate,rhythm_attack_min_peak_fraction:.1,rhythm_attack_min_local_fraction:.2,tempo_range_bpm:[40,240],tempo_min_seconds:3,tempo_min_onsets:4,tempo_min_cycles:3,tempo_alternative_score:null},
  coverage:{from:offset,to:offset+count/sampleRate,pitch_frames:frames.length,pitch_sampled_seconds:frames.length*Math.round(PITCH_SECONDS*sampleRate)/sampleRate},
  ...(wantPitch?{pitch:{frames,limitations:[
   'Monophonic periodicity candidates from one explicitly selected highest DC-removed-energy channel; other channels and polyphonic fundamentals are not represented.',
   'At most 200 original-rate 64 ms windows are sampled uniformly; gaps can miss short events. No downsampling or anti-alias approximation is used.',
   'Periodicity is overlap-normalized autocorrelation, not calibrated confidence. Harmonic/subharmonic ambiguity and octave errors remain; candidates are not note or instrument labels.',
   ...(frames.length?[]:['Insufficient samples for a complete 64 ms pitch window.'])
  ]}}:{}),
  ...(wantRhythm?{rhythm:rhythmEvidence(power,hop/sampleRate,offset,count/sampleRate,features.includes('tempo'))}:{})
 };
}
