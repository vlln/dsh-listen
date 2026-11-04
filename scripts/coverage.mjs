// Coverage reporter adapter for Node's structured test:coverage event.
export function checkCoverage(summary,{minimumLines=90,minimumBranches=80,sourcePrefix='/src/'}={}){
 if(!summary||!Array.isArray(summary.files))throw Error('INVALID_COVERAGE_REPORT');
 const files=summary.files.filter(f=>typeof f.path==='string'&&f.path.replaceAll('\\','/').includes(sourcePrefix));
 if(!files.length)throw Error('NO_SOURCE_COVERAGE');
 for(const f of files){
  if(!Number.isFinite(f.coveredLinePercent)||!Number.isFinite(f.coveredBranchPercent))throw Error('INVALID_COVERAGE_METRICS');
  if(f.coveredLinePercent<minimumLines||f.coveredBranchPercent<minimumBranches)throw Error(`COVERAGE_BELOW_THRESHOLD: ${f.path}`);
 }
 return {files:files.length,minimumLines,minimumBranches};
}
export default async function* coverageReporter(source){
 for await(const event of source){
  if(event.type==='test:coverage'){
   checkCoverage(event.data.summary);
   yield `Source coverage gate passed\n`;
  }
 }
}
