// Offline-only CLI. Blind mode never opens scoring files, keys, or dataset answers.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {analyzeBlind, comparePaired, manifestIds} from '../lib/experiment-analysis.mjs';

async function regularFile(filename, optional = false) {
  try {
    if (!(await fs.lstat(filename)).isFile()) throw Error(`NOT_REGULAR_FILE: ${filename}`);
    return await fs.readFile(filename, 'utf8');
  } catch (error) { if (optional && error.code === 'ENOENT') return null; throw error; }
}
async function json(filename, optional = false) {
  const text = await regularFile(filename, optional);
  return text === null ? null : JSON.parse(text);
}
async function directory(filename, optional = false) {
  try {
    if (!(await fs.lstat(filename)).isDirectory()) throw Error(`NOT_DIRECTORY: ${filename}`);
    return await fs.readdir(filename, {withFileTypes: true});
  } catch (error) { if (optional && error.code === 'ENOENT') return []; throw error; }
}
export async function readBlindRun(runDirectory) {
  await directory(runDirectory);
  const manifest = await json(path.join(runDirectory, 'manifest.json')), ids = manifestIds(manifest), expected = new Set(ids);
  const resultDirectory = path.join(runDirectory, 'results');
  const entries = await directory(resultDirectory, true);
  for (const entry of entries) {
    if (!expected.has(entry.name)) throw Error(`UNKNOWN_RESULT_ENTRY: ${entry.name}`);
    if (!entry.isDirectory()) throw Error('INVALID_RESULT_DIRECTORY');
  }
  const results = [], logs = new Map();
  for (const id of ids) {
    const base = path.join(resultDirectory, id);
    const row = await json(path.join(base, 'result.json'), true);
    if (row !== null) {
      if (row?.id !== id) throw Error(`RESULT_ID_MISMATCH: ${id}`);
      results.push(row);
    }
    const text = await regularFile(path.join(base, 'events.jsonl'), true);
    if (text !== null) {
      const events = text.split('\n').filter(line => line.trim()).map((line, index) => {
        try { return JSON.parse(line); } catch { throw Error(`MALFORMED_EVENT_LOG: ${id}:${index + 1}`); }
      });
      logs.set(id, events);
    }
  }
  return analyzeBlind(manifest, results, logs);
}
function markdown(report) {
  return [`# ${report.mode === 'blind' ? 'Blind trace analysis' : 'Offline paired comparison'}`, '',
    ...report.limitations.map(note => `- ${note}`), '', '```json', JSON.stringify(report, null, 2), '```', ''].join('\n');
}
export async function main(args) {
  const [mode, ...inputs] = args;
  let report, output;
  if (mode === 'blind' && inputs.length === 2) {
    report = await readBlindRun(path.resolve(inputs[0])); output = inputs[1];
  } else if (mode === 'paired' && inputs.length === 3) {
    report = comparePaired(await json(path.resolve(inputs[0])), await json(path.resolve(inputs[1]))); output = inputs[2];
  } else throw Error('Usage: node evaluation/cli/analyze-experiment.mjs blind RUN_DIRECTORY OUTPUT_DIRECTORY | paired SUMMARY_A SUMMARY_B OUTPUT_DIRECTORY');
  // mkdir is exclusive, including existing symlinks; every artifact also uses wx.
  const destination = path.resolve(output);
  await fs.mkdir(destination, {mode: 0o700});
  await fs.writeFile(path.join(destination, 'analysis.json'), `${JSON.stringify(report, null, 2)}\n`, {flag: 'wx', mode: 0o600});
  await fs.writeFile(path.join(destination, 'analysis.md'), markdown(report), {flag: 'wx', mode: 0o600});
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(report => console.log(JSON.stringify({mode: report.mode, total: report.total ?? report.full_denominator.total})))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
