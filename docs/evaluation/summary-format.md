# Offline run summary

当前入口见[评测 README](../../evaluation/README.md)，批次已执行成绩见[评测结果](./results.md)。本页summary是运行后外部评分产物；listen只有一种证据返回结构，不提供summary/full模式。当前版本尚未重跑效果评测。

This is an **unofficial local summary**, not an executed official MMAU report or
leaderboard score. It reuses `scorePredictions` from [protocol.mjs](../../evaluation/lib/protocol.mjs).
No models, audio, networks, assets preparation, credentials, or events are read.

```sh
node evaluation/cli/summarize-run.mjs RUN_DIRECTORY EXTERNAL_KEYS_PATH
```

Both arguments are required; there is no inferred latest run or default answer
path. The CLI reads `run.json`, `manifest.json`, and each selected
`results/<id>/result.json`. Keys must resolve outside the run directory and are
only read by this external scoring step. Never expose keys or scoring exports
to model sessions. An existing `scoring` directory is rejected wholesale,
including an empty directory; use a new run or deliberately relocate previous
scoring artifacts outside this script. Outputs use exclusive creation with
private permissions. Raw run artifacts are never overwritten. If writing fails,
a partial scoring directory may remain and is not automatically removed.

## Inputs

Canonical manifest: `{ "samples": [{ "id": "sample-a" }] }`, ordered and unique.
Other manifest provenance (dataset revision, hashes, references) is preserved in
CLI summary provenance alongside `run.json`. The pure API also accepts an ordered
array of IDs or `{id}` rows, or an object with `sample_ids`.

Result: `{ "id": "sample-a", "status": "complete", "model_output": "raw text" }`.
Status must be `complete`, `timeout`, `failed`, or `not_run`. An absent result
file is missing/not_run; explicit not_run records are counted separately. Unknown
result directories, duplicate/unknown result IDs, and mismatching file IDs fail
closed. CLI IDs must be safe single path components. Raw model_output must be a
string even for a failed result; late timeout text is ignored for scoring.

Optional measured fields:

```json
{
  "duration_ms": 1200,
  "model_requests": 2,
  "tool_calls": [{ "name": "listen", "status": "complete" }],
  "usage": { "input_tokens": 100, "output_tokens": 12, "cache_read_tokens": 40 }
}
```

Counters are explicit finite nonnegative safe integers; duration is a finite
nonnegative number. Requests must include retries if measured. Tool statuses
are recorded as supplied, not mapped to guessed success/failure categories.
Omit unmeasured fields or set them to null (including usage/tool_calls); both
represent missing measurements. An explicit empty tool list or zero counter is a measured zero.

External keys are an array with unique `id`, `task` (sound/speech/music),
`difficulty` (easy/medium/hard), `answer`, and ordered string `choices` containing
the answer. Optional `sub-category` is a string. Keys may contain unselected
samples; every selected sample requires valid scoring metadata. Other selected
key fields are retained in the official scorer rows, not copied into task input.

## Outputs and API

`summarizeRun(manifest, results, keys)` is pure and returns
`{summary, officialRows}`. The CLI writes `scoring/summary.json`, readable
`scoring/summary.md`, `scoring/predictions.json` (ordered raw complete outputs,
others empty), and `scoring/official-input.json`. The latter is an array of selected key rows with
`model_output`, in manifest order, suitable as input to the separately executed
official scorer; this script does not run that scorer.

Summary includes:
- Overall micro accuracy and domain/difficulty/optional subcategory breakdowns,
  each with correct/total and fractional accuracy in [0,1]. Every planned ID,
  including missing, failed, timeout, and not_run, stays in the denominator.
- Completion coverage: nonblank complete outputs / all planned IDs; separate
  status counts, missing files, recorded not_run, failures, timeouts, and blank
  complete results. Per-case correctness and presence are explicit.
- Measured duration total/count/min/max/mean/median/p95; median averages the
  middle pair, p95 is nearest rank over explicit values only.
- Requests, tools by name/status, and input/output/cache-read token counters.
  Each metric has measured_samples and missing_samples; entirely absent totals
  are null, not zero. Failed or timeout measurements still count if supplied.
- Cache-read tokens are separate, never added to input tokens. There is no
  combined token/billing estimate, currency conversion, or inferred usage.

Only complete nonblank output is scored/exported unchanged. Other outputs become
empty strings in official rows so the official scorer cannot silently skip them.
No labels, indices, JSON, explanations, or contradictions are converted/cleaned;
matching is the existing local token-based implementation. Its Unicode and
full-data equivalence to official scoring is not established.
