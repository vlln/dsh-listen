import {configureExtractors} from './extractors.mjs';
import {makeLocalAsrProvider} from './local-asr.mjs';
import {makeLocalEventProvider} from './local-events.mjs';
export async function prepareExtractors(config={},dependencies={}){
 let providers;
 if(config.asrEnabled!==true||config.asrMode===undefined||config.asrMode==='api')providers=configureExtractors(config,dependencies);
 else{
  if(config.asrMode!=='local')throw Error('INVALID_ASR_MODE');
  providers={transcript:await makeLocalAsrProvider({python:config.asrPython,modelDirectory:config.asrModelDirectory,scratch:config.scratch,timeoutMs:config.asrTimeoutMs??180000})};
 }
 if(config.eventsEnabled===true)providers.events=await makeLocalEventProvider({python:config.eventsPython,modelPath:config.eventsModelPath,scratch:config.scratch,timeoutMs:config.eventsTimeoutMs??20000});
 return providers;
}
