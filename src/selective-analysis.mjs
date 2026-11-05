import {describeSignal} from './signal.mjs';
import {preparePlot} from './plot-data.mjs';
import {renderPlot} from './image.mjs';
import {spectrumEvidence} from './dsp-spectrum.mjs';
import {temporalEvidence} from './dsp-temporal.mjs';
import {energySummary,pitchSummary} from './dsp-measurements.mjs';

export const ANALYSIS_FEATURES=Object.freeze(['signal_image','levels','energy','spectral_peaks','band_energy','chroma','pitch','pitch_frames','onsets','tempo']);
export function validateFeatures(features){
 if(!Array.isArray(features)||!features.length||features.some(f=>!ANALYSIS_FEATURES.includes(f))||new Set(features).size!==features.length)throw Error('INVALID_ANALYSIS_FEATURES');
}
const pick=(object,keys)=>Object.fromEntries(keys.filter(key=>key in object).map(key=>[key,object[key]]));
const SPECTRAL=['spectral_peaks','band_energy','chroma'],TEMPORAL=['pitch','pitch_frames','onsets','tempo'];
const FFT_PARAMETERS=['sample_rate_hz','channels','channel_aggregation','fft_size','hop_samples','window','bin_width_hz','window_seconds','observed_window_seconds','power','dc','frame_weight','max_frames','frame_selection'];
const PITCH_PARAMETERS=['pitch_method','pitch_channel','pitch_channel_selection','pitch_channel_index_base','pitch_sample_rate_hz','pitch_window_seconds','pitch_window','pitch_max_frames','pitch_frame_selection','pitch_range_hz','pitch_min_periodicity'];
const RHYTHM_PARAMETERS=['rhythm_method','rhythm_hop_samples','rhythm_hop_seconds','rhythm_window_hops','rhythm_window_seconds','rhythm_attack_min_peak_fraction','rhythm_attack_min_local_fraction'];

