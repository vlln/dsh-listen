import test from 'node:test';import assert from 'node:assert/strict';import {mkdir,readdir} from 'node:fs/promises';import path from 'node:path';import {makeLocalAsrProvider} from '../../src/local-asr.mjs';import {decodeAudio} from '../../src/decode.mjs';
const enabled=!!process.env.DSH_LISTEN_LOCAL_PYTHON&&!!process.env.DSH_LISTEN_LOCAL_MODEL&&!!process.env.DSH_LISTEN_SPEECH_FIXTURE;
test('existing optional MLX environment transcribes generated fixture through formal Node provider',{skip:!enabled},async()=>{
 const fixture=path.resolve(process.env.DSH_LISTEN_SPEECH_FIXTURE),scratch=path.resolve(`.work/local-real-${process.pid}`);await mkdir(scratch,{recursive:true});
 const audio=await decodeAudio(fixture,{root:path.dirname(fixture),scratch});const provider=await makeLocalAsrProvider({python:process.env.DSH_LISTEN_LOCAL_PYTHON,modelDirectory:process.env.DSH_LISTEN_LOCAL_MODEL,scratch});const before=await readdir(scratch);
 const result=await provider.extract({...audio,coverage:{from:10,to:10+audio.channels[0].length/audio.sampleRate}},{signal:new AbortController().signal});
 assert.equal(result.method,'local-mlx-whisper');assert.equal(result.status,'ready');assert.equal(result.text.toLowerCase().match(/[a-z]+/g).join(' '),'the audio tool extracts evidence the agent decides what to inspect next');assert.ok(result.segments.every(s=>s.from>=10&&s.to<=10+audio.channels[0].length/audio.sampleRate+.01));assert.deepEqual(await readdir(scratch),before);
});
