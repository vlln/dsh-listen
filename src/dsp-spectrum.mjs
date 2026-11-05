import FFT from 'fft.js';

const MAX_FRAMES=300;
const LABELS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// PCM has already passed validatePcm at the worker boundary. Do not scan it again.
export function spectrumEvidence(channels,sampleRate,options={}){
 if(options===null||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['offset','band'].includes(k)))throw Error('INVALID_SPECTRUM_OPTIONS');
 const {offset=0,band=null}=options;
 if(!Number.isFinite(offset)||offset<0)throw Error('INVALID_OFFSET');
 if(band!==null&&(!Array.isArray(band)||band.length!==2||!band.every(Number.isFinite)||band[0]<0||band[0]>=band[1]||band[1]>sampleRate/2))throw Error('INVALID_BAND');
 const count=channels[0].length,size=Math.max(1024,Math.min(16384,2**Math.ceil(Math.log2(sampleRate*.09)))),hop=size/2;
 const available=Math.max(1,Math.ceil((count-size)/hop)+1),selected=Math.min(MAX_FRAMES,available);
 const indices=Array.from({length:selected},(_,i)=>selected===1?0:Math.round(i*(available-1)/(selected-1)));
 const fft=new FFT(size),input=new Float64Array(size),output=fft.createComplexArray(),power=new Float64Array(size/2+1);
 const window=Float64Array.from({length:size},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/size));
 let weightSum=0,covered=0,lastEnd=0,paddedFrames=0,minStride=Infinity,maxStride=0;
 for(let j=0;j<indices.length;j++){
  const start=indices[j]*hop,valid=Math.min(size,count-start),end=start+valid;
  // Center the real samples in a short window: a one-sample input must not fall
  // on Hann's zero endpoint. This is zero padding, not extra frequency resolution.
  const pad=Math.floor((size-valid)/2);
  if(valid<size)paddedFrames++;
  covered+=Math.max(0,end-Math.max(start,lastEnd));lastEnd=end;
  if(j){const stride=indices[j]-indices[j-1];minStride=Math.min(minStride,stride);maxStride=Math.max(maxStride,stride);}
  let windowEnergy=0;for(let i=0;i<valid;i++)windowEnergy+=window[pad+i]**2;
  const weight=valid/size;weightSum+=weight;
  for(const channel of channels){
   input.fill(0);const anchor=channel[start];let meanDelta=0;
   for(let i=0;i<valid;i++)meanDelta+=channel[start+i]-anchor;meanDelta/=valid;
   for(let i=0;i<valid;i++)input[pad+i]=(channel[start+i]-anchor-meanDelta)*window[pad+i];
   fft.realTransform(output,input);
   for(let k=1;k<power.length;k++){
    const squared=output[2*k]**2+output[2*k+1]**2;
    power[k]+=squared*(k===size/2?1:2)/windowEnergy*weight/channels.length;
   }
  }
 }
 for(let k=1;k<power.length;k++)power[k]/=weightSum;
 const binWidth=sampleRate/size,chroma=new Array(12).fill(0);let total=0,inBand=0,reference=0;
 for(let k=1;k<power.length;k++){
  const hz=k*binWidth,p=power[k];total+=p;reference=Math.max(reference,p);
  if(band&&hz>=band[0]&&hz<=band[1])inBand+=p;
  if(hz>=40&&hz<=5000){const midi=Math.round(69+12*Math.log2(hz/440));chroma[((midi%12)+12)%12]+=p;}
 }
 const candidates=[];
 if(reference>0)for(let k=1;k<power.length;k++){
  const p=power[k];
  if(p<reference*1e-6||p<=power[k-1]||(k+1<power.length&&p<power[k+1]))continue;
  let delta=0;
  if(k>1&&k+1<power.length&&power[k-1]>0&&power[k+1]>0){
   const a=Math.log(power[k-1]),b=Math.log(p),c=Math.log(power[k+1]),den=a-2*b+c;
   if(den<0)delta=Math.max(-.5,Math.min(.5,.5*(a-c)/den));
  }
  candidates.push({bin:k,frequency_hz:(k+delta)*binWidth,relative_power_db:10*Math.log10(p/reference)});
 }
 candidates.sort((a,b)=>b.relative_power_db-a.relative_power_db||a.bin-b.bin);
 const peaks=[];for(const p of candidates){if(peaks.every(q=>Math.abs(q.bin-p.bin)>=3))peaks.push(p);if(peaks.length===12)break;}
 const chromaSum=chroma.reduce((a,b)=>a+b,0);
 return {
  method:'dsp-spectrum-v1',
  parameters:{sample_rate_hz:sampleRate,channels:channels.length,channel_aggregation:'power_mean',fft_size:size,hop_samples:hop,window:'periodic_hann',bin_width_hz:binWidth,window_seconds:size/sampleRate,observed_window_seconds:Math.min(size,count)/sampleRate,power:'one_sided_squared_fft_window_energy_normalized',dc:'per_frame_channel_mean_removed',frame_weight:'valid_samples',max_frames:MAX_FRAMES,frame_selection:'uniform_rounded_hop_indices_including_endpoints',peak_min_separation_bins:3,peak_floor_db:-60,peak_interpolation:'log_power_parabolic',peak_reference:'maximum_non_dc_bin_power',chroma_range_hz:[40,Math.min(5000,sampleRate/2)],chroma_mapping:'nearest_equal_tempered_semitone'},
  coverage:{from:offset,to:offset+count/sampleRate,available_frames:available,sampled_frames:selected,frame_stride:available===1?1:(available-1)/(selected-1),frame_stride_min:selected===1?1:minStride,frame_stride_max:selected===1?1:maxStride,sampled_fraction:covered/count,sampled_seconds:covered/sampleRate,padded_frames:paddedFrames},
  peaks:peaks.map(({frequency_hz,relative_power_db})=>({frequency_hz,relative_power_db})),
  band_energy:band?{range_hz:[...band],power_fraction:total>0?Math.max(0,Math.min(1,inBand/total)):0}:null,
  chroma:{labels:[...LABELS],values:chromaSum>0?chroma.map(x=>x/chromaSum):chroma,tuning_reference_hz:440},
  limitations:[
   'Summary of sampled windowed channel powers, not a waveform downmix or a time-resolved event model; unselected intervals can contain missed events.',
   'FFT bin spacing is not resolving power: the Hann main lobe spans about four bins for full windows; zero padding short input adds no frequency information.',
   'Peaks are separated local maxima above a relative -60 dB floor, not identified sources, fundamentals, or calibrated dBFS; interpolation does not improve FFT resolution.',
   'Band energy sums inclusive bin centers over all positive bins including Nyquist, excluding DC after per-frame mean removal; window leakage and bin boundaries limit precision.',
   'Chroma folds positive-bin power from 40 Hz to min(5000 Hz, Nyquist) to nearest A440 equal-tempered pitch classes; it is not a chord, key, or note transcription model.',
  ],
 };
}
