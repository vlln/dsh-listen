import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import FFT from 'fft.js';
import {preparePlot} from '../../src/plot-data.mjs';
import {computeSpectrum} from '../../src/spectrum.mjs';
import {renderPlot} from '../../src/image.mjs';
import {selectiveAnalysis} from '../../src/selective-analysis.mjs';

const sr=8000;
const fixtures=(kind,n)=>Array.from({length:n},(_,c)=>Float64Array.from({length:kind==='short'?17:4609},(_,i)=>kind==='zero'?0:(c%2?-1:1)*(.24*Math.sin(2*Math.PI*(250+125*c)*i/sr)+(i%997===0?.5:0))));
// SHA-256(JSON.stringify(evidence) || PNG), captured before this optimization.
// Order: detail tonal/transient/balanced, channels 1/2/6, mixed/zero/short.
const originalHashes=[
 'a7837e9496efecb7fee6c3e27e1cdcf4fe7863cf97000e6fe1eeb5ec4286b3fe',
 '3d8084a24b01b6a33a3c05c1838300ff510786a5290e03e68c71d2cb75bf6997',
 '12e77a1dccec4350bf202699121d54dfd1488d52be02e5b9d7ff6aacffa76887',
 '13eb70354a27f0869acea4874d021efda3f4da381775c83fb223695609f96e11',
 'a0bc1bf9462ae30adefeb3d053eaf545567a78595d2df1e5e8195384a01daf5e',
 '1caeef4a9895ecab8092a74569c589314c3ef6e8215a6dab61926eaa81e438a8',
 '2043589e253b08fb2d1412447652eb938a07bee6e3ed00b9abffccf1f82c9f88',
 'd1e73930de410dcdc833ebbb1cf148209573f26f222a7ad48b178bf61562c5b3',
 'e5778e508890e234ece46cb464a25d2ccd48ee58421650166e9faf7ac93802f1',
 'e4467622a37f566cd368fe8069f2e06ec5f6ade7ca417579687185f153614146',
 'cee2232de456beb79ac01b72ed7606941be86a07de5da07c35faaa29919a5c6d',
 'd9c817d12d1e23cb58866f9847f6d7f21b06728463361a81fab7d4c4f055fa9f',
 'c3167446b4e94bb1d5e35c8581ed4c6b3dc865a8d60612772a5fcc245becd8dd',
 'cba6be3d502a5dc427df9fa48c07d62d26d9eb9f6cd268feee94e2f3ae349d90',
 'd9c138eb6cf60ab7288fe35176f1dbf7f3e1dce8d90e124c8715b10da6c9931d',
 'a3cf97485ef22333fe3955731fa0cb110bd9d36914f0d253765034177f3e774e',
 '2c145c95d0fad8144f693ad1fc9ce22372729c40a7fa6e58138bbf15d549c950',
 'fd413b8d20ebf3c130df1694cb1a56df2c668763ea9e9f4571cd088f980be407',
 'aa0c0fd7d6d3c53002c277a65216365f211cb4ec015211e0672674308389f2b5',
 'c60b297340dfb5c286d2ca34ec0addb9a2ffade72c6fdda99ee7724111da9ad7',
 '6520051d43abe78a627d022c54b9bff4225e6c20ad19f4b1e11f103ef9f19ef7',
 '9d34012321f2ca7503f7c166ea2a05763cb3cf8be1adb48ae7ff745cfeee6ed1',
 '7ac5a01a900956946dc2d53ba57eee39467483d6c9a3e62016ba5ef353eaa787',
 'e3a5b436db7ad5fe0b1852fa918e116804ef276e5681fb44eaec78ee4a487f0f',
 'e996be54a52884e576cacc4bf74cc71ac6bb4b6878b996726c1ed0b47fc65c6f',
 '32e7335e36a5b770f368d27338c6d35f72cd6e2851eb0f91ee46ff4e87f01764',
 '4e0cfc6d587c5a6cc4e8c2678233fd1b082afcf921a7ea6c6e2da394b2564cfc'
];
let hashIndex=0;
for(const detail of ['tonal','transient','balanced'])for(const n of [1,2,6])for(const kind of ['mixed','zero','short']){
 const expectedHash=originalHashes[hashIndex++];
 test(`image bytes and returned metadata unchanged: ${detail}/${n}/${kind}`,()=>{
  const channels=fixtures(kind,n),options={features:['signal_image'],detail,offset:3.25,columns:31,frequencyRange:[100,3000],channelView:n===2?'power_mean':'separate'};
  const legacy=preparePlot(channels,sr,{...options,includeEnergy:false});
  const optimized=preparePlot(channels,sr,{...options,includeEnergy:false,includeStatistics:false});
  const {spectral_statistics,statistics_parameters,...visibleLegacy}=legacy;
  assert.deepEqual(optimized,visibleLegacy);
  assert.equal(spectral_statistics.length,n);assert.equal(statistics_parameters.detail,'balanced');
  const oldImage=renderPlot(legacy),newImage=renderPlot(optimized);
  assert.deepEqual(newImage,oldImage);
  const result=selectiveAnalysis(channels,sr,options);
  assert.deepEqual(result.png,oldImage.png);
  const {limitations,...image}=oldImage.metadata;
  assert.deepEqual(result.evidence,{signal_image:{status:'ready',method:'signal-image-v1',coverage:legacy.coverage,parameters:legacy.parameters,frequency_hz:legacy.frequency_hz,image}});
  assert.equal(createHash('sha256').update(JSON.stringify(result.evidence)).update(result.png).digest('hex'),expectedHash);
 });
}

