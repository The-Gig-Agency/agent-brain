# Promotion rubric: candidate → frozen-debug-v2 (v0.1)

Use when deciding whether **any** candidate replay case (or pack) should become **`frozen-debug-v2`**. This doc does **not** authorize edits to `frozen-debug-v1`; v1 stays immutable per `frozen-debug-v1-lock.md`.

## Preconditions (all must hold)

1. **Labeling / metric truth issue** — v1 case labels, evaluator truth, or pass-threshold semantics are wrong in a way that **cannot** be fixed without changing frozen v1 meaning (document the defect with issue links and repro).
2. **Metric schema** — if scoring shape changes, bump **`replay-report-frozen-v2`** (or equivalent) and ship new lock + manifest row; do not silently extend v1 schema.
3. **No “score chasing”** — promotion is blocked if the only driver is improving headline accuracy on mutable suites without invariant/calibration gain on harness + frozen production runs.
4. **Ablations** — at least one one-factor debugging ablation still shows primitive-specific effect on the **transition candidate** lane (or agreed successor lane) in the cycle before promotion.
5. **Board / sprint hygiene** — promotion ticket references new fixture paths, new npm script names (if any), and the ratifying commit after merge.

## Deliverables for frozen-debug-v2

- New visible + evaluator fixture pair (new filenames, never overwrite v0.8 frozen pair).
- `frozen-debug-v2-lock.md` + `frozen-lanes-manifest-v2.json` (or manifest section) with suite id, metric schema id, `implementation_commit_resolve` anchor.
- `eval:frozen:debug:v2` (or agreed name) pointing at the new runner/fixture pair.
- Short migration note: “headline frozen lane tag moves from v1 to v2 as of `<date>`; v1 retained for history only.”

## Explicit non-reasons (do not promote for these alone)

- Wording leakage in candidate lane (use paraphrase packs first).
- Router tuning that only helps mutable candidate metrics without frozen headline parity or clear invariant story.
- “We want fresher incidents” without labeling/metric defect.

## Sign-off

- Owner name, date, and link to the appendix cycle that recorded the decision (`cycle-appendix-negatives-template-v0.1.md`).
