import {configureExtractors} from './extractors.mjs';
import {makeLocalAsrProvider} from './local-asr.mjs';
export async function prepareExtractors(config={},dependencies={}){
 if(config.asrEnabled!==true||config.asrMode===undefined||config.asrMode==='api')return configureExtractors(config,dependencies);
 if(config.asrMode!=='local')throw Error('INVALID_ASR_MODE');
 return {transcript:await makeLocalAsrProvider({python:config.asrPython,modelDirectory:config.asrModelDirectory,scratch:config.scratch,timeoutMs:config.asrTimeoutMs??180000})};
}
