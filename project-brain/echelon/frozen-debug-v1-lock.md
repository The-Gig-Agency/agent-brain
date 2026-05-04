# frozen-debug-v1 (ratified)

Canonical **debugging** frozen lane for adaptive-commitment longitudinal claims. Human-readable companion to `frozen-lanes-manifest-v1.json`.

## Suite identity

| Field | Value |
| --- | --- |
| Tag | `frozen-debug-v1` |
| Visible fixture | `fixtures/echelon/real-replays-v0.8.visible.json` |
| Evaluator fixture | `fixtures/echelon/real-replays-v0.8.evaluator.json` |
| Runner (npm) | `eval:frozen:debug:v1` (wraps `run-real-replays-v0.8.ts`) |
| Report `suite_id` | `real-replays-v0.8` |
| Case count | 10 |

## Implementation pin (agent-brain)

Resolve the exact git SHA that ratified this lane (same tree as these lock files):

```bash
git log -1 --format=%H -- project-brain/echelon/frozen-lanes-manifest-v1.json
```

Runs used for **comparable** headline deltas should use that resolved commit **or** a later commit only together with a **new** frozen lane version if router/evaluator semantics changed.

## Metric schema version

**`replay-report-frozen-v1`**

Defines the JSON shape emitted by `runReplaySuite` in `src/cognitive-router/replay-evaluator.ts`: `ReplayDatasetReport` including `summary` rates and per-case regime / baseline comparison fields. Any additive field is OK; **changing meaning** of `overall_pass`, existing `summary` keys, or hidden-regime labeling rules requires **`replay-report-frozen-v2`** and a new frozen lane tag.

## Pass thresholds (frozen lane — not accuracy-only)

All of the following must hold for a run to count as **passing frozen-debug-v1**:

1. **`overall_pass === true`** — same definition as code today: average routed hidden-regime match beats at least one strong baseline **and** at least one case has `routed_beats_fixed_heuristic`.
2. **Calibration vs score baseline**: `summary.routed_hidden_regime_match_rate >= summary.score_threshold_hidden_regime_match_rate` (routed regime agreement with evaluator truth must not trail the score-threshold baseline).
3. **No all-baseline collapse**: `summary.routed_beats_fixed_case_count >= 1` (redundant with `overall_pass` today; kept explicit for reviewers).

Optional diagnostic (fail does not void a pass if rows 1–3 hold): publish the three match rates and per-case slice for any case where `routed_matches_hidden_regime === false`.

## Immutability

- **No in-place edits** to the v0.8 visible/evaluator pair once ratified as frozen-debug-v1: no case text swaps, no `hidden_expected_regime_override` changes, no relabeling to “fix” scores.
- If fixtures, labels, or metric semantics must change, add **`frozen-debug-v2`** (new files + lock + manifest row) and keep v1 artifacts untouched for history.

## Related

- Program protocol: `adaptive-commitment-control-protocol-v0.1.md`
- Findings (informational): `findings-real-replays-v0.8.md`
