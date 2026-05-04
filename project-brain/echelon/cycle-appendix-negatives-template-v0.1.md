# Cycle appendix — negatives & regressions (template v0.1)

**Cycle:** `<YYYY-MM-DD>` — **Owner:** `<name>` — **Repos / SHAs:** `<agent-brain commit>`, others as needed

Paste this after each full cadence (frozen → candidate → ablations → 1-pager). Keep it internal; link from the cycle note.

---

## 1. Baseline wins (frozen held or improved)

| Lane | Command / artifact | Headline | vs prior cycle | Notes |
| --- | --- | --- | --- | --- |
| frozen-debug-v1 | `npm run eval:frozen:debug:v1` | pass / fail | Δ | |
| frozen-media-v1 | `npm run eval:frozen:media:v1` | pass / fail | Δ | |

---

## 2. Bad transitions (candidate / harness)

| Case id | Suite | Symptom | Expected signal | What happened | Tag |
| --- | --- | --- | --- | --- | --- |
| | `transition-candidate-v0.2` | | | | early-switch / late-switch / … |

---

## 3. Bad calibration (frozen or harness)

| Lane / case | Metric | Threshold | Actual | Notes |
| --- | --- | --- | --- | --- |
| | | | | |

---

## 4. Regressions (two-cycle rule)

| Lane | This cycle | Prior cycle | Δ | Hypothesis | Stop? |
| --- | --- | --- | --- | --- | --- |
| frozen-debug-v1 | | | | | y/n |

If frozen regresses **two cycles in a row** without a documented hypothesis → **stop** broadening per protocol; file incident + revert or freeze investigation.

---

## 5. Ablation sanity (causality)

| Primitive | Debugging lane delta (summary) | Replay harness delta | Media harness delta | Bundle-only risk? |
| --- | --- | --- | --- | --- |
| failed_path_memory | | | | |
| … | | | | |

If all primitives show **no** attributable effect on debugging lane for two cycles → hard stop (revisit harness + router decomposition).

---

## 6. Promotion / demotion decisions

| Item | Decision | Next action |
| --- | --- | --- |
| frozen-debug-v2 | none / planned | link ticket |
| Candidate case edits | none / list ids | |

Reference: `promotion-decision-rubric-v0.1.md`.
