// Offline projections only: no scoring imports, answer keys, model calls, or downloads.
const statuses = ['complete', 'timeout', 'failed', 'not_run'];
const tokenFields = ['input_tokens', 'output_tokens', 'cache_read_tokens'];
const fail = message => { throw Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const counts = values => Object.fromEntries([...new Set(values)].map(value => [value, values.filter(v => v === value).length]));

export function safeCaseId(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) fail('UNSAFE_CASE_ID');
  return id;
}
export function manifestIds(manifest) {
  const samples = Array.isArray(manifest) ? manifest : manifest?.samples ?? manifest?.sample_ids;
  if (!Array.isArray(samples)) fail('INVALID_MANIFEST');
  const ids = samples.map(row => safeCaseId(typeof row === 'string' ? row : row?.id));
  if (new Set(ids).size !== ids.length) fail('DUPLICATE_MANIFEST_ID');
  return ids;
}
function indexed(rows, label) {
  if (!Array.isArray(rows)) fail(`INVALID_${label}`);
  const map = new Map();
  for (const row of rows) {
    safeCaseId(row?.id);
    if (map.has(row.id)) fail(`DUPLICATE_${label}_ID`);
    map.set(row.id, row);
  }
  return map;
}
function measured(value, integer = false) {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (integer && !Number.isSafeInteger(value))) fail('INVALID_MEASUREMENT');
  return value;
}
function measurement(values) {
  const known = values.filter(value => value !== null);
  return {measured_samples: known.length, missing_samples: values.length - known.length,
    total: known.length ? known.reduce((a, b) => a + b, 0) : null};
}
/** Object keys are sorted recursively; array order and primitive types remain significant. */
export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function toolName(event) {
  return event.name ?? event.toolName ?? (typeof event.tool === 'string' ? event.tool : event.tool?.name) ?? 'unknown';
}
function input(event) {
  const value = event.input ?? event.arguments ?? event.args;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
}
// DSH results can be JSON strings, arrays of blocks, or {content:[{type:'text',text:...}]}.
function payloads(value) {
  if (typeof value === 'string') {
    try { return payloads(JSON.parse(value)); } catch { return []; }
  }
  if (Array.isArray(value)) return value.flatMap(payloads);
  if (!object(value)) return [];
  if (has(value, 'requested_features') || has(value, 'available_features') || has(value, 'evidence')) return [value];
  if (value.type === 'text' && typeof value.text === 'string') return payloads(value.text);
  return ['content', 'blocks', 'result'].flatMap(key => has(value, key) ? payloads(value[key]) : []);
}
function features(value) {
  return Array.isArray(value) ? [...new Set(value.filter(item => typeof item === 'string'))] : null;
}
function errorCode(value) {
  if (object(value)) {
    if (typeof value.code === 'string') return value.code;
    if (has(value, 'error')) return errorCode(value.error);
    if (has(value, 'content')) return errorCode(value.content);
    if (has(value, 'text')) return errorCode(value.text);
    if (has(value, 'message')) return errorCode(value.message);
  }
  if (Array.isArray(value)) return value.map(errorCode).find(code => code !== 'UNKNOWN_TOOL_ERROR') ?? 'UNKNOWN_TOOL_ERROR';
  if (typeof value === 'string') {
    try { return errorCode(JSON.parse(value)); } catch { /* A plain error string is also valid. */ }
    return value.match(/\b[A-Z][A-Z_]{3,}\b/)?.[0] ?? 'UNKNOWN_TOOL_ERROR';
  }
  return 'UNKNOWN_TOOL_ERROR';
}
function trace(events) {
  if (events === null) return {log_present: false, tool_calls: null, tool_results: null, repeated_calls: null,
    repeated_call_groups: null, result_status_counts: null, error_counts: null, evidence: null};
  if (!Array.isArray(events) || events.some(event => !object(event))) fail('INVALID_EVENTS');
  const calls = events.filter(event => event.type === 'tool_call');
  const results = events.filter(event => event.type === 'tool_result');
  const groups = new Map(), byId = new Map(), requested = [], available = [], reportedRequested = [], observations = [], errors = [];
  for (const call of calls) {
    const args = input(call), name = toolName(call);
    byId.set(call.callId ?? call.id, call);
    requested.push(...(features(args?.features) ?? []));
    // Absent arguments cannot establish a same-input repeat.
    if (args === undefined) continue;
    const key = stableJson([name, args]);
    const group = groups.get(key) ?? {tool: name, count: 0};
    group.count++; groups.set(key, group);
  }
  let truncated = 0, unknown = 0;
  for (const result of results) {
    const call = byId.get(result.callId ?? result.id);
    const observation = {call_id: result.callId ?? result.id ?? null, tool: call ? toolName(call) : toolName(result),
      status: result.status ?? 'unknown', requested_features: features(input(call ?? {})?.features), available_features: null};
    if (result.status !== 'completed') errors.push(errorCode(result.error ?? result.result));
    if (result.truncated) {
      truncated++; unknown++; observation.evidence_state = 'unknown_truncated';
    } else {
      const reports = payloads(result.result);
      const req = reports.flatMap(report => features(report.requested_features) ?? []);
      reportedRequested.push(...new Set(req));
      if (req.length) observation.requested_features = [...new Set(req)];
      const known = reports.filter(report => features(report.available_features) !== null || object(report.evidence));
      if (known.length) {
        const found = known.flatMap(report => features(report.available_features) ?? Object.entries(report.evidence)
          .filter(([, evidence]) => evidence?.status === 'ready').map(([feature]) => feature));
        observation.available_features = [...new Set(found)];
        available.push(...observation.available_features); observation.evidence_state = 'reported';
      } else { unknown++; observation.evidence_state = 'unknown'; }
      for (const report of reports) for (const evidence of Object.values(report.evidence ?? {})) {
        if (evidence?.error != null) errors.push(errorCode(evidence.error));
      }
    }
    observations.push(observation);
  }
  const repeats = [...groups.values()].filter(group => group.count > 1).map(group => ({...group, repeated_calls: group.count - 1}));
  return {log_present: true, tool_calls: calls.length, tool_results: results.length,
    repeated_calls: repeats.reduce((sum, group) => sum + group.repeated_calls, 0), repeated_call_groups: repeats,
    result_status_counts: counts(results.map(row => row.status ?? 'unknown')), error_counts: counts(errors),
    evidence: {requested_from_calls: counts(requested), requested_from_results: counts(reportedRequested),
      available_from_results: counts(available), unknown_results: unknown, truncated_results: truncated, observations}};
}
function mergeCounts(rows) {
  const totals = new Map();
  for (const row of rows) for (const [key, value] of Object.entries(row ?? {})) totals.set(key, (totals.get(key) ?? 0) + value);
  return Object.fromEntries(totals);
}
/** Pure blind analysis. Only status, measurement and tool-evidence fields are projected. */
export function analyzeBlind(manifest, results, eventLogs = {}) {
  const ids = manifestIds(manifest), expected = new Set(ids), resultMap = indexed(results, 'RESULT');
  for (const id of resultMap.keys()) if (!expected.has(id)) fail('MISMATCHED_RESULT_CASE_SET');
  const logs = eventLogs instanceof Map ? eventLogs : new Map(Object.entries(eventLogs));
  for (const id of logs.keys()) if (!expected.has(safeCaseId(id))) fail('MISMATCHED_LOG_CASE_SET');
  const cases = ids.map(id => {
    const row = resultMap.get(id), status = row?.status ?? 'not_run';
    if (!statuses.includes(status)) fail('INVALID_RESULT_STATUS');
    const error = row?.error == null ? null : errorCode(row.error);
    return {id, status, result_present: row !== undefined, error_code: error,
      duration_ms: measured(row?.duration_ms), tokens: Object.fromEntries(tokenFields.map(field => [field, measured(row?.usage?.[field], true)])),
      trace: trace(logs.get(id) ?? null)};
  });
  return {schema_version: 'blind-experiment-analysis-v1', mode: 'blind', total: cases.length,
    status_counts: Object.fromEntries(statuses.map(status => [status, cases.filter(row => row.status === status).length])),
    missing_results: cases.filter(row => !row.result_present).length, missing_logs: cases.filter(row => !row.trace.log_present).length,
    error_counts: mergeCounts(cases.map(row => mergeCounts([row.error_code ? {[row.error_code]: 1} : {}, row.trace.error_counts]))),
    tool_calls: measurement(cases.map(row => row.trace.tool_calls)), repeated_calls: measurement(cases.map(row => row.trace.repeated_calls)),
    tool_result_status_counts: mergeCounts(cases.map(row => row.trace.result_status_counts)),
    evidence: {requested_from_calls: mergeCounts(cases.map(row => row.trace.evidence?.requested_from_calls)),
      requested_from_results: mergeCounts(cases.map(row => row.trace.evidence?.requested_from_results)),
      available_from_results: mergeCounts(cases.map(row => row.trace.evidence?.available_from_results)),
      unknown_results: measurement(cases.map(row => row.trace.evidence?.unknown_results ?? null)),
      truncated_results: measurement(cases.map(row => row.trace.evidence?.truncated_results ?? null))},
    duration_ms: measurement(cases.map(row => row.duration_ms)),
    tokens: Object.fromEntries(tokenFields.map(field => [field, measurement(cases.map(row => row.tokens[field]))])),
    limitations: ['No answers or scoring decisions are accessed or inferred.',
      'Component counts describe explicit tool requests/reports, not correctness or causal benefit.',
      'Missing/unparseable/truncated evidence is unknown, never evidence of absence; projection truncation does not prove model-side truncation.',
      'Durations and separate token counters use result measurements only; unknown is null, cache tokens are not added to input, no billing inference.'], cases};
}
function pairedCounts(pairs) {
  const out = {total: pairs.length, gains: 0, losses: 0, both_correct: 0, both_wrong: 0};
  for (const {a, b} of pairs) out[a.correct ? (b.correct ? 'both_correct' : 'losses') : (b.correct ? 'gains' : 'both_wrong')]++;
  return {...out, correct_a: out.both_correct + out.losses, correct_b: out.both_correct + out.gains,
    accuracy_delta_b_minus_a: pairs.length ? (out.gains - out.losses) / pairs.length : null};
}
function domainFor(summary, row) {
  const samples = summary.provenance?.manifest?.samples;
  const metadata = Array.isArray(samples) ? samples.find(sample => sample?.id === row.id) : undefined;
  const domain = row.domain ?? row.task ?? metadata?.domain ?? metadata?.task;
  if (domain != null && typeof domain !== 'string') fail('INVALID_DOMAIN');
  return domain ?? null;
}
function summaryMeasurement(summary, field) {
  const value = field === 'duration_ms' ? summary.duration_ms : summary.tokens?.[field];
  if (value == null) return null;
  if (!object(value)) fail('INVALID_SUMMARY_MEASUREMENT');
  const measuredSamples = measured(value.measured_samples, true), missingSamples = measured(value.missing_samples, true);
  const total = measured(value.total, field !== 'duration_ms');
  if (measuredSamples === null || missingSamples === null || measuredSamples + missingSamples !== summary.total ||
      (measuredSamples === 0 ? total !== null : total === null)) fail('INVALID_SUMMARY_MEASUREMENT');
  return {measured_samples: measuredSamples, missing_samples: missingSamples, total};
}
/** Compare existing decisions verbatim; never call a scorer or reinterpret raw predictions. */
export function comparePaired(summaryA, summaryB) {
  function validate(summary) {
    if (!object(summary)) fail('INVALID_SUMMARY');
    const map = indexed(summary.cases, 'SUMMARY_CASE');
    if (summary.total !== map.size || [...map.values()].some(row => typeof row.correct !== 'boolean' || !statuses.includes(row.status))) fail('INVALID_SUMMARY_CASES');
    if (summary.correct !== [...map.values()].filter(row => row.correct).length) fail('INCONSISTENT_SUMMARY_CORRECT');
    return map;
  }
  const aMap = validate(summaryA), bMap = validate(summaryB);
  if (aMap.size !== bMap.size || [...aMap.keys()].some(id => !bMap.has(id))) fail('MISMATCHED_PAIRED_CASE_SET');
  const pairs = [...aMap.values()].map(a => ({a, b: bMap.get(a.id)})), domains = new Map();
  let domainUnknown = 0;
  for (const pair of pairs) {
    const a = domainFor(summaryA, pair.a), b = domainFor(summaryB, pair.b);
    if (a !== null && b !== null && a !== b) fail('MISMATCHED_PAIRED_DOMAIN');
    const domain = a ?? b;
    if (domain === null) { domainUnknown++; continue; }
    const group = domains.get(domain) ?? []; group.push(pair); domains.set(domain, group);
  }
  const comparisons = Object.fromEntries(['duration_ms', ...tokenFields].map(field => {
    const a = summaryMeasurement(summaryA, field), b = summaryMeasurement(summaryB, field);
    const comparable = a?.measured_samples === pairs.length && b?.measured_samples === pairs.length && pairs.length > 0;
    return [field, {a, b, total_delta_b_minus_a: comparable ? b.total - a.total : null,
      comparison_scope: comparable ? 'full_denominator_measured' : 'incomplete_or_unknown_measurements_not_comparable'}];
  }));
  return {schema_version: 'paired-experiment-analysis-v1', mode: 'paired', direction: 'B minus A',
    full_denominator: pairedCounts(pairs), domains: Object.fromEntries([...domains].map(([name, group]) => [name, pairedCounts(group)])),
    unknown_domain_cases: domainUnknown,
    completion_subset: {label: 'Both statuses complete: selected subset, not a causal effect estimate; no answer-based filtering.',
      ...pairedCounts(pairs.filter(({a, b}) => a.status === 'complete' && b.status === 'complete'))},
    measurements: comparisons,
    limitations: ['Existing boolean scoring decisions are preserved; no rescoring or answer access.',
      'Full denominator includes failed, timed-out, and not-run cases as already scored.',
      'Completion selection is descriptive, not causal. Aggregate-only measurements do not establish per-case paired timing/token effects.'],
    cases: pairs.map(({a, b}) => ({id: a.id, status_a: a.status, status_b: b.status, correct_a: a.correct, correct_b: b.correct}))};
}
