# Cycle note — one page (template v0.1)

**Cycle date:** `<YYYY-MM-DD>` — **Owner:** `<name>`

## 1. What we ran (commands)

- Frozen: `npm run eval:frozen:debug:v1` · `npm run eval:frozen:media:v1`
- Candidate: `npm run eval:transition-candidate:v0.2` (or v0.1 if narrow slice)
- Ablations: `npm run eval:ablation-matrix:v0.1`
- (Optional) Media / replay deep dives: `<fill>`

Attach or link JSON under `reports/…` paths for this cycle.

## 2. Headline deltas (frozen)

- **frozen-debug-v1:** match rate / overall_pass vs last cycle — `<1 sentence>`
- **frozen-media-v1:** acceptable / calibration gates vs last cycle — `<1 sentence>`

## 3. Innovation deltas (candidate)

- Success / cost / transition metrics summary — `<2–3 bullets>`
- New failures or interesting passes — `<bullets>`

## 4. Causality (ablations)

- Which primitives moved which metrics — `<bullets>`
- “Bundle-only” risk signal — yes/no + why

## 5. Failures & hypotheses

- Top 1–3 failures — `<bullets>`
- Next hypotheses (testable next cycle) — `<bullets>`

## 6. Hard-stop check

- [ ] Frozen regressed two cycles in a row without explanation
- [ ] Ablations show no primitive-specific effects
- [ ] Gains only on mutable suites

If any **yes** → stop line noted here + link to appendix §4/§5.

## 7. Links

- Negatives appendix: fill from `cycle-appendix-negatives-template-v0.1.md`
- Tickets / PRs: `<links>`
