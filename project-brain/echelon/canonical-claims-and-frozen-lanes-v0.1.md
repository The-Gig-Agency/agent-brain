# Canonical claims & frozen headline lanes (v0.1)

**Purpose:** One table for **claim → command → artifact → pass rule**. Anything not listed here as a **headline lane** is **R&D / mutable** unless promoted (`frozen-*-v2`, new manifest row).

**Related:** `frozen-lanes-manifest-v1.json`, `frozen-debug-v1-lock.md`, `frozen-media-v1-lock.md`, `oss-proprietary-boundary-matrix.md` (CP-016, CP-029), BD-002.

---

## Policy

1. **External headline claims** (investors, customers, public benchmarks: “we demonstrate…”, “certified…”) may cite **only** rows tagged **Headline** below, together with **implementation SHA** (see pin).
2. **Do not** cite tutorial packs, community examples, or mutable `real-replays-v*` / candidate lanes for headline proof — those are smoke, mining, or research.
3. Two headline domains are intentionally separate: **debugging real-replay** vs **media decisioning**. Do not merge into one sentence without naming **both** lanes and **both** passes.

---

## Implementation pin (required for comparable runs)

Resolve the commit that ratifies frozen metadata (same tree as fixtures + locks documented in manifest):

```bash
git log -1 --format=%H -- project-brain/echelon/frozen-lanes-manifest-v1.json
```

Paste that SHA next to any published headline result. Prefer **`frozen-lanes-v1` git tag** on that commit once published.

---

## Canonical claims table

| ID | Claim (one sentence) | `npm run` | Primary report artifact | Pass rule (exact) | Caveats |
|----|----------------------|-----------|-------------------------|-------------------|---------|
| **H1** **Headline** | On the ratified **real-replay debugging** lane, routed policy passes the frozen replay harness vs baselines under lock rules. | `eval:frozen:debug:v1` | `reports/real-replays-v0.8/<timestamp>.json` | `overall_pass === true` **and** `summary.routed_hidden_regime_match_rate >= summary.score_threshold_hidden_regime_match_rate` **and** `summary.routed_beats_fixed_case_count >= 1` | 10 cases; merged-incident realism; visible layer is **truth-adjacent** — not full prod telemetry. Full rules: `frozen-debug-v1-lock.md`. |
| **H2** **Headline** | On the ratified **media** lane, operator-facing decisions meet frozen calibration gates. | `eval:frozen:media:v1` | `reports/media-decision-v0.1/<timestamp>.json` | `overall_pass === true` **iff** (same as code today): `summary.acceptable_action_match_rate >= 0.83` **and** `summary.confidence_band_match_rate >= 0.66` **and** `summary.rationale_quality_pass_rate >= 1` | Domain-specific; 6 cases; `exact_action_match_rate` not a gate in v1. Full rules: `frozen-media-v1-lock.md`. |
| **S1** Smoke | OSSDefault replay loaders and harness run end-to-end on **tutorial** fixtures (open-core CI). | `eval:replays:tutorial` | `reports/tutorial-replay-v0.1/<timestamp>.json` | `overall_pass === true` | **Not** a headline lane — fictional/synthetic; proves wiring only. |
| **S0** Smoke | TypeScript project typechecks. | `check` | _(none — stdout only)_ | Process exit code `0` | Validates types only — **no** behavioral proof. |

**Trim rule:** If you add a row, merge or demote another until this table still fits **one screen** in a normal editor.

---

## Frozen certification lanes (promoted)

These are the **only** ratified frozen packs in v1:

| Tag | Suite | Fixtures | Lock doc |
|-----|-------|----------|----------|
| `frozen-debug-v1` | `real-replays-v0.8` | `real-replays-v0.8.visible.json` + `.evaluator.json` | `frozen-debug-v1-lock.md` |
| `frozen-media-v1` | `media-decision-v0.1` | `media-decision-v0.1.json` | `frozen-media-v1-lock.md` |

Changing fixture bytes or pass semantics → **`frozen-debug-v2` / `frozen-media-v2`** + new manifest row (see manifest `immutability_policy`).

---

## Changelog

- **v0.1** — Initial single-screen table; headline authority limited to H1 + H2; aligns with existing manifest + locks.
