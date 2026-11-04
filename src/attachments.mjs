import {mkdtemp,open,unlink,rmdir} from 'node:fs/promises';
import path from 'node:path';
export function makeAttachmentResolver({attachments,scratch}={}){
 if(typeof attachments?.readFileStream!=='function'||typeof scratch!=='string')throw Error('INVALID_ATTACHMENT_SERVICES');
 return async function resolveAttachment(id,context){
  const session=context?.agent?.session,signal=context?.signal;
  if(typeof id!=='string'||!(signal instanceof AbortSignal)||typeof session?.deriveMessages!=='function')throw Error('ATTACHMENT_NOT_AUTHORIZED');
  if(signal.aborted)throw Error('CANCELLED');
  let ref;
  for(const message of session.deriveMessages())if(Array.isArray(message.content))for(const block of message.content)if(block.type==='file'&&block.attachment?.attachmentId===id)ref=block.attachment;
  if(!ref)throw Error('ATTACHMENT_NOT_AUTHORIZED');
  if(!Number.isInteger(ref.bytes)||ref.bytes<0||ref.bytes>256*1024*1024)throw Error('ATTACHMENT_SIZE_LIMIT');
  const directory=await mkdtemp(path.join(scratch,'attachment-')),file=path.join(directory,'source.media');let handle;
  const dispose=async()=>{await unlink(file);await rmdir(directory);};
  try{
   handle=await open(file,'wx',0o600);let length=0;
   for await(const chunk of attachments.readFileStream(ref,signal)){if(signal.aborted)throw Error('CANCELLED');length+=chunk.length;if(length>ref.bytes)throw Error('ATTACHMENT_SIZE_MISMATCH');await handle.writeFile(chunk);}
   if(signal.aborted)throw Error('CANCELLED');if(length!==ref.bytes)throw Error('ATTACHMENT_SIZE_MISMATCH');
   await handle.close();handle=null;
   return {file,root:directory,scratch,dispose};
  }catch(error){if(handle)await handle.close();await unlink(file).catch(()=>{});await rmdir(directory);throw error;}
 };
}