/** Computes dependencies once per request, then projects only requested products. */
export function selectiveAnalysis(channels,sampleRate,options={}){
 const {features,offset=0}=options;validateFeatures(features);
 const wanted=new Set(features),evidence={};
 if(!Number.isFinite(offset)||offset<0)throw Error('INVALID_OFFSET');
 const coverage={from:offset,to:offset+channels[0].length/sampleRate};
 const ready=(method,data)=>({status:'ready',method,...data});
 const fail=(keys,error)=>{
  if(error?.message==='CANCELLED')throw error;
  const code=['INVALID_BAND','INVALID_FREQUENCY_RANGE','EMPTY_FREQUENCY_RANGE','AGGREGATE_SAMPLE_LIMIT'].includes(error?.message)?error.message:'EXTRACTION_FAILED';
  for(const key of keys)evidence[key]={status:'failed',error:code};
 };
 const statisticsFeatures=features.filter(f=>f==='energy'||f==='levels');
 try{
 const statistics=features.some(f=>f==='energy'||f==='levels')?describeSignal(channels,sampleRate,{offset}):null;
 if(wanted.has('levels'))evidence.levels=ready('signal-levels-v1',{
  coverage,units:{amplitude:'full-scale linear',level:'dBFS',fraction:'0..1'},
  parameters:{sample_rate_hz:sampleRate,dbfs_floor:-240,dbfs_zero:null},
  digital_zero:statistics.digital_zero,channels:statistics.channels.map(channel=>pick(channel,['rms','rms_dbfs','peak','peak_dbfs','dc','near_full_scale_fraction','overrange_count','digital_zero'])),stereo:statistics.stereo,stereo_unavailable_reason:statistics.stereo_unavailable_reason
 });
 if(wanted.has('energy'))evidence.energy=ready('signal-energy-v1',{
  coverage,units:{amplitude:'full-scale linear RMS',dynamic_range:'dB (amplitude ratio)',time:'absolute source seconds',fraction:'0..1'},
  parameters:{...statistics.parameters,sample_rate_hz:sampleRate,quantiles:'linear interpolation; each display bin has equal weight',low_energy_comparison:'rms squared < 1e-6 with absolute power difference > 1e-18',max_low_energy_intervals:100},
  bins:statistics.energy,...energySummary(statistics.energy)
 });
 }catch(error){fail(statisticsFeatures,error);}
 let spectralFeatures=features.filter(f=>SPECTRAL.includes(f));
 // Reject only the band product before the shared FFT pass; never rerun it.
 const band=options.band??null;
 if(wanted.has('band_energy')&&band!==null&&(!Array.isArray(band)||band.length!==2||!band.every(Number.isFinite)||band[0]<0||band[0]>=band[1]||band[1]>sampleRate/2)){
  fail(['band_energy'],Error('INVALID_BAND'));spectralFeatures=spectralFeatures.filter(f=>f!=='band_energy');
 }
 if(spectralFeatures.length){try{
  const result=spectrumEvidence(channels,sampleRate,{offset,band:options.band??null,features:spectralFeatures});
  for(const feature of spectralFeatures){
   const own=feature==='spectral_peaks'?['peak_min_separation_bins','peak_floor_db','peak_interpolation','peak_reference']:feature==='chroma'?['chroma_range_hz','chroma_mapping']:[];
   const data=feature==='spectral_peaks'?{peaks:result.peaks}:feature==='chroma'?result.chroma:{...(result.band_energy??{range_hz:null,power_fraction:null}),unavailable_reason:result.band_energy?null:'requires_band'};
   evidence[feature]=ready(result.method,{coverage:result.coverage,units:feature==='spectral_peaks'?{frequency:'Hz',power:'dB relative to maximum non-DC bin'}:feature==='band_energy'?{frequency:'Hz',power_fraction:'0..1'}:{values:'normalized pitch-class power'},parameters:pick(result.parameters,[...FFT_PARAMETERS,...own]),...data});
  }
 }
 catch(error){fail(spectralFeatures,error);}}
 const temporalFeatures=features.filter(f=>TEMPORAL.includes(f));
 if(temporalFeatures.length){try{
  const result=temporalEvidence(channels,sampleRate,{offset,features:temporalFeatures});
  for(const feature of temporalFeatures){
   const pitch=feature==='pitch'||feature==='pitch_frames';
   const parameters=pick(result.parameters,pitch?PITCH_PARAMETERS:feature==='tempo'?[...RHYTHM_PARAMETERS,'tempo_range_bpm','tempo_min_seconds','tempo_min_onsets','tempo_min_cycles','tempo_alternative_score']:RHYTHM_PARAMETERS);
   const data=feature==='pitch'?{...pitchSummary(result.pitch.frames)}:feature==='pitch_frames'?{frames:result.pitch.frames}:feature==='onsets'?{onsets:result.rhythm.onsets}:{candidates:result.rhythm.tempo_candidates};
   if(feature==='pitch')parameters.quantiles='linear interpolation; first candidate per available sampled window, equal window weight';
   evidence[feature]=ready(feature==='pitch'?'pitch-summary-v1':result.method,{coverage:pitch?result.coverage:coverage,units:pitch?{frequency:'Hz',time:'absolute source seconds',span:'semitones',periodicity:'0..1 autocorrelation'}:feature==='onsets'?{time:'absolute source seconds',strength:'relative power change'}:{tempo:'BPM',score:'0..1 autocorrelation'},parameters,...data});
  }
 }
 catch(error){fail(temporalFeatures,error);}}
 let png;
 if(wanted.has('signal_image')){try{
  const plot=preparePlot(channels,sampleRate,{...options,includeEnergy:false,includeStatistics:false});
  const image=renderPlot(plot);png=image.png;
  evidence.signal_image=ready('signal-image-v1',{coverage:plot.coverage,parameters:plot.parameters,frequency_hz:plot.frequency_hz,image:pick(image.metadata,['method','width','height','channels','source_from','source_to','frequency_min_hz','frequency_max_hz','reference_power','digital_zero'])});
 }
 catch(error){fail(['signal_image'],error);}}
 return {status:'ready',evidence,...(png?{png}:{})};
}
