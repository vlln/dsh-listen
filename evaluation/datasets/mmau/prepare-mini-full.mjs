// Extract every row of the verified MMAU-test-mini parquet into a runnable selection.
// Local preparation only: no model calls, no network, no answer inspection.
// Usage: node evaluation/datasets/mmau/prepare-mini-full.mjs [--chunk 100]
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {formatTask} from '../../lib/headless-adapter.mjs';
import {prepareEvaluation} from '../../lib/protocol.mjs';

const revision = 'ccd9696c0111ea7060827598f310558df0b71b0a';
const seed = process.env.MMAU_SEED ?? 'mmau-full-mini-v1';
const parquetPath = process.env.MMAU_PARQUET ?? '.work/mmau-media/test_mini.parquet.partial';
const expectedLfs = '54b76f440db843546f9ad49a1518cc22371f63a266f034ba6bd4343b7b6fde86';
const chunk = Number(process.argv.includes('--chunk') ? process.argv[process.argv.indexOf('--chunk') + 1] : 100);

const root = process.cwd();
const dataset = path.join(root, '.work/evaluation/datasets/mmau', revision);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));

// The cached media file is the official LFS object; refuse to proceed on a mismatch.
const parquetBytes = await fs.readFile(parquetPath);
if (digest(parquetBytes) !== expectedLfs) throw Error('PARQUET_HASH_MISMATCH');
const require = createRequire(path.resolve('.work/evaluation-reader/package.json'));
const {asyncBufferFromFile, parquetReadObjects, parquetMetadataAsync} = await import(pathToFileURL(require.resolve('hyparquet')));
const {compressors} = await import(pathToFileURL(require.resolve('hyparquet-compressors')));
const file = await asyncBufferFromFile(parquetPath);
const metadata = await parquetMetadataAsync(file);
const rowCount = Number(metadata.num_rows);

// Official annotations carry the question text the scoring protocol expects.
const envelope = await readJson('.work/metadata/mmau-annotations-api.json');
const annotations = JSON.parse(Buffer.from(envelope.content, 'base64'));
const byId = new Map(annotations.map(row => [row.id, row]));
if (annotations.length !== rowCount) throw Error('ANNOTATION_ROW_COUNT');

await fs.mkdir(path.join(dataset, 'media'), {recursive: true});
const caseAgents = '# Audio evaluation inputs\nThese are read-only inputs. Use the configured audio tools. Do not seek answer keys or access other cases.\n';
const rows = [];
for (let start = 0; start < rowCount; start += chunk) {
  const batch = await parquetReadObjects({file, columns: ['context', 'other_attributes'], utf8: false, rowStart: start, rowEnd: Math.min(rowCount, start + chunk), compressors});
  for (const row of batch) {
    const attributes = JSON.parse(typeof row.other_attributes === 'string' ? row.other_attributes : Buffer.from(row.other_attributes).toString('utf8'));
    const official = byId.get(attributes.id);
    if (!official) throw Error(`UNKNOWN_MEDIA_ID: ${attributes.id}`);
    const audio = row.context?.bytes ?? row.context;
    if (!(audio instanceof Uint8Array) || audio.length < 12) throw Error(`MISSING_MEDIA_BYTES: ${attributes.id}`);
    const sha = digest(audio), mediaName = `${sha}.wav`, mediaPath = path.join(dataset, 'media', mediaName);
    try { await fs.writeFile(mediaPath, audio, {flag: 'wx', mode: 0o600}); }
    catch (error) { if (error.code !== 'EEXIST') throw error; if (digest(await fs.readFile(mediaPath)) !== sha) throw Error(`ASSET_CHANGED: ${mediaName}`); }
    rows.push({id: attributes.id, audio, sha, mediaName, official});
  }
}

const sorted = rows.sort((a, b) => annotations.findIndex(row => row.id === a.id) - annotations.findIndex(row => row.id === b.id));
const samples = [];
for (const row of sorted) {
  const directory = path.join(dataset, 'cases', row.id);
  await fs.mkdir(directory, {recursive: true});
  const taskPath = path.join(directory, 'task.txt'), task = formatTask(row.official);
  await fs.writeFile(path.join(directory, 'AGENTS.md'), caseAgents, {flag: 'wx'}).catch(error => { if (error.code !== 'EEXIST') throw error; });
  try {
    await fs.writeFile(taskPath, task, {flag: 'wx', mode: 0o600});
    if (await fs.readFile(taskPath, 'utf8') !== task) throw Error(`TASK_CHANGED: ${row.id}`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (await fs.readFile(taskPath, 'utf8') !== task) throw Error(`TASK_CHANGED: ${row.id}`);
  }
  const link = path.join(directory, 'audio.wav');
  try { await fs.symlink(path.relative(directory, path.join(dataset, 'media', row.mediaName)), link); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  samples.push({
    id: row.id,
    workspace: path.relative(root, directory),
    audio_sha256: row.sha,
    audio_bytes: row.audio.length,
    task_sha256: digest(task),
    task_protocol: 'mmau-plain-text-v1'
  });
}

const selection = path.join(dataset, 'selections', seed);
await fs.mkdir(selection, {recursive: true});
const prepared = prepareEvaluation(sorted.map(row => ({...row.official, audio_id: `${row.id}.wav`})), {seed, developmentPerDomain: 10});
const exposure = sorted.map(row => ({id: row.id, domain: row.official.task, previous_development: prepared.development_ids.includes(row.id), previous_real_preview: false}));
const write = async (file, data) => { try { await fs.writeFile(file, data, {flag: 'wx', mode: 0o600}); } catch (error) { if (error.code !== 'EEXIST') throw error; } };
await write(path.join(selection, 'manifest.json'), JSON.stringify({seed, dataset_revision: revision, samples}, null, 2) + '\n');
await write(path.join(selection, 'exposure.json'), JSON.stringify(exposure, null, 2) + '\n');
await write(path.join(selection, 'keys.json'), JSON.stringify(prepared.keys, null, 2) + '\n');

const totalBytes = rows.reduce((sum, row) => sum + row.audio.length, 0);
console.log(JSON.stringify({
  seed,
  rows: rowCount,
  domains: exposure.reduce((acc, row) => (acc[row.domain] = (acc[row.domain] ?? 0) + 1, acc), {}),
  audio_bytes: totalBytes,
  audio_sha256_unique: new Set(rows.map(row => row.sha)).size,
  development_rows: prepared.development_ids.length,
  sealed_rows: prepared.test_ids.length,
  selection: path.relative(root, selection)
}));
