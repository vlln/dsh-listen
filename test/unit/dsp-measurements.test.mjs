import test from 'node:test';
import assert from 'node:assert/strict';
import {describeSignal} from '../../src/signal.mjs';
import {temporalEvidence} from '../../src/dsp-temporal.mjs';
import {measurementEvidence} from '../../src/dsp-measurements.mjs';

const sr=8000;
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} vs ${b}`);
const sine=(hz=220,seconds=1,gain=.5)=>Float64Array.from({length:Math.round(sr*seconds)},(_,i)=>gain*Math.sin(2*Math.PI*hz*i/sr));
function summarize(channels,{offset=0}={}){
 return measurementEvidence(describeSignal(channels,sr,{offset}),temporalEvidence(channels,sr,{offset}));
}
function finiteJson(value){
 if(typeof value==='number')assert.ok(Number.isFinite(value));
 else if(value&&typeof value==='object')for(const item of Object.values(value))finiteJson(item);
 assert.doesNotThrow(()=>JSON.stringify(value));
}
function fixtures(){
 return {statistics:describeSignal([new Float64Array(sr)],sr),temporal:temporalEvidence([sine()],sr)};
}

test('silence preserves zero quantiles, null dynamic range and full low energy',()=>{
 const result=summarize([new Float64Array(sr)],{offset:3.5});
 assert.deepEqual(result.energy.rms_quantiles,{p10:0,p50:0,p90:0});
 assert.equal(result.energy.dynamic_range_db,null);
 assert.equal(result.energy.dynamic_range_unavailable_reason,'zero_p10_rms');
 const low=result.energy.low_energy;
 assert.equal(low.bin_count,10);assert.equal(low.interval_count,1);
 near(low.duration_seconds,1);near(low.fraction,1);
 assert.deepEqual(low.intervals,[{from:3.5,to:4.5}]);assert.equal(low.truncated,false);
 assert.equal(low.omitted_interval_count,0);
 assert.equal(result.pitch.available_window_count,0);
 assert.equal(result.pitch.available_window_fraction,0);
 assert.equal(result.pitch.unavailable_reason,'no_pitch_candidates');
 assert.deepEqual(result.pitch.frequency_hz_quantiles,{p10:null,p50:null,p90:null});
 assert.equal(result.pitch.span_semitones,null);assert.equal(result.diagnostics.digital_zero,true);
 finiteJson(result);
});

test('220 Hz summaries have explicit units, parameters and modest evidence claims',()=>{
 const result=summarize([sine()]);
 for(const hz of Object.values(result.pitch.frequency_hz_quantiles))near(hz,220,.1);
 near(result.pitch.span_semitones,0,.001);
 assert.equal(result.pitch.available_window_fraction,1);assert.equal(result.pitch.unavailable_reason,null);
 assert.equal(result.pitch.available_window_count,result.pitch.window_count);
 near(result.energy.rms_quantiles.p50,.5/Math.sqrt(2),.002);
 assert.equal(result.energy.low_energy.bin_count,0);assert.deepEqual(result.energy.low_energy.intervals,[]);
 assert.equal(result.energy.dynamic_range_unavailable_reason,null);
 assert.equal(result.units.time,'absolute source seconds');assert.equal(result.units.frequency,'Hz');
 assert.equal(result.parameters.energy_window_samples,200);assert.equal(result.parameters.energy_hop_samples,80);
 assert.equal(result.parameters.pitch_window_seconds,.064);assert.equal(result.parameters.pitch_max_frames,200);
 assert.equal(result.parameters.pitch_channel,0);
 const notes=result.limitations.join(' ');
 for(const pattern of [/25 ms forward/,/owned 10 ms hops/,/not independent 100 ms RMS/,/not VAD or a true pause/,/not LUFS/,/not voicing probability/,/not confidence/,/not a complete intonation contour/,/do not establish clipping/])assert.match(notes,pattern);
 finiteJson(result);
});

test('changing pitch produces Hz quantiles and a semitone amplitude-independent span',()=>{
 const x=Float64Array.from({length:2*sr},(_,i)=>.5*Math.sin(2*Math.PI*(i<sr?220:440)*i/sr));
 const result=summarize([x]);
 near(result.pitch.frequency_hz_quantiles.p10,220,.1);
 near(result.pitch.frequency_hz_quantiles.p90,440,.1);
 near(result.pitch.span_semitones,12,.01);
});

test('low-energy runs use absolute bin coverage, forward-window boundaries and actual tail duration',()=>{
 const pcm=new Float64Array(Math.round(1.05*sr));pcm.fill(.5,Math.round(.3*sr),Math.round(.6*sr));
 const statistics=describeSignal([pcm],sr,{offset:7});
 const result=measurementEvidence(statistics,temporalEvidence([pcm],sr,{offset:7}));
 // The forward 25 ms windows make the last pre-attack display bin non-low.
 assert.deepEqual(result.energy.low_energy.intervals,[{from:7,to:7.2},{from:7.6,to:8.05}]);
 assert.equal(result.energy.low_energy.bin_count,7);
 near(result.energy.low_energy.duration_seconds,.65);
 near(result.energy.low_energy.covered_duration_seconds,1.05);
 near(result.energy.low_energy.fraction,.65/1.05);
 assert.equal(result.coverage.to,8.05);
 const tiny=summarize([new Float64Array(1)],{offset:2});
 assert.deepEqual(tiny.energy.low_energy.intervals,[{from:2,to:2+1/sr}]);
 near(tiny.energy.low_energy.duration_seconds,1/sr);near(tiny.energy.low_energy.fraction,1);
 assert.equal(tiny.pitch.window_count,0);assert.equal(tiny.pitch.available_window_fraction,null);
 assert.equal(tiny.pitch.unavailable_reason,'no_pitch_windows');finiteJson(tiny);
});

test('gain, DC and opposite phase preserve diagnostics without clipping inference',()=>{
 const x=sine(),a=summarize([x]);
 const b=summarize([Float64Array.from(x,v=>v*.2)]);
 near(b.energy.rms_quantiles.p50,a.energy.rms_quantiles.p50*.2);
 near(b.pitch.frequency_hz_quantiles.p50,a.pitch.frequency_hz_quantiles.p50);
 const dc=Float64Array.from(x,v=>v+.75),statistics=describeSignal([dc],sr);
 const result=measurementEvidence(statistics,temporalEvidence([dc],sr));
 assert.deepEqual(result.diagnostics.channels,statistics.channels);
 near(result.diagnostics.channels[0].dc,.75);
 assert.ok(result.diagnostics.channels[0].overrange_count>0);
 assert.ok(result.diagnostics.channels[0].near_full_scale_fraction>0);
 const opposite=summarize([x,Float64Array.from(x,v=>-v)]);
 near(opposite.diagnostics.stereo.correlation,-1);
 assert.equal(opposite.diagnostics.stereo.phase_cancellation_risk,true);
 near(opposite.energy.rms_quantiles.p50,a.energy.rms_quantiles.p50);
 near(opposite.pitch.frequency_hz_quantiles.p50,220,.1);
 assert.equal(a.diagnostics.stereo,null);
 assert.equal(a.diagnostics.stereo_unavailable_reason,'requires_exactly_two_channels');
 finiteJson(result);finiteJson(opposite);
});

test('interval cap retains unrelated runs separately and full counts, duration and fraction',()=>{
 const {statistics,temporal}=fixtures();
 statistics.energy=Array.from({length:406},(_,i)=>({from:10+i*.125,to:10+(i+1)*.125,rms:i%4<2?0:.1}));
 const result=measurementEvidence(statistics,temporal),low=result.energy.low_energy;
 assert.equal(low.interval_count,102);assert.equal(low.bin_count,204);
 assert.equal(low.intervals.length,100);assert.equal(low.truncated,true);assert.equal(low.omitted_interval_count,2);
 near(low.duration_seconds,25.5);near(low.fraction,204/406);
 assert.deepEqual(low.intervals[0],{from:10,to:10.25});
 assert.deepEqual(low.intervals.at(-1),{from:59.5,to:59.75});
 assert.ok(low.intervals.every((run,i)=>!i||run.from>low.intervals[i-1].to));
});

test('strict threshold, disjoint bins, first-candidate rule and linear quantiles',()=>{
 const {statistics,temporal}=fixtures();
 statistics.energy=[{from:0,to:.1,rms:.001},{from:.1,to:.2,rms:.0005},{from:.3,to:.4,rms:0},{from:.4,to:.5,rms:.1}];
 temporal.pitch.frames=[{candidates:[{frequency_hz:100,periodicity:.81},{frequency_hz:900,periodicity:1}]},{candidates:[]},{candidates:[{frequency_hz:400,periodicity:.99}]}];
 const r=measurementEvidence(statistics,temporal);
 assert.deepEqual(r.energy.low_energy.intervals,[{from:.1,to:.2},{from:.3,to:.4}]);
 assert.deepEqual(r.pitch.frequency_hz_quantiles,{p10:130,p50:250,p90:370});
 near(r.pitch.span_semitones,12*Math.log2(370/130));near(r.pitch.available_window_fraction,2/3);
 near(r.energy.rms_quantiles.p10,.00015);near(r.energy.dynamic_range_db,20*Math.log10(.0703/.00015));
});

test('empty evidence is explicit and summarization does not mutate or alias its inputs',()=>{
 const {statistics,temporal}=fixtures();statistics.energy=[];temporal.pitch.frames=[];
 const before=structuredClone({statistics,temporal});
 const r=measurementEvidence(statistics,temporal);
 assert.deepEqual({statistics,temporal},before);
 assert.equal(r.energy.dynamic_range_unavailable_reason,'no_energy_bins');
 assert.deepEqual(r.energy.rms_quantiles,{p10:null,p50:null,p90:null});
 assert.equal(r.energy.low_energy.fraction,null);assert.equal(r.energy.low_energy.unavailable_reason,'no_energy_bins');
 assert.equal(r.energy.low_energy.interval_count,0);assert.equal(r.pitch.span_semitones,null);
 r.diagnostics.channels[0].frame_rms_quantiles.p10=123;r.coverage.from=999;
 assert.deepEqual({statistics,temporal},before);finiteJson(r);
});

test('actual PCM threshold rounding agrees with signal power tolerance and declares dB floor',()=>{
 for(const [amplitude,expected] of [[.001,0],[.001*(1-1e-8),1],[.001*(1+1e-8),0]]){
  const pcm=new Float64Array(sr).fill(amplitude),statistics=describeSignal([pcm],sr);
  const result=measurementEvidence(statistics,temporalEvidence([pcm],sr));
  near(result.energy.low_energy.fraction,expected);near(result.energy.low_energy.fraction,statistics.low_energy_fraction);
 }
 const tiny=summarize([new Float64Array(sr).fill(1e-20)]);
 assert.equal(tiny.parameters.diagnostics_dbfs_floor,-240);assert.equal(tiny.parameters.diagnostics_dbfs_zero,null);
 assert.equal(tiny.diagnostics.channels[0].rms_dbfs,-240);finiteJson(tiny);
});

test('long synthetic tone reports at most 200 sampled windows, not whole-clip voicing',()=>{
 const r=summarize([sine(220,14)]);
 assert.equal(r.pitch.window_count,200);assert.equal(r.pitch.available_window_count,200);
 assert.equal(r.pitch.available_window_fraction,1);assert.equal(r.coverage.to,14);finiteJson(r);
});
