import test from 'node:test';
import assert from 'node:assert/strict';
import {presentEvidence,stringifyEvidence} from '../../src/evidence-presentation.mjs';
import {makeAudioTools} from '../../src/tools.mjs';

test('presentation removes fixed declarations recursively without changing results or source',()=>{
 const value={limitations:['fixed'],detail_guidance:'instructions',evidence:{events:{score_semantics:'not probability',status:'unavailable',reason:'not_configured'},transcript:{text:'limitations are spoken words',preprocessing:{limitations:['fixed'],downmix:'mean'},timing_adjustments:{discarded_segments:2}},signal_image:{channels:[{limitations:['fixed'],rms:.123456789}]}}};
 const before=structuredClone(value),out=presentEvidence(value);
 assert.deepEqual(value,before);assert.equal(out.limitations,undefined);assert.equal(out.detail_guidance,undefined);assert.equal(out.evidence.events.score_semantics,undefined);assert.equal(out.evidence.events.reason,'not_configured');assert.equal(out.evidence.transcript.text,value.evidence.transcript.text);assert.deepEqual(out.evidence.transcript.timing_adjustments,{discarded_segments:2});assert.deepEqual(out.evidence.signal_image.channels,[{rms:.123456789}]);
});

test('numbers use five significant digits, shortest notation, exact integers and preserved null/zero',()=>{
 const data={hz:837.2310297731782,rms:.09833119478863653,dc:-.000016440963745117187,tiny:1.23456789e-30,large:1.23456789e30,count:23040000,zero:0,negativeZero:-0,missing:null,min:Number.MIN_VALUE,max:Number.MAX_VALUE};
 const text=stringifyEvidence(data),out=JSON.parse(text);
 assert.equal(out.hz,837.23);assert.equal(out.rms,.098331);assert.equal(out.dc,-.000016441);assert.equal(out.tiny,1.2346e-30);assert.equal(out.large,data.large);assert.equal(out.count,data.count);assert.equal(out.zero,0);assert.equal(out.negativeZero,0);assert.equal(out.missing,null);assert.equal(out.min,Number.MIN_VALUE);assert.equal(out.max,Number.MAX_VALUE);assert.match(text,/-1.6441e-5/);assert.equal(JSON.parse(stringifyEvidence({x:.999999999})).x,1);
});

test('single output render remove declarations, shorten numbers and preserve attachment and canonical data',()=>{
 const [tool]=makeAudioTools({defineTool:x=>x,inspect:()=>{},caller:()=>{},saveImage:()=>{}});
 const value={status:'complete',coverage:{from:0,to:1},evidence:{signal_image:{status:'ready',statistics:{channels:[{rms:.123456789}],limitations:['fixed']}}},image_attachment:{attachmentId:'sha256:abc',bytes:146866}};
 const before=structuredClone(value);
 {const blocks=tool.output.render({},value),out=JSON.parse(blocks[0].text);assert.equal(out.evidence.signal_image.statistics.channels[0].rms,.12346);assert.equal(out.evidence.signal_image.statistics.limitations,undefined);assert.equal(out.detail_guidance,undefined);assert.deepEqual(blocks[1],{type:'image',attachment:value.image_attachment});}
 assert.deepEqual(value,before);
});
