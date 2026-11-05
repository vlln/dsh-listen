import test from 'node:test';
import assert from 'node:assert/strict';
import {spectrumEvidence} from '../../src/dsp-spectrum.mjs';

const near=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected} ± ${tolerance}`);
const tone=(n,sr,hz,gain=.5)=>Float64Array.from({length:n},(_,i)=>gain*Math.sin(2*Math.PI*hz*i/sr));

test('bin-centred and off-bin sine peaks have truthful FFT precision',()=>{
 for(const sr of [8000,44100,48000,192000]){
  const size=Math.max(1024,Math.min(16384,2**Math.ceil(Math.log2(sr*.09))));
  const hz=37*sr/size,r=spectrumEvidence([tone(size,sr,hz)],sr);
  assert.equal(r.parameters.fft_size,size);assert.equal(r.parameters.hop_samples,size/2);
  near(r.parameters.bin_width_hz,sr/size);near(r.peaks[0].frequency_hz,hz,1e-6);
  near(r.peaks[0].relative_power_db,0);assert.ok(r.peaks.length<=12);
 }
 const r=spectrumEvidence([tone(8192,48000,440)],48000);
 near(r.peaks[0].frequency_hz,440,r.parameters.bin_width_hz*.03);
 assert.match(r.limitations.join(' '),/zero padding.*no frequency information/);
});

test('two-tone band fraction is a ratio of linear power, independent of gain',()=>{
 const sr=48000,n=8192,lo=40*sr/n,hi=160*sr/n;
 const x=Float64Array.from({length:n},(_,i)=>Math.sin(2*Math.PI*lo*i/sr)+.5*Math.sin(2*Math.PI*hi*i/sr));
 const options={band:[lo-4*sr/n,lo+4*sr/n]};
 const r=spectrumEvidence([x],sr,options),scaled=spectrumEvidence([Float64Array.from(x,v=>v*.001)],sr,options);
 near(r.band_energy.power_fraction,.8,1e-10);near(scaled.band_energy.power_fraction,.8,1e-10);
 assert.deepEqual(r.band_energy.range_hz,options.band);assert.equal(r.peaks.length,2);
 near(r.peaks[1].relative_power_db,10*Math.log10(.25),1e-8);
 for(let i=0;i<12;i++)near(r.chroma.values[i],scaled.chroma.values[i]);
 const all=spectrumEvidence([x],sr,{band:[0,sr/2]});near(all.band_energy.power_fraction,1);
});

test('A440 chroma is normalized pitch class evidence, not a chord label',()=>{
 const r=spectrumEvidence([tone(48000,48000,440)],48000);
 assert.deepEqual(r.chroma.labels,['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']);
 near(r.chroma.values.reduce((a,b)=>a+b,0),1);assert.ok(r.chroma.values[9]>.9);
 assert.equal(r.chroma.tuning_reference_hz,440);assert.equal(r.band_energy,null);
 assert.match(r.limitations.join(' '),/not a chord/);
});

test('silence and constant DC invent neither peaks nor chroma',()=>{
 for(const x of [new Float64Array(8000),new Float64Array(3),new Float64Array(1024).fill(.5),new Float64Array(1024).fill(.1)]){
  const r=spectrumEvidence([x],8000,{band:[0,4000]});
  assert.deepEqual(r.peaks,[]);assert.deepEqual(r.chroma.values,new Array(12).fill(0));
  assert.equal(r.band_energy.power_fraction,0);assert.doesNotThrow(()=>JSON.stringify(r));
 }
});

test('native channel power preserves opposite phase and averages unequal channels',()=>{
 const sr=48000,n=8192,x=tone(n,sr,750),y=tone(n,sr,3000);
 const mono=spectrumEvidence([x],sr,{band:[700,800]});
 const anti=spectrumEvidence([x,Float64Array.from(x,v=>-v)],sr,{band:[700,800]});
 assert.deepEqual(anti.peaks,mono.peaks);assert.deepEqual(anti.chroma,mono.chroma);
 near(anti.band_energy.power_fraction,mono.band_energy.power_fraction);
 const mixed=spectrumEvidence([x,y],sr,{band:[700,800]});near(mixed.band_energy.power_fraction,.5,1e-8);
 assert.equal(anti.parameters.channel_aggregation,'power_mean');
});

test('Nyquist bin is included once, not doubled or interpolated beyond Nyquist',()=>{
 const sr=8000,n=1024,x=Float64Array.from({length:n},(_,i)=>(i%2?-.5:.5));
 const r=spectrumEvidence([x],sr,{band:[3980,4000]});
 near(r.peaks[0].frequency_hz,4000);near(r.band_energy.power_fraction,1,1e-8);
 assert.ok(r.peaks.every(p=>p.frequency_hz<=4000));
});

test('short and partial windows report real coverage and zero padding',()=>{
 const short=spectrumEvidence([tone(100,8000,500)],8000,{offset:7});
 near(short.coverage.from,7);near(short.coverage.to,7.0125);
 assert.equal(short.coverage.padded_frames,1);assert.equal(short.coverage.sampled_fraction,1);
 near(short.parameters.observed_window_seconds,.0125);assert.ok(short.peaks.length>0);
 const tail=spectrumEvidence([tone(1300,8000,500)],8000);
 assert.equal(tail.coverage.available_frames,2);assert.equal(tail.coverage.padded_frames,1);
 assert.equal(tail.coverage.sampled_fraction,1);near(tail.coverage.to,1300/8000);
});

test('long intervals use deterministic bounded sampling including both ends',()=>{
 const sr=8000,n=sr*60,x=tone(n,sr,500);
 const a=spectrumEvidence([x],sr,{offset:11}),b=spectrumEvidence([x],sr,{offset:11});
 assert.deepEqual(a,b);assert.equal(a.coverage.sampled_frames,300);
 assert.ok(a.coverage.available_frames>300);assert.ok(a.coverage.frame_stride>1);
 assert.ok(a.coverage.frame_stride_max-a.coverage.frame_stride_min<=1);
 assert.ok(a.coverage.sampled_fraction>0&&a.coverage.sampled_fraction<1);
 near(a.coverage.sampled_seconds,a.coverage.sampled_fraction*60);
 near(a.coverage.to,71);assert.equal(a.coverage.padded_frames,1);
});

test('only valid options and physical bands accepted; PCM is validated upstream',()=>{
 const x=[new Float64Array(1024)];
 for(const offset of [-1,NaN,Infinity,'1'])assert.throws(()=>spectrumEvidence(x,8000,{offset}),/INVALID_OFFSET/);
 for(const band of [[-1,100],[100,100],[200,100],[0,4001],[0,Infinity],[0],['0',100],new Float64Array([0,100])])assert.throws(()=>spectrumEvidence(x,8000,{band}),/INVALID_BAND/);
 for(const options of [null,[],42,{unknown:true}])assert.throws(()=>spectrumEvidence(x,8000,options),/INVALID_SPECTRUM_OPTIONS/);
 assert.doesNotThrow(()=>spectrumEvidence(x,8000,{offset:0,band:null}));
});
