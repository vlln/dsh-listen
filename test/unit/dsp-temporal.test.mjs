import test from 'node:test';
import assert from 'node:assert/strict';
import {temporalEvidence} from '../../src/dsp-temporal.mjs';
const sine=(hz,seconds=1,sr=16000,gain=.5)=>Float32Array.from({length:Math.round(seconds*sr)},(_,i)=>gain*Math.sin(2*Math.PI*hz*i/sr));
const near=(a,b,tolerance)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} not within ${tolerance} of ${b}`);
function clicks(seconds=8,sr=16000,bpm=120){
 const pcm=new Float32Array(seconds*sr);
 for(let t=.2;t<seconds;t+=60/bpm)for(let i=0;i<Math.round(.004*sr);i++)pcm[Math.round(t*sr)+i]=.8*(1-i/(.004*sr));
 return pcm;
}
function noise(seconds=1,sr=16000){let state=1024;return Float32Array.from({length:seconds*sr},()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return (state/2**32-.5)*.8;});}

test('silence gives no pitch, onsets or fabricated tempo',()=>{
 const result=temporalEvidence([new Float32Array(64000)],16000);
 assert.ok(result.pitch.frames.length>0);
 assert.ok(result.pitch.frames.every(frame=>frame.candidates.length===0));
 assert.deepEqual(result.rhythm.onsets,[]);assert.deepEqual(result.rhythm.tempo_candidates,[]);
 assert.match(result.rhythm.limitations.join(' '),/Insufficient/);
});
test('440 and 220 Hz tones have correct first monophonic candidates at original rates',()=>{
 for(const [hz,sr] of [[440,8000],[220,16000],[440,44100],[220,192000]]){
  const result=temporalEvidence([sine(hz,.4,sr)],sr);
  for(const frame of result.pitch.frames){assert.ok(frame.candidates.length);near(frame.candidates[0].frequency_hz,hz,1);assert.ok(frame.candidates[0].periodicity>.98);}
  assert.equal(result.parameters.pitch_sample_rate_hz,sr);
  assert.match(result.pitch.limitations.join(' '),/not calibrated confidence/);
 }
});
test('steady carriers across frequencies phases and rates cannot fabricate rhythm',()=>{
 for(const sr of [8000,44100,48000])for(const hz of [60,61,220,440,997])for(const phase of [0,.7]){
  const x=Float64Array.from({length:4*sr},(_,i)=>.5*Math.sin(2*Math.PI*hz*i/sr+phase));
  const r=temporalEvidence([x],sr);
  assert.deepEqual(r.rhythm.onsets,[],`${hz} Hz, ${sr} Hz rate, phase ${phase}`);
  assert.deepEqual(r.rhythm.tempo_candidates,[]);
 }
});
test('60 Hz boundary and DC-offset tiny tones retain pitch and AC channel selection',()=>{
 for(const sr of [8000,44100,48000,192000]){
  const r=temporalEvidence([sine(60,.2,sr)],sr);
  assert.ok(r.pitch.frames.every(f=>f.candidates.some(c=>Math.abs(c.frequency_hz-60)<.1)),`${sr} Hz rate`);
 }
 const sr=8000,x=Float64Array.from({length:sr},(_,i)=>.1+1e-8*Math.sin(2*Math.PI*220*i/sr));
 const r=temporalEvidence([x],sr);near(r.pitch.frames[0].candidates[0].frequency_hz,220,1);
 const selected=temporalEvidence([new Float64Array(sr).fill(.9),x],sr);
 assert.equal(selected.parameters.pitch_channel,1);near(selected.pitch.frames[0].candidates[0].frequency_hz,220,1);
 assert.match(selected.parameters.pitch_channel_selection,/dc_removed/);
});
test('seeded broadband noise is not a pitched tone',()=>{
 const result=temporalEvidence([noise(2)],16000);
 assert.ok(result.pitch.frames.every(frame=>frame.candidates.length===0));
 assert.ok(result.rhythm.tempo_candidates.length===0);
});
test('pitch and rhythm are invariant to nonzero gain',()=>{
 const x=sine(440),a=temporalEvidence([x],16000),b=temporalEvidence([Float32Array.from(x,v=>v*1e-5)],16000);
 for(let i=0;i<a.pitch.frames.length;i++){near(a.pitch.frames[i].candidates[0].frequency_hz,b.pitch.frames[i].candidates[0].frequency_hz,1e-4);near(a.pitch.frames[i].candidates[0].periodicity,b.pitch.frames[i].candidates[0].periodicity,1e-6);}
 const click=clicks(),r=temporalEvidence([click],16000).rhythm,s=temporalEvidence([Float32Array.from(click,v=>v*.01)],16000).rhythm;
 assert.equal(r.onsets.length,s.onsets.length);
 for(let i=0;i<r.onsets.length;i++){assert.equal(r.onsets[i].time,s.onsets[i].time);near(r.onsets[i].strength,s.onsets[i].strength,1e-6);}
 assert.deepEqual(r.tempo_candidates.map(c=>c.bpm),s.tempo_candidates.map(c=>c.bpm));
});
test('opposite-phase stereo cannot cancel pitch or full-band rhythm evidence',()=>{
 const x=sine(220),negative=Float32Array.from(x,v=>-v),r=temporalEvidence([x,negative],16000);
 assert.equal(r.parameters.pitch_channel,0);near(r.pitch.frames[0].candidates[0].frequency_hz,220,1);
 const louder=sine(440,1,16000,.9),s=temporalEvidence([x,louder],16000);
 assert.equal(s.parameters.pitch_channel,1);near(s.pitch.frames[0].candidates[0].frequency_hz,440,1);
 const click=clicks(),mono=temporalEvidence([click],16000),stereo=temporalEvidence([click,Float32Array.from(click,v=>-v)],16000);
 assert.deepEqual(stereo.rhythm,mono.rhythm);
});
test('120 bpm click trains retain true tempo and half/double ambiguity',()=>{
 const result=temporalEvidence([clicks()],16000),{onsets,tempo_candidates}=result.rhythm;
 assert.equal(onsets.length,16);
 near(onsets[0].time,.2,.01);
 for(const bpm of [60,120,240])assert.ok(tempo_candidates.some(c=>Math.abs(c.bpm-bpm)<2),`Missing ${bpm}: ${JSON.stringify(tempo_candidates)}`);
 assert.ok(tempo_candidates.every(c=>c.kind==='metrical_alternative'?c.score===null:c.kind==='autocorrelation_peak'&&c.score>=0&&c.score<=1));
 const alternative=tempo_candidates.find(c=>Math.abs(c.bpm-240)<2);
 assert.equal(alternative.kind,'metrical_alternative');assert.equal(alternative.score,null);
 assert.equal(tempo_candidates.find(c=>Math.abs(c.bpm-120)<2).kind,'autocorrelation_peak');
 assert.match(result.rhythm.limitations.join(' '),/half\/double/);
 assert.equal(result.parameters.rhythm_method,'full_band_power_energy_onset');
});
test('offset changes only absolute coverage, pitch frame and onset times',()=>{
 const x=clicks(4),a=temporalEvidence([x],16000),b=temporalEvidence([x],16000,{offset:12.5});
 assert.equal(b.coverage.from,12.5);assert.equal(b.coverage.to,16.5);
 for(let i=0;i<a.pitch.frames.length;i++){near(b.pitch.frames[i].from,a.pitch.frames[i].from+12.5,1e-12);near(b.pitch.frames[i].to,a.pitch.frames[i].to+12.5,1e-12);assert.deepEqual(b.pitch.frames[i].candidates,a.pitch.frames[i].candidates);}
 for(let i=0;i<a.rhythm.onsets.length;i++)near(b.rhythm.onsets[i].time,a.rhythm.onsets[i].time+12.5,1e-12);
 assert.deepEqual(a.rhythm.tempo_candidates,b.rhythm.tempo_candidates);
});
test('short clips and DC cannot fabricate tempo or pitch',()=>{
 const short=temporalEvidence([clicks(1)],16000);
 assert.deepEqual(short.rhythm.tempo_candidates,[]);assert.match(short.rhythm.limitations.join(' '),/Insufficient/);
 const tiny=temporalEvidence([Float32Array.of(.5)],8000);
 assert.deepEqual(tiny.pitch.frames,[]);assert.match(tiny.pitch.limitations.join(' '),/Insufficient/);
 const dc=temporalEvidence([new Float32Array(16000).fill(.5)],16000);
 assert.ok(dc.pitch.frames.every(f=>f.candidates.length===0));assert.deepEqual(dc.rhythm.tempo_candidates,[]);
});
test('pitch work is capped and frames span the full requested interval',()=>{
 const result=temporalEvidence([sine(220,20,8000)],8000);
 assert.equal(result.pitch.frames.length,200);
 assert.equal(result.pitch.frames[0].from,0);assert.equal(result.pitch.frames.at(-1).to,20);
 assert.ok(result.coverage.pitch_sampled_seconds<20);
});
test('high-band click power remains visible without resampling and invalid inputs fail explicitly',()=>{
 const sr=48000,x=new Float32Array(sr*4);
 for(let t=.2;t<4;t+=.5)for(let i=0;i<480;i++)x[Math.round(t*sr)+i]=Math.sin(2*Math.PI*12000*i/sr);
 const result=temporalEvidence([x],sr);assert.equal(result.rhythm.onsets.length,8);
 assert.throws(()=>temporalEvidence([x],sr,{offset:-1}),/INVALID_OFFSET/);
 assert.throws(()=>temporalEvidence([x],sr,{offset:NaN}),/INVALID_OFFSET/);
 assert.throws(()=>temporalEvidence([],sr),/INVALID_CHANNEL_COUNT/);
 assert.throws(()=>temporalEvidence([Float32Array.of(NaN)],sr),/NONFINITE_SAMPLE/);
});
