import {validatePcm} from './signal.mjs';
export function encodeAsrWav(channels,sampleRate){
 const samples=validatePcm(channels,sampleRate),size=samples*2,bytes=Buffer.alloc(44+size);
 bytes.write('RIFF');bytes.writeUInt32LE(36+size,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(sampleRate,24);bytes.writeUInt32LE(sampleRate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(size,40);
 for(let i=0;i<samples;i++){
  let sum=0;for(const channel of channels){if(Math.abs(channel[i])>1)throw Error('ASR_OVER_RANGE');sum+=channel[i]/channels.length;}
  bytes.writeInt16LE(Math.round(sum*32767),44+i*2);
 }
 return {bytes,metadata:{input_sample_rate_hz:sampleRate,input_channels:channels.length,sample_rate_hz:sampleRate,channels:1,encoding:'PCM16',downmix:channels.length===1?'none':'arithmetic_mean',resampled:false,limitations:channels.length===1?['PCM16 conversion introduces quantization.']:['Arithmetic channel downmix can cancel opposite-phase content.','PCM16 conversion introduces quantization.']}};
}
