import {parentPort,workerData} from 'node:worker_threads';
import {describeSignal} from './signal.mjs';
import {preparePlot} from './plot-data.mjs';
import {renderPlot} from './image.mjs';
try{
 const {channels,sampleRate,options}=workerData;
 const statistics=describeSignal(channels,sampleRate,{offset:options.offset});
 const plot=preparePlot(channels,sampleRate,options);
 const image=renderPlot(plot);
 // Keep only small plot metadata in canonical result; dense features are not text evidence.
 const metadata={coverage:plot.coverage,parameters:plot.parameters,statistics_parameters:plot.statistics_parameters,frequency_hz:plot.frequency_hz,limitations:plot.limitations};
 parentPort.postMessage({statistics,plot:metadata,png:image.png,image:image.metadata});
}catch(error){parentPort.postMessage({error:String(error)});}
