import http from 'node:http';
import {once} from 'node:events';
export function pcm16Wav({sampleRate=8000,channels=1,samples=800,frequency=500,amplitude=.25}={}){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000||![1,2].includes(channels)||!Number.isInteger(samples)||samples<1||samples>sampleRate*60||!Number.isFinite(frequency)||frequency<0||frequency>sampleRate/2||!Number.isFinite(amplitude)||amplitude<0||amplitude>1)throw Error('INVALID_FIXTURE');
 const bytes=samples*channels*2,b=Buffer.alloc(44+bytes);
 b.write('RIFF');b.writeUInt32LE(36+bytes,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(channels,22);b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*channels*2,28);b.writeUInt16LE(channels*2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);
 for(let i=0;i<samples;i++)for(let c=0;c<channels;c++)b.writeInt16LE(Math.round(amplitude*32767*Math.sin(2*Math.PI*frequency*i/sampleRate)),44+2*(i*channels+c));return b;
}
export async function withLoopback(handler,operation){
 const errors=[];
 const server=http.createServer((req,res)=>{Promise.resolve().then(()=>handler(req,res)).catch(error=>{errors.push(error);res.destroy();});});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 let result,operationError;
 try{result=await operation(`http://127.0.0.1:${server.address().port}`);}catch(error){operationError=error;}
 finally{server.closeAllConnections();await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
 if(errors.length)throw errors[0];if(operationError)throw operationError;return result;
}
