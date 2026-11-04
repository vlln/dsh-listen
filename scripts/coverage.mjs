import path from 'node:path';
import {readdirSync} from 'node:fs';
// Coverage reporter adapter for Node's structured test:coverage event.
export function checkCoverage(summary,{minimumLines=90,minimumBranches=80,sourcePrefix='/src/',expectedFiles}={}){
 if(!summary||!Array.isArray(summary.files))throw Error('INVALID_COVERAGE_REPORT');
 const expected=expectedFiles&&new Set(expectedFiles.map(p=>path.resolve(p)));
 const files=summary.files.filter(f=>typeof f.path==='string'&&(expected?expected.has(path.resolve(f.path)):f.path.replaceAll('\\','/').includes(sourcePrefix)));
 if(expected&&[...expected].some(p=>!files.some(f=>path.resolve(f.path)===p)))throw Error('MISSING_SOURCE_COVERAGE');
 if(!files.length)throw Error('NO_SOURCE_COVERAGE');
 for(const f of files){
  if(!Number.isFinite(f.coveredLinePercent)||!Number.isFinite(f.coveredBranchPercent))throw Error('INVALID_COVERAGE_METRICS');
  if(f.coveredLinePercent<minimumLines||f.coveredBranchPercent<minimumBranches)throw Error(`COVERAGE_BELOW_THRESHOLD: ${f.path}`);
 }
 return {files:files.length,minimumLines,minimumBranches};
}
export default async function* coverageReporter(source){
 let seen=false;
 for await(const event of source){
  if(event.type==='test:coverage'){
   seen=true;
   const root=path.resolve(process.env.DSH_LISTEN_COVERAGE_ROOT??'src');
   const entries=readdirSync(root,{recursive:true,withFileTypes:true});
   const expectedFiles=entries.filter(e=>e.isFile()&&e.name.endsWith('.mjs')).map(e=>path.join(e.parentPath??e.path,e.name));
   checkCoverage(event.data.summary,{expectedFiles});
   yield `Source coverage gate passed\n`;
  }
 }
 if(!seen)throw Error('NO_COVERAGE_EVENT');
}