test('only the image statistics pass is removed, with legacy defaults retained',()=>{
 const channels=fixtures('mixed',2),original=FFT.prototype.realTransform;
 let transforms=0;
 FFT.prototype.realTransform=function(...args){transforms++;return original.apply(this,args);};
 try{
  for(const detail of ['tonal','transient','balanced']){
   transforms=0;const legacy=preparePlot(channels,sr,{detail,columns:8,includeEnergy:false});const baseline=transforms;
   transforms=0;selectiveAnalysis(channels,sr,{detail,columns:8,features:['signal_image']});
   const size={tonal:4096,transient:1024,balanced:2048}[detail];
   const frames=Math.max(1,Math.ceil((channels[0].length-size)/(size/4))+1)*channels.length;
   assert.equal(transforms,frames);
   assert.equal(baseline,frames+(detail==='balanced'?0:14));
   assert.deepEqual(preparePlot(channels,sr,{detail,columns:8,includeEnergy:false,includeStatistics:true}),legacy);
   const full=computeSpectrum(channels,sr,{detail}),lean=computeSpectrum(channels,sr,{detail,includeStatistics:false});
   assert.deepEqual(computeSpectrum(channels,sr,{detail,includeStatistics:true}),full);
   assert.ok(full.channels.some(c=>c.summary));
   assert.ok(lean.channels.every(c=>c.summary===null&&c.valid_fraction===0&&c.frames.every(f=>f.statistics===null)));
   const withoutStats=r=>r.channels.map(c=>c.frames.map(({statistics,...frame})=>frame));
   assert.deepEqual(withoutStats(lean),withoutStats(full));
   assert.equal(lean.reference_power,full.reference_power);
  }
 }finally{FFT.prototype.realTransform=original;}
});

test('synthetic preparePlot timing (opt in; not a speed assertion)',{skip:!process.env.IMAGE_EFFICIENCY_BENCH},t=>{
 // Run: IMAGE_EFFICIENCY_BENCH=1 node --test test/unit/image-efficiency.test.mjs
 const channels=Array.from({length:2},(_,c)=>Float64Array.from({length:sr},(_,i)=>.3*Math.sin(2*Math.PI*(250+125*c)*i/sr)));
 for(const detail of ['tonal','transient','balanced']){
  const run=includeStatistics=>preparePlot(channels,sr,{detail,columns:990,includeEnergy:false,includeStatistics});
  run(true);run(false);
  const samples={legacy:[],optimized:[]};
  for(let round=0;round<7;round++)for(const enabled of (round%2?[false,true]:[true,false])){
   const start=performance.now();run(enabled);samples[enabled?'legacy':'optimized'].push(performance.now()-start);
  }
  const median=values=>[...values].sort((a,b)=>a-b)[3];
  t.diagnostic(`${detail}: legacy=${median(samples.legacy).toFixed(2)}ms optimized=${median(samples.optimized).toFixed(2)}ms (median of 7, 1s/8kHz/stereo, preparePlot only)`);
 }
 t.diagnostic('Local synthetic timing excludes decode, rendering, workers, models and end-to-end deadlines; JIT/GC/host load affect results.');
});
