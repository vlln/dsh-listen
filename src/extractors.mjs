import {makeAsrProvider} from './asr.mjs';
export function configureExtractors(config={}, {secretProvider}={}){
 if(!config||typeof config!=='object')throw Error('INVALID_EXTRACTOR_SETTINGS');
 const providers={};
 if(config.asrEnabled===true){
  if(config.asrRequiresKey===true&&typeof secretProvider!=='function')throw Error('ASR_CREDENTIAL_PROVIDER_REQUIRED');
  providers.transcript=makeAsrProvider({endpoint:config.asrEndpoint,model:config.asrModel,allowExternal:config.allowExternalAudio===true,timeoutMs:config.asrTimeoutMs??20000,...(secretProvider?{secretProvider}:{})});
 }
 return providers;
}
