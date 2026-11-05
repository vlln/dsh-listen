import test from 'node:test';
import assert from 'node:assert/strict';
import FFT from 'fft.js';
import {analyzeSignal} from '../../src/analysis.mjs';
import {executeAnalysis} from '../../src/analysis-worker.mjs';
import {ANALYSIS_FEATURES,selectiveAnalysis} from '../../src/selective-analysis.mjs';
import {spectrumEvidence} from '../../src/dsp-spectrum.mjs';
import {temporalEvidence} from '../../src/dsp-temporal.mjs';
const sr=8000;
const tone=seconds=>[Float32Array.from({length:sr*seconds},(_,i)=>.3*Math.sin(2*Math.PI*220*i/sr))];
const opts=features=>({kind:'features',features,offset:3,band:[180,260],columns:20});

test('every selective feature returns exactly its requested key, with local parameters',()=>{
 const channels=tone(.3);
 for(const feature of ANALYSIS_FEATURES){
  const result=executeAnalysis({channels,sampleRate:sr,options:opts([feature])});
  assert.equal(result.status,'ready',JSON.stringify(result));
  assert.deepEqual(Object.keys(result.evidence),[feature]);
  const item=result.evidence[feature];
  assert.equal(item.status,'ready');assert.equal(typeof item.method,'string');
  assert.equal(item.coverage.from,3);
  assert.ok(!('limitations' in item));
  if(feature==='signal_image')assert.ok(!('limitations' in item.image));
  if(feature==='levels'){
   assert.ok(!('window_samples' in item.parameters));
   assert.ok(!('frame_rms_quantiles' in item.channels[0]));
   assert.ok(!('low_energy_fraction' in item.channels[0]));
  }
  assert.equal(!!result.png,feature==='signal_image');
  if(feature.startsWith('pitch'))assert.ok(!('rhythm_method' in item.parameters));
  if(feature==='onsets'||feature==='tempo')assert.ok(!('pitch_method' in item.parameters));
  if(feature==='onsets')assert.ok(!('tempo_range_bpm' in item.parameters));
  if(feature!=='spectral_peaks')assert.ok(!('peak_floor_db' in item.parameters));
 }
});

test('selected projections are independent of companion requests and order',()=>{
 const channels=tone(.4),features=ANALYSIS_FEATURES.filter(f=>f!=='signal_image');
 const combined=selectiveAnalysis(channels,sr,opts(features));
 assert.deepEqual(Object.keys(combined.evidence).sort(),[...features].sort());
 for(const feature of features){
  const alone=selectiveAnalysis(channels,sr,opts([feature]));
  assert.deepEqual(alone.evidence[feature],combined.evidence[feature],feature);
 }
 assert.deepEqual(selectiveAnalysis(channels,sr,opts([...features].reverse())),combined);
 assert.ok(!('frames' in combined.evidence.pitch));
 assert.ok(!('frequency_hz_quantiles' in combined.evidence.pitch_frames));
 assert.ok(Array.isArray(combined.evidence.energy.bins));
 assert.ok(!('diagnostics' in combined.evidence.energy));
 assert.ok(!('energy' in combined.evidence.levels));
});

test('onsets-only performs no FFT pitch work; pitch-only performs no rhythm work',()=>{
 const channels=tone(4),original=FFT.prototype.realTransform;let transforms=0;
 FFT.prototype.realTransform=function(...args){transforms++;return original.apply(this,args);};
 try{
  const onsets=temporalEvidence(channels,sr,{features:['onsets']});
  assert.equal(transforms,0);assert.ok(!('pitch' in onsets));
  assert.deepEqual(onsets.rhythm.tempo_candidates,[]);
  assert.equal(onsets.rhythm.limitations.length,3); // No insufficient-tempo branch.
  const pitch=temporalEvidence(channels,sr,{features:['pitch']});
  assert.ok(transforms>0);assert.ok(!('rhythm' in pitch));
  assert.ok(pitch.pitch.frames[0].candidates.length);
 }finally{FFT.prototype.realTransform=original;}
});

test('spectral products are separately selected and share one FFT pass',()=>{
 const channels=tone(.3),original=FFT.prototype.realTransform;let transforms=0;
 FFT.prototype.realTransform=function(...args){transforms++;return original.apply(this,args);};
 try{
  for(const feature of ['spectral_peaks','band_energy','chroma']){
   const result=spectrumEvidence(channels,sr,{features:[feature],band:[180,260]});
   for(const [name,key] of [['spectral_peaks','peaks'],['band_energy','band_energy'],['chroma','chroma']])assert.equal(key in result,name===feature);
  }
  transforms=0;spectrumEvidence(channels,sr,{features:['chroma']});const once=transforms;
  transforms=0;spectrumEvidence(channels,sr,{features:['chroma','spectral_peaks','band_energy']});assert.equal(transforms,once);
 }finally{FFT.prototype.realTransform=original;}
});

test('analysis feature enum validation occurs before worker execution',async()=>{
 for(const features of [undefined,null,[],['unknown'],['pitch','pitch'],['pitch',4],'pitch']){
  await assert.rejects(analyzeSignal(tone(.1),sr,{kind:'features',features}),/INVALID_ANALYSIS_FEATURES/);
 }
 await assert.rejects(analyzeSignal(tone(.1),sr,{kind:'dsp',features:['pitch']}),/INVALID_ANALYSIS_FEATURES/);
 const ready=await analyzeSignal(tone(.2),sr,opts(['pitch','onsets']));
 assert.deepEqual(Object.keys(ready.evidence).sort(),['onsets','pitch']);
 assert.equal(ready.status,'ready');
});

test('image-only bypasses signal description and preserves legacy image output',()=>{
 const result=selectiveAnalysis(tone(.1),sr,opts(['signal_image']));
 assert.ok(Buffer.isBuffer(result.png));
 assert.ok(!('statistics' in result));assert.ok(!('energy' in result.evidence.signal_image));
 const legacy=executeAnalysis({channels:tone(.1),sampleRate:sr,options:{columns:20}});
 assert.ok(legacy.statistics.energy.length);assert.ok(legacy.png);
});
