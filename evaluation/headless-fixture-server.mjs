// Deterministic transport fixture. Never use its outputs as benchmark/model scores.
import http from 'node:http';
import fs from 'node:fs/promises';
const marker=process.argv[2];if(!marker)throw Error('FIXTURE_MARKER_REQUIRED');
let requests=0;
const server=http.createServer(async(req,res)=>{
 try{
  const chunks=[];let bytes=0;for await(const c of req){bytes+=c.length;if(bytes>8*1024*1024)throw Error('REQUEST_LIMIT');chunks.push(c);}
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));requests++;
  const hasResult=body.messages?.some(m=>m.role==='tool');
  const delta=hasResult?{role:'assistant',content:'HEADLESS_AUDIO_FIXTURE_COMPLETE'}:{role:'assistant',tool_calls:[{index:0,id:'audio-fixture-call',type:'function',function:{name:'listen',arguments:JSON.stringify({source_path:'.work/local-asr/fixture.wav',features:['signal'],from:0,to:1})}}]};
  if(body.stream){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(`data: ${JSON.stringify({id:'fixture',object:'chat.completion.chunk',created:0,model:'fixture-model',choices:[{index:0,delta,finish_reason:null}]})}\n\n`);res.write(`data: ${JSON.stringify({id:'fixture',object:'chat.completion.chunk',created:0,model:'fixture-model',choices:[{index:0,delta:{},finish_reason:hasResult?'stop':'tool_calls'}],usage:{prompt_tokens:0,completion_tokens:0,total_tokens:0}})}\n\ndata: [DONE]\n\n`);res.end();}
  else{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({id:'fixture',object:'chat.completion',choices:[{index:0,message:delta,finish_reason:hasResult?'stop':'tool_calls'}],usage:{prompt_tokens:0,completion_tokens:0,total_tokens:0}}));}
 }catch{res.writeHead(400);res.end('FIXTURE_REQUEST_FAILED');}
});
server.listen(0,'127.0.0.1',async()=>{await fs.writeFile(marker,JSON.stringify({port:server.address().port,pid:process.pid}));console.log('Headless local transport fixture ready');});
const stop=()=>{console.log(JSON.stringify({requests}));server.closeAllConnections();server.close(()=>process.exit(0));};process.on('SIGTERM',stop);process.on('SIGINT',stop);
