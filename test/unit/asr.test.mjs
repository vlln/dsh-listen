import test from 'node:test';import assert from 'node:assert/strict';import {makeAsrProvider,parseAsrResponse} from '../../src/asr.mjs';import {withLoopback} from '../helpers/fixtures.mjs';
const audio={sampleRate:8000,channels:[new Float32Array(800)],coverage:{from:12,to:12.1}},context={signal:new AbortController().signal};
function config(endpoint,more={}){return {endpoint,model:'fixture',...more};}
test('real multipart sends no semantic question and maps estimated source timing',async()=>{await withLoopback(async(req,res)=>{let text='';for await(const b of req)text+=b;assert.match(text,/name="model"/);assert.doesNotMatch(text,/name="(?:question|prompt)"/);res.end(JSON.stringify({text:'hi',language:'en',segments:[{text:'hi',start:0,end:.08}]}));},async endpoint=>{const p=makeAsrProvider(config(endpoint));const r=await p.extract(audio,context);assert.equal(r.status,'ready');assert.equal(r.segments[0].from,12);assert.equal(r.segments[0].to,12.08);assert.equal(r.preprocessing.sample_rate_hz,8000);assert.equal(p.version.includes('asr-api-v1'),true);});});
test('text-only response declares missing alignment',async()=>{await withLoopback((q,s)=>s.end(JSON.stringify({text:'hi'})),async endpoint=>{assert.equal((await makeAsrProvider(config(endpoint)).extract(audio,context)).timing,'unavailable');});});
test('configuration rejects external upload without permission or invalid URL',()=>{for(const c of [config('https://example.com/asr'),config('http://example.com/asr',{allowExternal:true}),config('https://user:password@example.com/asr',{allowExternal:true}),config('http://127.0.0.1/a',{model:''})])assert.throws(()=>makeAsrProvider(c),/ASR_/);});
test('HTTP failure never echoes provider secret body',async()=>{await withLoopback((q,s)=>{s.writeHead(401);s.end('private-secret');},async endpoint=>{await assert.rejects(makeAsrProvider(config(endpoint)).extract(audio,context),e=>e.message==='ASR_HTTP_401');});});
test('bad JSON top-level schema and overlarge response rejected',async()=>{for(const body of ['bad-json',JSON.stringify({text:1}),JSON.stringify({text:'hi',segments:{}}),JSON.stringify({text:'x'.repeat(1000)})])await withLoopback((q,s)=>s.end(body),async endpoint=>{await assert.rejects(makeAsrProvider(config(endpoint,{maxResponseBytes:500})).extract(audio,context),/ASR_/);});});
test('redirect rejected and timeout aborts request',async()=>{await withLoopback((q,s)=>{s.writeHead(307,{Location:'http://127.0.0.1:1/no'});s.end();},async endpoint=>{await assert.rejects(makeAsrProvider(config(endpoint)).extract(audio,context),/ASR_NETWORK_FAILED/);});await withLoopback(()=>{},async endpoint=>{await assert.rejects(makeAsrProvider(config(endpoint,{timeoutMs:20})).extract(audio,context),/ASR_TIMEOUT/);});});
test('credential resolution shares deadline and caller cancellation without sending audio',async()=>{let calls=0;await withLoopback((q,s)=>{calls++;s.end('{}');},async endpoint=>{const p=makeAsrProvider(config(endpoint,{secretProvider:()=>new Promise(()=>{}),timeoutMs:20}));await assert.rejects(p.extract(audio,context),/ASR_TIMEOUT/);const c=new AbortController(),pending=p.extract(audio,{signal:c.signal});setTimeout(()=>c.abort(),5);await assert.rejects(pending,/CANCELLED/);assert.equal(calls,0);});});
// Regression source: plan 0021, cropped audio must not lose a usable transcript.
test('cropped short audio clamps overshoot and negative start with absolute source offsets',()=>{
 const coverage={from:12,to:12.1};
 const r=parseAsrResponse({text:'whole transcript',segments:[{text:'overshoot',start:.02,end:9},{text:'negative',start:-1,end:.04},{text:'both',start:-2,end:2},{text:'rounding',start:.09,end:.1005}]},coverage);
 assert.equal(r.text,'whole transcript');assert.equal(r.status,'ready');assert.equal(r.timing,'estimated');assert.deepEqual(r.coverage,coverage);
 assert.deepEqual(r.segments,[{text:'overshoot',from:12.02,to:12.1,timing:'estimated'},{text:'negative',from:12,to:12.04,timing:'estimated'},{text:'both',from:12,to:12.1,timing:'estimated'},{text:'rounding',from:12.09,to:12.1,timing:'estimated'}]);
 assert.deepEqual(r.timing_adjustments,{adjusted_segments:4,discarded_segments:0});assert.match(r.limitations.at(-1),/clamped or discarded/);
});
test('bad optional segment objects and unusable timing do not kill valid text or segments',()=>{
 const bad=[null,42,'bad',[],{}, {text:1,start:0,end:.05},{text:'nan',start:NaN,end:.05},{text:'infinity',start:0,end:Infinity},{text:'missing',start:0},{text:'string',start:'0',end:.05},{text:'inverted',start:.09,end:.01},{text:'before',start:-2,end:-1},{text:'after',start:1,end:2},{text:'left touch',start:-1,end:0},{text:'right touch',start:.1,end:1},{text:'zero',start:.05,end:.05}];
 const r=parseAsrResponse({text:'retained',segments:[...bad,{text:'valid',start:.01,end:.08}]},{from:0,to:.1});
 assert.equal(r.text,'retained');assert.deepEqual(r.segments,[{text:'valid',from:.01,to:.08,timing:'estimated'}]);assert.equal(r.timing,'estimated');assert.deepEqual(r.timing_adjustments,{adjusted_segments:0,discarded_segments:bad.length});assert.match(r.limitations.at(-1),/clamped or discarded/);
});
test('no valid timestamps retains full text without fabricated segment alignment',()=>{
 for(const segments of [[null,{text:'outside',start:1,end:2}],[],undefined]){
  const r=parseAsrResponse({text:'still usable',segments},{from:20,to:20.1});
  assert.equal(r.text,'still usable');assert.deepEqual(r.segments,[]);assert.equal(r.timing,'unavailable');assert.deepEqual(r.timing_adjustments,{adjusted_segments:0,discarded_segments:segments?.length??0});assert.equal(r.limitations.length,segments?.length?3:2);
 }
});
test('valid path retains exact text, source timing, language and baseline limitations',()=>{
 const coverage={from:30,to:31};const r=parseAsrResponse({text:' full text ',language:'en',segments:[{text:' segment text ',start:0,end:.5},{text:'end',start:.5,end:1}]},coverage);
 assert.equal(r.text,' full text ');assert.equal(r.language,'en');assert.deepEqual(r.segments,[{text:' segment text ',from:30,to:30.5,timing:'estimated'},{text:'end',from:30.5,to:31,timing:'estimated'}]);assert.equal(r.timing,'estimated');assert.deepEqual(r.timing_adjustments,{adjusted_segments:0,discarded_segments:0});assert.equal(r.limitations.length,2);
});
test('top-level schema and size limits still reject despite tolerant optional timing',()=>{
 for(const data of [null,[],{}, {text:1},{text:'x'.repeat(100001)}])assert.throws(()=>parseAsrResponse(data,{from:0,to:1}),/ASR_INVALID_SCHEMA/);
 for(const segments of [null,{},'bad',new Array(10001).fill(null)])assert.throws(()=>parseAsrResponse({text:'usable',segments},{from:0,to:1}),/ASR_INVALID_SEGMENTS/);
 assert.equal(parseAsrResponse({text:'x'.repeat(100000),segments:new Array(10000).fill(null)},{from:0,to:1}).timing_adjustments.discarded_segments,10000);
});
test('cancelled and fake caller signals rejected without request',async()=>{const p=makeAsrProvider(config('http://127.0.0.1:1/asr'));await assert.rejects(p.extract(audio,{signal:AbortSignal.abort()}),/CANCELLED/);await assert.rejects(p.extract(audio,{signal:{}}),/INVALID_ASR_CONTEXT/);});
