import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readdir,chmod} from 'node:fs/promises';
import path from 'node:path';
import {decodeAudio,parseMediaInfo} from '../../src/decode.mjs';
import {validatePcm,describeSignal} from '../../src/signal.mjs';
import {computeSpectrum} from '../../src/spectrum.mjs';
import {preparePlot} from '../../src/plot-data.mjs';
import {encodeAsrWav} from '../../src/wav.mjs';
import {analyzeSignal} from '../../src/analysis.mjs';
import {renderPlot} from '../../src/image.mjs';
const sr=48000,n=2048;
const channels=Array.from({length:6},(_,c)=>Float32Array.from({length:n},(_,i)=>(c+1)/12*Math.sin(2*Math.PI*750*i/sr)));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
function wav(input,rate){
 const count=input[0].length,bytes=count*input.length*2,b=Buffer.alloc(44+bytes);
 b.write('RIFF');b.writeUInt32LE(36+bytes,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(input.length,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*input.length*2,28);b.writeUInt16LE(input.length*2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);
 for(let i=0;i<count;i++)for(let c=0;c<input.length;c++)b.writeInt16LE(Math.round(input[c][i]*32767),44+(i*input.length+c)*2);
 return b;
}
test('six-channel native signal and mel keep every channel distinct, not stereo or mono',()=>{
 assert.equal(validatePcm(channels,sr),n);
 const signal=describeSignal(channels,sr),spectrum=computeSpectrum(channels,sr);
 assert.equal(signal.channels.length,6);assert.equal(signal.sample_rate_hz,sr);assert.equal(signal.stereo,null);assert.equal(signal.stereo_unavailable_reason,'requires_exactly_two_channels');
 assert.equal(spectrum.channels.length,6);
 for(let c=0;c<6;c++){near(signal.channels[c].rms,(c+1)/12/Math.sqrt(2));near(spectrum.channels[c].frames[0].statistics.centroid_hz,750);assert.ok(spectrum.channels[c].frames[0].mel_power.some(p=>p>0));}
 const separate=preparePlot(channels,sr,{columns:2}),mean=preparePlot(channels,sr,{channelView:'power_mean',columns:2});
 assert.equal(separate.channels.length,6);assert.equal(mean.spectral_statistics.length,6);
 for(let i=0;i<2;i++)for(let k=0;k<mean.channels[0].mel[i].length;k++)near(mean.channels[0].mel[i][k],separate.channels.reduce((sum,c)=>sum+c.mel[i][k]/6,0));
 near(Math.max(...mean.channels[0].wave.map(b=>b.max)),.5);near(Math.min(...mean.channels[0].wave.map(b=>b.min)),-.5);
});
test('power mean and envelope include content exclusively in the last channel',()=>{
 const input=Array.from({length:6},()=>new Float32Array(n));input[5]=channels[5];
 const p=preparePlot(input,sr,{channelView:'power_mean',columns:1}),single=preparePlot([channels[5]],sr,{columns:1});
 assert.ok(p.channels[0].mel[0].some(v=>v>0));for(let k=0;k<p.channels[0].mel[0].length;k++)near(p.channels[0].mel[0][k],single.channels[0].mel[0][k]/6);
 near(p.channels[0].wave[0].max,.5);assert.equal(describeSignal(input,sr).digital_zero,false);
});
test('ASR/event WAV arithmetic mean uses all six native-rate inputs and reports provenance',()=>{
 const r=encodeAsrWav(Array.from({length:6},(_,c)=>Float32Array.of(c===5?.75:0)),sr);
 assert.equal(r.bytes.readInt16LE(44),Math.round(.75/6*32767));assert.equal(r.bytes.readUInt32LE(24),sr);assert.equal(r.bytes.readUInt16LE(22),1);assert.equal(r.metadata.input_channels,6);assert.equal(r.metadata.input_sample_rate_hz,sr);assert.equal(r.metadata.downmix,'arithmetic_mean');assert.equal(r.metadata.resampled,false);
 const opposite=encodeAsrWav([Float32Array.of(.5),Float32Array.of(-.5),...Array.from({length:4},()=>Float32Array.of(0))],sr);assert.equal(opposite.bytes.readInt16LE(44),0);assert.ok(opposite.metadata.limitations.some(x=>/cancel/.test(x)));
 assert.throws(()=>encodeAsrWav([...Array.from({length:5},()=>Float32Array.of(0)),Float32Array.of(2)],sr),/ASR_OVER_RANGE/);
});
test('six and eight channel analysis workers return complete separate-channel PNG evidence',async()=>{
 for(const count of [6,8]){
  const input=Array.from({length:count},(_,c)=>channels[c%6]);
  const result=await analyzeSignal(input,sr,{columns:4});
  assert.equal(result.statistics.channels.length,count);assert.equal(result.image.channels,count);assert.equal(result.image.height,180+360*count);assert.ok(result.png.length>1000);
 }
 const plot=preparePlot(channels,sr,{columns:1});plot.channels=Array(9).fill(plot.channels[0]);assert.throws(()=>renderPlot(plot),/INVALID_PLOT/);
});
test('bounds allow eight channels but reject nine and unsafe aggregate allocation with context',()=>{
 assert.equal(validatePcm(Array.from({length:8},()=>Float32Array.of(0)),sr),1);
 assert.throws(()=>validatePcm(Array.from({length:9},()=>Float32Array.of(0)),sr),/INVALID_CHANNEL_COUNT.*channels=9.*1\.\.8/);
 const x=new Float32Array(2_880_001);assert.throws(()=>validatePcm(Array(8).fill(x),192000),/AGGREGATE_SAMPLE_LIMIT.*sample_rate_hz=192000.*channels=8.*max_aggregate_samples=23040000/);
});
test('probe errors expose bounded numeric constraints, never arbitrary report strings',()=>{
 const stream={index:0,codec_type:'audio',codec_name:'pcm_s16le',sample_rate:'48000',channels:6,duration:'1'};
 assert.equal(parseMediaInfo({streams:[stream]}).channels,6);
 assert.throws(()=>parseMediaInfo({streams:[{...stream,channels:9}],secret:'DO_NOT_ECHO'}),e=>/UNSUPPORTED_AUDIO.*sample_rate_hz=48000.*channels=9.*1\.\.8/.test(e.message)&&!e.message.includes('DO_NOT_ECHO'));
 assert.throws(()=>parseMediaInfo({streams:[stream,stream]}),/UNSUPPORTED_STREAMS.*streams=2.*exactly one audio stream/);
 assert.throws(()=>parseMediaInfo({streams:[{...stream,sample_rate:'secret-rate',channels:'secret-channels'}]}),e=>!e.message.includes('secret-')&&/8000\.\.192000/.test(e.message));
});
test('decoder rejects aggregate budget before spawning FFmpeg and cleans snapshot',async()=>{
 const base=path.resolve(`.work/multichannel-budget-${process.pid}`),root=path.join(base,'allowed'),scratch=path.join(base,'scratch');await mkdir(root,{recursive:true});await mkdir(scratch,{recursive:true});await writeFile(path.join(root,'small.wav'),wav(channels,sr));
 const probe=path.join(base,'probe.mjs'),report={streams:[{index:0,codec_type:'audio',codec_name:'pcm_s16le',sample_rate:'192000',channels:8,duration:'60'}]};
 await writeFile(probe,`#!${process.execPath}\nprocess.stdout.write(${JSON.stringify(JSON.stringify(report))});\n`);await chmod(probe,0o700);
 await assert.rejects(decodeAudio('small.wav',{root,scratch,ffprobe:probe,ffmpeg:'/nonexistent-must-not-spawn'}),/AGGREGATE_SAMPLE_LIMIT.*sample_rate_hz=192000.*channels=8.*max_aggregate_samples=23040000/);assert.deepEqual(await readdir(scratch),[]);
});
test('real FFmpeg six-channel decode preserves rate, order, source metadata and snapshot cleanup',async()=>{
 const base=path.resolve(`.work/multichannel-tests-${process.pid}`),root=path.join(base,'allowed'),scratch=path.join(base,'scratch');await mkdir(root,{recursive:true});await mkdir(scratch,{recursive:true});await writeFile(path.join(root,'six.wav'),wav(channels,sr));
 const r=await decodeAudio('six.wav',{root,scratch});assert.equal(r.channels.length,6);assert.equal(r.sampleRate,sr);assert.equal(r.source.channels,6);assert.equal(r.source.sample_rate_hz,sr);assert.equal(r.source.resampled,false);assert.equal(r.source.downmix,'none');
 for(let c=0;c<6;c++){assert.equal(r.channels[c].length,n);assert.ok(Math.abs(r.channels[c][16]-channels[c][16])<4e-5);}
 assert.deepEqual(await readdir(scratch),[]);
});
