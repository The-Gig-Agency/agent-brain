# Ablation matrix v0.1 — findings stub

## Run

```bash
npm run eval:ablation-matrix:v0.1
```

Emits JSON under `reports/ablation-matrix-v0.1/` with:

- **`frozen_lanes_unmodified`**: production metrics for **frozen-debug** replay pack (`real-replays-v0.8.*`, same as `eval:frozen:debug:v1`) and **frozen-media** (`media-decision-v0.1`, same as `eval:frozen:media:v1`). These paths are **not** altered by the matrix.
- **`harness_baselines`**: analysis harnesses that inject **synthetic `MemoryScoringContext`** into `scoreTerrain` (replay + media) so memory-strip ablations can show deltas. Harness ≠ frozen headline.
- **`debugging_ablations`**: one-factor toggles on **`DEBUGGING_TRANSITION_CANDIDATE_V01_CASES`** via `DebugRunOptions` (full simulator primitives).
- **`primitive_contribution_table`**: merged view (deltas vs respective harness baselines).

## Primitive mapping (debugging simulator)

| Row | `DebugRunOptions` |
| --- | --- |
| failed_path_memory | `disable_failed_path_memory` |
| transition_rules | `disable_transitions` |
| confidence_gating | `disable_confidence_gating` |
| drift_recovery | `disable_drift_recovery` |
| inspection_before_compound | `disable_inspection_before_compound` |

## Replay / media harness (honest scope)

- **Replay v0.8** routing is single-shot `scoreTerrain` on inferred terrain. There are **no** explicit transition or inspect-before-compound mechanics; those rows are marked **n/a** on the replay harness.
- **Media v0.1** uses heuristics + calibration layered on `scoreTerrain`; `inspection_before_compound` is marked **n/a** until a dedicated gate exists.

## Next

- Tighten harness memory to case-derived signals only (per-visible augmentation) if we want replay deltas without a fixed synthetic vector.
- Add automated regression: fail if `primitive_contribution_table` shows all-zero effects on **debugging** lane for two consecutive cycles (per program hard-stop).
