# Transition candidate lane v0.2 — findings stub

**Lane:** candidate (mutable). **Not** frozen-debug-v1.

## Contents (20 cases)

| Block | Count | Intent |
| --- | ---: | --- |
| `candidate-tf02-m01` … `m05` | 5 | Mirrors of v0.1 trap topologies with **new wording** (reduces single-phrase overfit vs v0.1). |
| `candidate-tf02-p01` … `p04` | 4 | **Paraphrase variants** of early switch, late switch, drift miss, partial-overcommit (same mechanics, different surface text). |
| `candidate-tf02-n01` … `n11` | 11 | **Boundary mix** from ablation-sensitive families: reversals, prune traps, shifting env, escape-leaning pressure, narrow artifacts/permissions. |

## Run

```bash
npm run eval:transition-candidate:v0.2
```

Reports: `reports/transition-candidate-v0.2/*.json` with `suite_id: "transition-candidate-v0.2"` and `transition_cycle_metrics` (same schema as v0.1).

## Sample run (local, illustrative)

One run after introduction: `routed_success_rate` 0.85, `premature_convergence_proxy_rate` 0.15, `transition_regret_avg` 0.5 — use your own `reports/transition-candidate-v0.2/*.json` for authoritative numbers.

## Notes

- `trap_family` in metrics uses ids after optional `mNN-` / `pNN-` / `nNN-` prefix (see `transition-candidate-metrics.ts`).
- v0.1 pack remains the **smaller** slice for quick regression; v0.2 is the **volume** lane for TGA-230 style iteration.
