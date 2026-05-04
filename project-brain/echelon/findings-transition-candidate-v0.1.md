# Transition candidate lane v0.1 — findings stub

**Lane:** candidate (mutable). **Not** frozen-debug-v1. Safe to extend or relabel without breaking longitudinal frozen claims.

## How to run

```bash
npm run eval:transition-candidate:v0.1
```

Writes JSON under `reports/transition-candidate-v0.1/` with `suite_id: "transition-candidate-v0.1"` and a top-level **`transition_cycle_metrics`** block for operator-facing cycle reporting.

## Cases (trap intent)

| `case_id` | Trap family |
| --- | --- |
| `candidate-tf01-early-switch` | early switch |
| `candidate-tf01-late-switch` | late switch |
| `candidate-tf01-drift-miss` | drift miss (shifting terrain) |
| `candidate-tf01-partial-overcommit` | partial-success overcommit |
| `candidate-tf01-false-convergence` | false convergence (tight budget) |

## Protocol metric mapping (v0.1 proxies)

These are **engineering proxies** tied to existing `DebugRunResult` / trace signals until dedicated transition-first primitives land.

| Protocol name | v0.1 proxy in `transition_cycle_metrics` |
| --- | --- |
| Transition regret | `transition_regret_avg` (= mean of premature + delayed regret + unnecessary transition cost on routed policy) |
| Premature convergence | `premature_convergence_proxy_rate` (mean of `false_convergence \|\| premature_transition_regret > 0`) |
| Drift recovery cost | `drift_recovery_cost_avg` (mean `recovery_cost_after_wrong_switch`) |
| Drift presence | `drift_events_avg` (mean count of `drift_detected` trace events) |
| Confidence collapse quality | `confidence_collapse_quality_avg` (higher when low hysteresis and no false convergence) |
| Partial-resolution handling | `partial_resolution_handling_avg` (higher when fewer failed fixes before strength≥2 signal on true root family) |
| Calibration penalties | `calibration_penalty_avg` (mean `repeated_failed_paths + dead_end_persistence`) |

## Latest sample run (local, illustrative)

After first implementation, one run showed `routed_success_rate` 0.8, `premature_convergence_proxy_rate` 0.2 (driven by `candidate-tf01-false-convergence`), and `drift_events_avg` 0 on this router snapshot — use your own `reports/transition-candidate-v0.1/*.json` for authoritative numbers.

## Next steps

- Prefer **v0.2** for the expanded 20-case lane: `findings-transition-candidate-v0.2.md` and `npm run eval:transition-candidate:v0.2`.
- Wire the same metric block into a combined “cycle note” template alongside frozen lane runs.
