import {realpath,open,mkdtemp,unlink,rmdir} from 'node:fs/promises';
import {constants} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
export async function createSourceSnapshot(file,{root,scratch,signal,maxBytes=256*1024*1024}={}){
 if(typeof file!=='string'||!file||/^[a-z][a-z0-9+.-]*:/i.test(file)||file.includes('\0'))throw Error('INVALID_SOURCE');
 if(!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>256*1024*1024)throw Error('INVALID_SOURCE_LIMIT');
 if(signal!==undefined&&!(signal instanceof AbortSignal))throw Error('INVALID_ABORT_SIGNAL');
 if(signal?.aborted)throw Error('CANCELLED');
 const allowed=await realpath(root),target=await realpath(path.resolve(allowed,file)),relative=path.relative(allowed,target),temporaryRoot=await realpath(scratch);
 if(relative==='..'||relative.startsWith(`..${path.sep}`)||path.isAbsolute(relative))throw Error('ACCESS_DENIED');
 const input=await open(target,constants.O_RDONLY|constants.O_NOFOLLOW);
 let directory,destination,output;
 try{
  const before=await input.stat();if(!before.isFile())throw Error('NOT_REGULAR_FILE');if(before.size>maxBytes)throw Error('SOURCE_SIZE_LIMIT');
  directory=await mkdtemp(path.join(temporaryRoot,'dsh-listen-'));destination=path.join(directory,'source.media');output=await open(destination,'wx',0o600);
  const hash=createHash('sha256'),chunk=Buffer.alloc(65536);let position=0;
  for(;;){
   if(signal?.aborted)throw Error('CANCELLED');
   const {bytesRead}=await input.read(chunk,0,chunk.length,position);if(!bytesRead)break;
   position+=bytesRead;if(position>maxBytes)throw Error('SOURCE_SIZE_LIMIT');
   const data=chunk.subarray(0,bytesRead);hash.update(data);await output.writeFile(data);
  }
  const after=await input.stat();
  if(before.size!==position||after.size!==before.size||after.mtimeMs!==before.mtimeMs||after.ctimeMs!==before.ctimeMs)throw Error('SOURCE_CHANGED');
  await output.close();output=null;
  let disposed=false;
  return {path:destination,sha256:hash.digest('hex'),bytes:position,source:target,async dispose(){if(disposed)return;await unlink(destination);await rmdir(directory);disposed=true;}};
 }catch(error){
  if(output)await output.close();
  if(destination)await unlink(destination).catch(()=>{});
  if(directory)await rmdir(directory).catch(()=>{});
  throw error;
 }finally{await input.close();}
}
