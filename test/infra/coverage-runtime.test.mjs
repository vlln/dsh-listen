import test from 'node:test';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import path from 'node:path';
const root=path.resolve(`.work/coverage-runtime-${process.pid}`);await mkdir(`${root}/src`,{recursive:true});
await writeFile(`${root}/src/example.mjs`,'export function value(x) {\n if (x) return 1;\n return 0;\n}\n');
const reporter=path.resolve('scripts/coverage.mjs');
function run(){const env={...process.env};delete env.NODE_TEST_CONTEXT;env.DSH_LISTEN_COVERAGE_ROOT=path.join(root,'src');return spawnSync(process.execPath,['--experimental-test-coverage','--test',`--test-reporter=${reporter}`,`${root}/example.test.mjs`],{encoding:'utf8',env});}
test('real Node coverage reporter fails missing branch and passes full fixture',async()=>{
 await writeFile(`${root}/example.test.mjs`,"import {value} from './src/example.mjs'; value(true);\n");const bad=run();assert.notEqual(bad.status,0);assert.match(bad.stderr,/COVERAGE_BELOW_THRESHOLD/);
 await writeFile(`${root}/example.test.mjs`,"import {value} from './src/example.mjs'; value(true); value(false);\n");const good=run();assert.equal(good.status,0,good.stderr);assert.match(good.stdout,/Source coverage gate passed/);
});
