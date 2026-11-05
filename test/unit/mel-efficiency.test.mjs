import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {selectiveAnalysis} from '../../src/selective-analysis.mjs';
import {preparePlot} from '../../src/plot-data.mjs';
import {makeMelFilters,applyMel} from '../../src/spectrum.mjs';

const dense=(power,filters)=>Float64Array.from(filters,f=>f.reduce((sum,w,k)=>sum+w*power[k],0));
test('sparse mel sum is bit-identical to the dense sum',()=>{
 let s=3;const rnd=()=>(s=(s*1103515245+12345)%2147483648)/2147483648;
 for(const sr of [8000,22050,44100,48000,96000,192000])for(const size of [1024,2048,4096]){
  const filters=makeMelFilters(sr,size);
  for(const power of [new Float64Array(size/2+1),Float64Array.from({length:size/2+1},()=>rnd()*1e6),Float64Array.from({length:size/2+1},(_,k)=>k%7?0:rnd()*1e-30)]){
   const a=applyMel(power,filters),b=dense(power,filters);
   for(let m=0;m<a.length;m++)assert.ok(Object.is(a[m],b[m]),sr+'/'+size+'/'+m);
  }
 }
});

// SHA-256 captured with the dense implementation (before 0034). 48 kHz, 6 channels, 2.007 s.
const before={
 transient:['e077651d864770697478ef1df5e6960b733065eb5e11158921263a24b499f4f8','163766c244addb8d17d432265f3673722ddc5a1d41dd836e5157bda8efa7371f'],
 balanced:['51de18add0079ef3da0ee54bf74fc9a4bfe57bbf6a5c0efc11772c5d9ed2a760','2e3d6a28b46936eb808323f486301b57267c6466bbe69e7c2e7005508d3118ff'],
 tonal:['326834315f33e7fb1829578a619fddb7c8dff5d8c7917668b53f462de432191d','35aafbc0f638f399f03604a727247406e42d622d876a239709150bc09d112a89']
};
const sr=48000;let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648-.5;
const channels=Array.from({length:6},(_,c)=>Float64Array.from({length:sr*2+333},(_,i)=>.2*Math.sin(2*Math.PI*(110*(c+1))*i/sr)+.05*rnd()+(i%24000<200?.3:0)));
for(const detail of Object.keys(before))test('48 kHz 6-channel image and legacy plot unchanged: '+detail,()=>{
 const r=selectiveAnalysis(channels,sr,{features:['signal_image'],detail,columns:200,frequencyRange:[50,20000],channelView:'separate'});
 assert.equal(createHash('sha256').update(JSON.stringify(r.evidence)).update(r.png).digest('hex'),before[detail][0]);
 const legacy=preparePlot(channels,sr,{detail,columns:200,includeEnergy:false});
 assert.equal(createHash('sha256').update(JSON.stringify(legacy,(k,v)=>ArrayBuffer.isView(v)?[...v]:v)).digest('hex'),before[detail][1]);
});
