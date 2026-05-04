# Operating cadence — per-cycle checklist (v0.1)

Run **in order** each cycle before writing the cycle note. Frozen commands are the **headline** numbers; candidate and ablations are **innovation** and **causality** numbers.

## 1. Frozen headline (required)

- [ ] `npm run eval:frozen:debug:v1` — record pass/fail + key rates + report path
- [ ] `npm run eval:frozen:media:v1` — record pass/fail + gates + report path

## 2. Candidate lane (required)

- [ ] `npm run eval:transition-candidate:v0.2` (or `v0.1` for a quick slice) — attach `transition_cycle_metrics`

## 3. Ablations (required)

- [ ] `npm run eval:ablation-matrix:v0.1` — attach `primitive_contribution_table` + note n/a rows

## 4. Negatives & regressions appendix (required)

- [ ] Copy `cycle-appendix-negatives-template-v0.1.md` → fill for this cycle (link in cycle note)

## 5. One-page cycle note (required)

- [ ] Copy `cycle-note-template-v0.1.md` → complete §1–§7; link appendix + artifacts

## 6. Hard stops (review every cycle)

- [ ] Frozen lane did **not** regress two cycles in a row without a written hypothesis
- [ ] Ablations are **not** all-zero on debugging lane for two consecutive cycles
- [ ] Improvements are **not** only on mutable candidate suites vs frozen

If a stop triggers → document in appendix §4/§5 and pause scope expansion until resolved.

## 7. Optional: promotion review gate

- [ ] If candidate changes warrant v2 discussion, run `promotion-decision-rubric-v0.1.md` and record outcome in appendix §6
