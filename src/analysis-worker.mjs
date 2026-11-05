import {parentPort,workerData} from 'node:worker_threads';
import {describeSignal} from './signal.mjs';
import {preparePlot} from './plot-data.mjs';
import {renderPlot} from './image.mjs';
import {spectrumEvidence} from './dsp-spectrum.mjs';
import {temporalEvidence} from './dsp-temporal.mjs';
import {measurementEvidence} from './dsp-measurements.mjs';
import {selectiveAnalysis} from './selective-analysis.mjs';
// The same entry is exercised directly for numerical/error coverage and through
// real workers for cancellation, transfer and lifecycle contracts.
export function executeAnalysis({channels,sampleRate,options}){
 try{
  if(options.kind==='features')return selectiveAnalysis(channels,sampleRate,options);
  if(options.kind==='dsp'){
   const spectral=spectrumEvidence(channels,sampleRate,{offset:options.offset??0,band:options.band??null});
   const temporal=temporalEvidence(channels,sampleRate,{offset:options.offset??0});
   const measurements=measurementEvidence(describeSignal(channels,sampleRate,{offset:options.offset??0}),temporal);
    return {status:'ready',method:'dsp-v2',coverage:{from:options.offset??0,to:(options.offset??0)+channels[0].length/sampleRate},spectral,temporal,measurements};
  }
  const statistics=describeSignal(channels,sampleRate,{offset:options.offset});
  const plot=preparePlot(channels,sampleRate,options);
  const image=renderPlot(plot);
  const metadata={coverage:plot.coverage,parameters:plot.parameters,statistics_parameters:plot.statistics_parameters,frequency_hz:plot.frequency_hz,limitations:plot.limitations};
  return {statistics,plot:metadata,png:image.png,image:image.metadata};
 }catch(error){return {error:error?.message??'ANALYSIS_WORKER_FAILED'};}
}
if(parentPort)parentPort.postMessage(executeAnalysis(workerData));
