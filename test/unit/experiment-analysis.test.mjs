import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {analyzeBlind, comparePaired, stableJson} from '../../evaluation/lib/experiment-analysis.mjs';
const cli = fileURLToPath(new URL('../../evaluation/cli/analyze-experiment.mjs', import.meta.url));
const row = (id, extra = {}) => ({id, status: 'complete', model_output: 'RAW answer must not be interpreted', ...extra});
const scored = cases => ({total: cases.length, correct: cases.filter(c => c.correct).length, cases});
const decision = (id, correct, status = 'complete', extra = {}) => ({id, correct, status, ...extra});

test('blind preserves missing cases/logs, result counters and raw answers without scoring', () => {
  const manifest = ['a', 'b', 'c'];
  const results = [row('a', {duration_ms: 0, usage: {input_tokens: 0, cache_read_tokens: 4}}), row('b', {status: 'timeout', error: 'LOG_LIMIT_EXCEEDED'})];
  const before = JSON.stringify({manifest, results});
  const out = analyzeBlind(manifest, results, {a: [{type: 'status', phase: 'step_end', usage: {inputTokens: 999}}]});
  assert.equal(out.total, 3); assert.equal(out.missing_results, 1); assert.equal(out.missing_logs, 2);
  assert.deepEqual(out.status_counts, {complete: 1, timeout: 1, failed: 0, not_run: 1});
  assert.deepEqual(out.duration_ms, {measured_samples: 1, missing_samples: 2, total: 0});
  assert.equal(out.tokens.input_tokens.total, 0); assert.equal(out.tokens.output_tokens.total, null);
  assert.equal(out.cases[1].trace.tool_calls, null); assert.equal(out.cases[0].trace.tool_calls, 0);
  assert.equal(out.error_counts.LOG_LIMIT_EXCEEDED, 1);
  assert.equal(JSON.stringify({manifest, results}), before); assert.doesNotMatch(JSON.stringify(out), /RAW answer|model_output|999/);
});
test('same tool/input repeated calls use stable nested keys but preserve arrays and tool identity', () => {
  const call = (callId, tool, input) => ({type: 'tool_call', callId, tool, input});
  const events = [call('1', 'listen', {features: ['dsp'], range: {to: 4, from: 1}}),
    call('2', 'listen', {range: {from: 1, to: 4}, features: ['dsp']}),
    call('3', 'other', {features: ['dsp'], range: {to: 4, from: 1}}),
    call('4', 'listen', {features: ['signal', 'dsp']}), call('5', 'listen', {features: ['dsp', 'signal']}),
    call('6', 'listen', undefined), call('7', 'listen', undefined)];
  const out = analyzeBlind(['a'], [], {a: events});
  assert.equal(out.cases[0].trace.repeated_calls, 1); assert.equal(out.cases[0].trace.repeated_call_groups.length, 1);
  assert.equal(stableJson({a: {z: 1, b: 2}}), stableJson({a: {b: 2, z: 1}}));
});
test('tool block/string/array reports distinguish requested, ready, unavailable, truncated and errors', () => {
  const report = {requested_features: ['dsp', 'events'], available_features: ['dsp'], evidence: {events: {status: 'error', error: 'EVENTS_UNAVAILABLE'}}};
  const events = [
    {type: 'tool_call', callId: '1', tool: 'listen', input: {features: ['dsp', 'events']}},
    {type: 'tool_result', callId: '1', status: 'completed', result: [{type: 'text', text: JSON.stringify(report)}]},
    {type: 'tool_result', status: 'completed', result: JSON.stringify({available_features: []})},
    {type: 'tool_result', status: 'completed', result: {content: [{type: 'text', text: JSON.stringify({evidence: {signal: {status: 'ready'}, transcript: {status: 'unavailable'}}})}]}},
    {type: 'tool_result', status: 'error', result: [{type: 'text', text: 'Error: EMPTY_RANGE'}]},
    {type: 'tool_result', status: 'error', truncated: true, result: 'Error: TOOL_TIMEOUT'},
    {type: 'tool_result', status: 'completed', truncated: true, result: JSON.stringify(report)},
    {type: 'tool_result', status: 'completed', result: 'not JSON'}];
  const out = analyzeBlind(['a'], [], {a: events}), evidence = out.cases[0].trace.evidence;
  assert.deepEqual(evidence.available_from_results, {dsp: 1, signal: 1});
  assert.deepEqual(evidence.requested_from_calls, {dsp: 1, events: 1});
  assert.equal(evidence.truncated_results, 2); assert.equal(evidence.unknown_results, 4);
  assert.deepEqual(evidence.observations[1].available_features, []);
  assert.equal(evidence.observations[5].available_features, null);
  assert.deepEqual(out.error_counts, {EVENTS_UNAVAILABLE: 1, EMPTY_RANGE: 1, TOOL_TIMEOUT: 1});
});
test('blind IDs, sets, statuses and measurements fail closed', () => {
  for (const id of ['../x', '.', '..', '/x', '', 'x/y', 'a\\b']) assert.throws(() => analyzeBlind([id], []), /UNSAFE_CASE_ID/);
  assert.throws(() => analyzeBlind(['a', 'a'], []), /DUPLICATE_MANIFEST/);
  assert.throws(() => analyzeBlind(['a'], [row('a'), row('a')]), /DUPLICATE_RESULT/);
  assert.throws(() => analyzeBlind(['a'], [row('b')]), /MISMATCHED_RESULT/);
  assert.throws(() => analyzeBlind(['a'], [], {b: []}), /MISMATCHED_LOG/);
  assert.throws(() => analyzeBlind(['a'], [row('a', {status: 'unknown'})]), /INVALID_RESULT_STATUS/);
  assert.throws(() => analyzeBlind(['a'], [row('a', {duration_ms: -1})]), /INVALID_MEASUREMENT/);
});
test('paired decisions retain full denominator, domains, selection label and measured comparisons', () => {
  const a = scored([decision('gain', false, 'timeout', {domain: 'sound'}), decision('loss', true, 'complete', {domain: 'sound'}), decision('both', true), decision('wrong', false, 'not_run')]);
  const b = scored([decision('wrong', false), decision('both', true), decision('loss', false, 'complete', {domain: 'sound'}), decision('gain', true, 'complete', {domain: 'sound'})]);
  a.duration_ms = {measured_samples: 4, missing_samples: 0, total: 100};
  b.duration_ms = {measured_samples: 4, missing_samples: 0, total: 80};
  a.tokens = {input_tokens: {measured_samples: 1, missing_samples: 3, total: 10}};
  const before = JSON.stringify({a, b});
  const out = comparePaired(a, b);
  assert.deepEqual(out.full_denominator, {total: 4, gains: 1, losses: 1, both_correct: 1, both_wrong: 1, correct_a: 2, correct_b: 2, accuracy_delta_b_minus_a: 0});
  assert.equal(out.domains.sound.total, 2); assert.equal(out.unknown_domain_cases, 2);
  assert.equal(out.completion_subset.total, 2); assert.match(out.completion_subset.label, /selected subset, not a causal/);
  assert.equal(out.measurements.duration_ms.total_delta_b_minus_a, -20);
  assert.equal(out.measurements.input_tokens.total_delta_b_minus_a, null);
  assert.equal(JSON.stringify({a, b}), before);
});
test('paired rejects duplicate/mismatched IDs, non-boolean decisions, inconsistent totals and domains', () => {
  const a = scored([decision('a', true)]);
  assert.throws(() => comparePaired(a, scored([decision('b', true)])), /MISMATCHED_PAIRED_CASE_SET/);
  assert.throws(() => comparePaired(a, scored([decision('a', true), decision('a', false)])), /DUPLICATE_SUMMARY_CASE/);
  assert.throws(() => comparePaired(a, {...a, total: 3}), /INVALID_SUMMARY_CASES/);
  assert.throws(() => comparePaired(a, {...a, correct: 0}), /INCONSISTENT_SUMMARY_CORRECT/);
  assert.throws(() => comparePaired(a, {...a, cases: [decision('a', 'true')]}), /INVALID_SUMMARY_CASES/);
  assert.throws(() => comparePaired(scored([decision('a', true, 'complete', {domain: 'sound'})]), scored([decision('a', true, 'complete', {domain: 'music'})])), /MISMATCHED_PAIRED_DOMAIN/);
});
test('synthetic CLI blind/paired are exclusive and preserve raw predictions/scoring bytes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-analysis-'));
  try {
    const run = path.join(root, 'run'); await fs.mkdir(path.join(run, 'results', 'a'), {recursive: true});
    const save = (filename, data) => fs.writeFile(filename, JSON.stringify(data));
    await save(path.join(run, 'manifest.json'), {samples: [{id: 'a'}, {id: 'missing'}]});
    const raw = JSON.stringify(row('a')); await fs.writeFile(path.join(run, 'results/a/result.json'), raw);
    await save(path.join(run, 'results/a/events.jsonl'), {type: 'final', text: 'RAW ANSWER'});
    // Invalid scoring JSON must never be opened in blind mode.
    await fs.mkdir(path.join(run, 'scoring')); await fs.writeFile(path.join(run, 'scoring/summary.json'), 'DO NOT READ');
    const exec = (...args) => spawnSync(process.execPath, [cli, ...args], {encoding: 'utf8'});
    const output = path.join(root, 'blind'); let child = exec('blind', run, output); assert.equal(child.status, 0, child.stderr);
    const report = JSON.parse(await fs.readFile(path.join(output, 'analysis.json'), 'utf8'));
    assert.equal(report.total, 2); assert.equal(report.missing_logs, 1); assert.doesNotMatch(JSON.stringify(report), /RAW/);
    child = exec('blind', run, output); assert.notEqual(child.status, 0); assert.match(child.stderr, /EEXIST/);
    const summary = scored([decision('a', false), decision('missing', true, 'timeout')]);
    const summaryFile = path.join(root, 'summary.json'); await save(summaryFile, summary);
    const original = await fs.readFile(summaryFile, 'utf8');
    child = exec('paired', summaryFile, summaryFile, path.join(root, 'paired')); assert.equal(child.status, 0, child.stderr);
    assert.equal(await fs.readFile(summaryFile, 'utf8'), original); assert.equal(await fs.readFile(path.join(run, 'results/a/result.json'), 'utf8'), raw);
    await save(path.join(run, 'manifest.json'), ['../escape']); child = exec('blind', run, path.join(root, 'unsafe')); assert.notEqual(child.status, 0); assert.match(child.stderr, /UNSAFE_CASE_ID/);
    await save(path.join(run, 'manifest.json'), ['a']); await fs.writeFile(path.join(run, 'results/a/events.jsonl'), '{broken');
    child = exec('blind', run, path.join(root, 'malformed')); assert.notEqual(child.status, 0); assert.match(child.stderr, /MALFORMED_EVENT_LOG/);
    await fs.writeFile(path.join(run, 'results/a/events.jsonl'), ''); await fs.mkdir(path.join(run, 'results/unknown'));
    child = exec('blind', run, path.join(root, 'unknown')); assert.notEqual(child.status, 0); assert.match(child.stderr, /UNKNOWN_RESULT_ENTRY/);
  } finally {
    assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith('dsh-analysis-'));
    await fs.rm(root, {recursive: true, force: true});
  }
});
