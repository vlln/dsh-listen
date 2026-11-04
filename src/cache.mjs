import {createHash} from 'node:crypto';
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;}
export function evidenceKey({owner,sourceHash,range,component,version,parameters}={}){
 if([owner,sourceHash,component,version].some(x=>typeof x!=='string'||!x)||!Array.isArray(range)||range.length!==2||range.some(x=>!Number.isFinite(x))||range[0]<0||range[1]<=range[0]||!parameters||typeof parameters!=='object')throw Error('INVALID_CACHE_IDENTITY');
 return createHash('sha256').update(JSON.stringify(stable({owner,sourceHash,range,component,version,parameters}))).digest('hex');
}
export class EvidenceCache{
 #entries=new Map();#bytes=0;
 constructor({maxEntries=16,maxBytes=16*1024*1024}={}){if(!Number.isInteger(maxEntries)||maxEntries<1||maxEntries>1000||!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>64*1024*1024)throw Error('INVALID_CACHE_LIMITS');this.maxEntries=maxEntries;this.maxBytes=maxBytes;}
 get size(){return this.#entries.size;}
 get bytes(){return this.#bytes;}
 get(key){const entry=this.#entries.get(key);if(!entry)return undefined;this.#entries.delete(key);this.#entries.set(key,entry);return JSON.parse(entry.json);}
 set(key,value){
  const json=JSON.stringify(value),bytes=Buffer.byteLength(json);if(bytes>this.maxBytes)return false;
  const old=this.#entries.get(key);if(old){this.#bytes-=old.bytes;this.#entries.delete(key);}
  while(this.#entries.size>=this.maxEntries||this.#bytes+bytes>this.maxBytes){const oldest=this.#entries.keys().next().value;this.#bytes-=this.#entries.get(oldest).bytes;this.#entries.delete(oldest);}
  this.#entries.set(key,{json,bytes});this.#bytes+=bytes;return true;
 }
 clear(){this.#entries.clear();this.#bytes=0;}
}
