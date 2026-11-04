import {open,readFile,writeFile,unlink} from 'node:fs/promises';
export async function reserveRequest(file,limit=40){
 if(typeof file!=='string'||!file||!Number.isInteger(limit)||limit<1||limit>40)throw Error('INVALID_PREVIEW_BUDGET');
 const lock=await open(file+'.lock','wx',0o600);
 try{
  let state;try{state=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state={requests:0};}
  if(!Number.isInteger(state.requests)||state.requests<0)throw Error('INVALID_BUDGET_STATE');
  if(state.requests>=limit)throw Error('HEADLESS_PREVIEW_REQUEST_LIMIT');
  state.requests++;await writeFile(file,JSON.stringify(state),{mode:0o600});return state.requests;
 }finally{await lock.close();await unlink(file+'.lock');}
}
