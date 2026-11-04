import {Raster,formatNumber} from './raster.mjs';
import {displayPowerDb} from './spectrum.mjs';
import {MAX_CHANNELS} from './signal.mjs';
const INK=[25,35,45],BLUE=[35,95,175],GRAY=[205,210,215];
function color(value){return [Math.round(18+230*value),Math.round(20+170*value*value),Math.round(55+50*(1-value))];}
function validatePlot(plot){
 if(!plot||!Array.isArray(plot.channels)||plot.channels.length<1||plot.channels.length>MAX_CHANNELS||!Array.isArray(plot.frequency_hz)||!plot.frequency_hz.length||!Number.isFinite(plot.reference_power)||plot.reference_power<0||!Number.isFinite(plot.coverage?.from)||!Number.isFinite(plot.coverage?.to)||plot.coverage.to<=plot.coverage.from)throw Error('INVALID_PLOT');
 if(!Array.isArray(plot.energy)||plot.energy.some(b=>!Number.isFinite(b.rms)||b.rms<0||!Number.isFinite(b.from)||!Number.isFinite(b.to)||b.to<=b.from))throw Error('INVALID_ENERGY');
 for(const ch of plot.channels){if(!Array.isArray(ch.mel)||!ch.mel.length||!Array.isArray(ch.wave)||!ch.wave.length)throw Error('INVALID_PLOT');for(const bucket of ch.wave)if(!bucket||[bucket.from,bucket.to,bucket.min,bucket.max].some(v=>!Number.isFinite(v))||bucket.to<=bucket.from||bucket.min>bucket.max)throw Error('INVALID_WAVE_BUCKET');for(const row of ch.mel){if(row.length!==plot.frequency_hz.length||[...row].some(v=>!Number.isFinite(v)||v<0))throw Error('INVALID_POWER');}}
}
export function renderPlot(plot){
 validatePlot(plot);
 const width=1200,height=180+360*plot.channels.length,raster=new Raster(width,height),left=100,right=1090,span=right-left,duration=plot.coverage.to-plot.coverage.from;
 raster.text('AUDIO SIGNAL EVIDENCE',left,18,3);raster.text(`SOURCE ${formatNumber(plot.coverage.from)} TO ${formatNumber(plot.coverage.to)} S`,left,52);
 raster.text(`FFT ${plot.parameters.fft_size} HOP ${plot.parameters.hop} MEL RELATIVE DB`,left,78);
 for(let c=0;c<plot.channels.length;c++){
  const channel=plot.channels[c],top=116+c*360,waveY=top+50,melY=top+125,melH=170;
  raster.text(channel.name,left,top);raster.line(left,waveY,right,waveY,GRAY);raster.text('1',55,waveY-35);raster.text('-1',43,waveY+28);
  for(const bucket of channel.wave){const x=left+((bucket.from+bucket.to)/2-plot.coverage.from)/duration*span;raster.line(x,waveY-32*Math.max(-1,Math.min(1,bucket.max)),x,waveY-32*Math.max(-1,Math.min(1,bucket.min)),BLUE);}
  const GREEN=[20,125,80];let previous=null;
  for(const bin of plot.energy){const db=bin.rms===0?-80:Math.max(-80,Math.min(0,20*Math.log10(bin.rms)));const x=left+((bin.from+bin.to)/2-plot.coverage.from)/duration*span,y=top+113-(db+80)/80*18;if(previous)raster.line(previous.x,previous.y,x,y,GREEN);else raster.pixel(x,y,GREEN);previous={x,y};}
  raster.text('ENERGY GREEN DBFS -80 TO 0',left+500,top+92,1,GREEN);
  raster.text('HZ',8,melY-24);
  for(let x=0;x<span;x++){
   const row=channel.mel[Math.min(channel.mel.length-1,Math.floor(x/span*channel.mel.length))];
   for(let y=0;y<melH;y++){const band=Math.min(row.length-1,Math.floor((melH-1-y)/melH*row.length)),db=displayPowerDb(row[band],plot.reference_power);raster.pixel(left+x,melY+y,color(db===null?0:(db+80)/80));}
  }
  for(const fraction of [0,.5,1]){const index=Math.min(plot.frequency_hz.length-1,Math.round(fraction*(plot.frequency_hz.length-1)));raster.text(formatNumber(plot.frequency_hz[index]),6,melY+melH-7-fraction*melH);}
  for(let i=0;i<=4;i++){const x=left+i/4*span;raster.line(x,melY+melH,x,melY+melH+4,INK);raster.text(formatNumber(plot.coverage.from+i/4*duration),x-22,melY+melH+12);}
  raster.text('SOURCE TIME S',left+340,melY+melH+34);
  for(let y=0;y<melH;y++)raster.rect(right+18,melY+y,12,1,color(1-y/(melH-1)));
  for(const [label,fraction] of [['0',0],['-40',.5],['-80',1]])raster.text(label,right+38,melY+fraction*(melH-8),1);
 }
 raster.text(plot.reference_power===0?'DIGITAL ZERO / NO SPECTRAL TEXTURE':'COLOR -80 TO 0 DB RELATIVE TO SHARED MEL PEAK',left,height-30);
 return {png:raster.encode(),metadata:{method:'signal-image-v1',width,height,channels:plot.channels.length,source_from:plot.coverage.from,source_to:plot.coverage.to,frequency_min_hz:plot.frequency_hz[0],frequency_max_hz:plot.frequency_hz.at(-1),reference_power:plot.reference_power,digital_zero:plot.reference_power===0,limitations:['Waveform display clips to full scale; numerical levels retain overrange.','Pixel font supports ASCII labels; image is a signal representation, not semantic recognition.']}};
}
