# frozen-media-v1 (ratified)

Canonical **media decisioning** frozen lane: same governance pattern as debugging, smaller case count, aligned primitive lens (action choice + calibration + rationale depth).

## Suite identity

| Field | Value |
| --- | --- |
| Tag | `frozen-media-v1` |
| Dataset fixture | `fixtures/echelon/media-decision-v0.1.json` |
| Runner (npm) | `eval:frozen:media:v1` (wraps `run-media-eval-v0.1.ts`) |
| Report `suite_id` | `media-decision-v0.1` |
| Case count | 6 |

## Implementation pin (agent-brain)

Same as debugging: resolve via `frozen-lanes-manifest-v1.json` → `agent_brain.implementation_commit_resolve` (git one-liner in manifest).

## Metric schema version

**`media-report-frozen-v1`**

Defines the JSON shape from `runMediaEvaluationSuite` in `src/cognitive-router/media-evaluator.ts`: `MediaEvalReport` and per-case `acceptable_match`, `confidence_band_match`, `rationale_quality_pass`. Changing band thresholds in code, `overall_pass` composition, or case expected bands/actions without a new frozen tag requires **`media-report-frozen-v2`** and **frozen-media-v2** fixtures.

## Pass thresholds (frozen lane — invariants + calibration)

All of the following must hold (matches current `overall_pass` composition in code):

1. **`summary.acceptable_action_match_rate >= 0.83`**
2. **`summary.confidence_band_match_rate >= 0.66`**
3. **`summary.rationale_quality_pass_rate >= 1.0`** (every case meets minimum rationale bullet count)

Equivalently: **`overall_pass === true`** in the emitted report under the ratified evaluator implementation.

**Explicit non-goal for v1:** `exact_action_match_rate` is reported but not a frozen pass gate (acceptable-set handles legitimate multi-action families).

## Immutability

Same as frozen-debug-v1: **no in-place edits** to `media-decision-v0.1.json` for scoring convenience. Promote **`frozen-media-v2`** with new files if cases or expected bands change.

## Related

- Program protocol: `adaptive-commitment-control-protocol-v0.1.md`
- Findings (informational): `archive/findings-media-decision-v0.1.md`
