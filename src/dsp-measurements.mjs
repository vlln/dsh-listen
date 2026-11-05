import {linearQuantile} from './signal.mjs';

const LOW_RMS=.001, MAX_INTERVALS=100;
const quantiles=values=>({p10:linearQuantile(values,.1),p50:linearQuantile(values,.5),p90:linearQuantile(values,.9)});

function energySummary(bins){
 const rms=quantiles(bins.map(bin=>bin.rms));
 const intervals=[];let intervalCount=0,binCount=0,duration=0,covered=0,previous=null;
 for(const bin of bins){
  const seconds=bin.to-bin.from;covered+=seconds;
  const power=bin.rms**2,threshold=LOW_RMS**2;
   if(!(power<threshold&&Math.abs(power-threshold)>1e-18)){previous=null;continue;}
  binCount++;duration+=seconds;
  if(previous&&previous.to===bin.from)previous.to=bin.to;
  else{
   previous={from:bin.from,to:bin.to};intervalCount++;
   if(intervals.length<MAX_INTERVALS)intervals.push(previous);
  }
 }
 const reason=!bins.length?'no_energy_bins':rms.p10===0?'zero_p10_rms':null;
 return {
  bin_count:bins.length,rms_quantiles:rms,
  dynamic_range_db:reason?null:20*Math.log10(rms.p90/rms.p10),
  dynamic_range_unavailable_reason:reason,
  low_energy:{threshold_rms:LOW_RMS,threshold_dbfs:-60,bin_count:binCount,
   interval_count:intervalCount,duration_seconds:duration,covered_duration_seconds:covered,
   fraction:covered>0?duration/covered:null,unavailable_reason:covered>0?null:'no_energy_bins',
   intervals,truncated:intervalCount>MAX_INTERVALS,omitted_interval_count:Math.max(0,intervalCount-MAX_INTERVALS)}
 };
}

/** Pure summary of validated describeSignal / temporalEvidence outputs; no PCM work. */
export function measurementEvidence(statistics,temporal){
 const frames=temporal.pitch.frames;
 const frequencies=frames.filter(frame=>frame.candidates.length).map(frame=>frame.candidates[0].frequency_hz);
 const hz=quantiles(frequencies);
 const reason=!frames.length?'no_pitch_windows':!frequencies.length?'no_pitch_candidates':null;
 return {
  method:'measurements-v1',coverage:{...statistics.coverage},
  units:{amplitude:'full-scale linear RMS',dynamic_range:'dB (amplitude ratio)',time:'absolute source seconds',frequency:'Hz',pitch_span:'semitones',fraction:'0..1'},
  parameters:{energy_source:'statistics.energy',energy_bin_seconds:statistics.parameters.energy_bin_seconds,
   energy_window_samples:statistics.parameters.window_samples,energy_hop_samples:statistics.parameters.hop_samples,
   energy_sample_rate_hz:statistics.sample_rate_hz,quantiles:'linear interpolation; each display bin / available pitch window has equal weight',
   low_energy_comparison:'rms squared < 1e-6 with absolute power difference > 1e-18',low_energy_threshold_relative_tolerance:1e-12,max_low_energy_intervals:MAX_INTERVALS,
    diagnostics_dbfs_floor:-240,diagnostics_dbfs_zero:null,
   pitch_candidate:'first candidate per sampled frame: shortest strong period (highest frequency) within 98% of best periodicity, not necessarily highest score or true F0',pitch_channel:temporal.parameters.pitch_channel,
   pitch_channel_index_base:temporal.parameters.pitch_channel_index_base,
   pitch_window_seconds:temporal.parameters.pitch_window_seconds,pitch_max_frames:temporal.parameters.pitch_max_frames},
  energy:energySummary(statistics.energy),
  diagnostics:{digital_zero:statistics.digital_zero,channels:structuredClone(statistics.channels),
   stereo:structuredClone(statistics.stereo),stereo_unavailable_reason:statistics.stereo_unavailable_reason},
  pitch:{frequency_hz_quantiles:hz,span_semitones:reason?null:12*Math.log2(hz.p90/hz.p10),
   window_count:frames.length,available_window_count:frequencies.length,
   available_window_fraction:frames.length?frequencies.length/frames.length:null,unavailable_reason:reason},
  limitations:[
   'Energy quantiles and low-energy intervals approximate 100 ms display bins: 25 ms forward-window channel-mean powers are aggregated by owned 10 ms hops, not independent 100 ms RMS measurements.',
   'Low energy is not VAD or a true pause; bin coverage can smear boundaries. Tail bins have their actual duration; quantiles are not duration-weighted. RMS and its p90/p10 amplitude dB range are not LUFS or perceptual loudness.',
   'Diagnostics reuse sample-level measurements; sample peak, near-full-scale fractions and overrange counts do not establish clipping; sample peak is not true peak.',
   'Pitch uses only the first candidate in each sparse 64 ms window, at most 200 windows from one selected channel; it is not a complete intonation contour. Harmonic/subharmonic ambiguity and octave errors remain.',
   'Available-window fraction is candidate availability among sampled windows, not voicing probability or duration coverage. Periodicity is autocorrelation, not confidence.'
  ]
 };
}
