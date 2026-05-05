# Decision artifact — Media boundary pack v0.1 (TGA-245)

## Metadata

- **Id:** `TGA-245` · shipped in `agent-brain` commit `e1701f2`
- **Owner:** Cursor
- **Date:** 2026-05-05
- **Scope:** `media`

---

## 1. What changed

- Code: `src/cognitive-router/media-decision.ts`
- Fixtures / packs: `fixtures/echelon/media-decision-boundary-v0.1.json`
- Runner / command: `src/cognitive-router/run-media-eval-boundary-v0.1.ts` · `npm run eval:media:boundary:v0.1`
- Registry / navigation: `project-brain/echelon/proprietary-moat-registry-v0.1.json`, `project-brain/echelon/links.md`, root `README.md`
- Commands run:
  - `npm run check`
  - `npm run eval:media:v0.1`
  - `npm run eval:media:v0.2`
  - `npm run eval:media:boundary:v0.1`

---

## 2. What it proves

- Hypothesis addressed: We can encode the **media boundary pressure** called out in `findings-media-decision-v0.1.md` (hold, multi-channel realloc, explore-vs-scale, prune-vs-reallocate, OOS-style profiles) into a measurable suite without breaking frozen-media-v1.
- Evidence:
  - `eval:media:v0.1` remains **green** (frozen-media-v1 fixture).
  - `eval:media:v0.2` remains **green** (structured v2 readouts).
  - `eval:media:boundary:v0.1` is **green** with 10 cases covering the boundaries above.
- Confidence: **medium** — this strengthens action-selection + calibration *coverage*, but does not establish account-scale automation safety.

---

## 3. What still fails

- This work does **not** prove:
  - out-of-sample calibration robustness across real account distributions
  - budget-impact correctness or stable autonomy at scale
  - that boundary cases are comprehensive (still small; needs more cases + diversity)
- The “OOS-style” rows are still **synthetic profiles**, not mined real packs.

---

## 4. What to do next

- Next action 1: Grow boundary pack to **25–40 cases** with explicit sub-slices (hold, mixed realloc, explore/scale, prune/realloc) and track per-slice match rates.
- Next action 2: Add **true out-of-sample packs** (separate fixture files) and compare band match rates across packs before any automation claim.
- Explicit non-goals: No change to **frozen-media-v1**; no attempt to automate spend changes.

---

## Attachments

- Report JSON path(s): `reports/media-decision-v0.1/*`, `reports/media-decision-v0.2/*`, `reports/media-decision-boundary-v0.1/*`
- Links: `project-brain/echelon/decision-artifact-template-v0.1.md`

