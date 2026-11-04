import {createSourceSnapshot} from './source.mjs';
import {runProcess} from './process.mjs';
import {validatePcm} from './signal.mjs';
const FORMATS='wav,flac,mp3,mov,ogg';
export function parseMediaInfo(report){
 if(!report||!Array.isArray(report.streams)||report.streams.length!==1||report.streams[0].codec_type!=='audio')throw Error('UNSUPPORTED_STREAMS');
 const stream=report.streams[0],sampleRate=Number(stream.sample_rate),channels=stream.channels,duration=Number(stream.duration??report.format?.duration);
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000||![1,2].includes(channels)||!Number.isInteger(stream.index)||stream.index<0||typeof stream.codec_name!=='string')throw Error('UNSUPPORTED_AUDIO');
 if(!Number.isFinite(duration)||duration<=0)throw Error('UNKNOWN_DURATION');
 return {sampleRate,channels,duration,index:stream.index,codec:stream.codec_name,format:report.format?.format_name??null};
}
export async function decodeAudio(file,{root,scratch,from=0,to,signal,ffmpeg='ffmpeg',ffprobe='ffprobe'}={}){
 const snapshot=await createSourceSnapshot(file,{root,scratch,signal});
 try{
  const bytes=await runProcess(ffprobe,['-v','error','-protocol_whitelist','file,pipe','-format_whitelist',FORMATS,'-show_streams','-show_format','-of','json',snapshot.path],{signal});
  let report;try{report=JSON.parse(bytes.toString('utf8'));}catch{throw Error('INVALID_PROBE_RESPONSE');}
  const media=parseMediaInfo(report);to??=media.duration;
  if(!Number.isFinite(from)||!Number.isFinite(to)||from<0||to<=from||to>media.duration)throw Error('INVALID_RANGE');
  if(to-from>60)throw Error('RANGE_TOO_LARGE');
  const start=Math.ceil(from*media.sampleRate),end=Math.ceil(to*media.sampleRate),count=end-start;
  if(count<1||count>60*media.sampleRate)throw Error('INVALID_SAMPLE_RANGE');
  const pcm=await runProcess(ffmpeg,['-nostdin','-v','error','-protocol_whitelist','file,pipe','-format_whitelist',FORMATS,'-i',snapshot.path,'-map',`0:${media.index}`,'-vn','-sn','-dn','-af',`atrim=start_sample=${start}:end_sample=${end},asetpts=PTS-STARTPTS`,'-c:a','pcm_f32le','-f','f32le','pipe:1'],{signal,maxBytes:count*media.channels*4});
  if(pcm.length!==count*media.channels*4)throw Error('DECODE_LENGTH_MISMATCH');
  const channels=Array.from({length:media.channels},()=>new Float32Array(count));
  for(let i=0;i<count;i++)for(let c=0;c<media.channels;c++)channels[c][i]=pcm.readFloatLE((i*media.channels+c)*4);
  validatePcm(channels,media.sampleRate);if(signal?.aborted)throw Error('CANCELLED');
  return {sampleRate:media.sampleRate,channels,coverage:{from:start/media.sampleRate,to:end/media.sampleRate,timing:'measured_samples'},source:{sha256:snapshot.sha256,bytes:snapshot.bytes,duration_seconds:media.duration,codec:media.codec,format:media.format},limitations:['Compressed-media duration and priming depend on the decoder; unsupported lengths fail explicitly.','No loudness normalization, denoising or channel downmix is applied.']};
 }finally{await snapshot.dispose();}
}
