# Router core service upgrades — media & debugging (v0.1)

**Status:** Roadmap / requirements (not yet implemented)  
**YouTrack:** Umbrella [TGA-242](https://youtrack.thegig.agency/issue/TGA-242) · Media lane [TGA-243](https://youtrack.thegig.agency/issue/TGA-243) · Debugging lane [TGA-244](https://youtrack.thegig.agency/issue/TGA-244) · Decision artifact hygiene [TGA-245](https://youtrack.thegig.agency/issue/TGA-245)  
**Audience:** Product + eng extending `src/cognitive-router` and `docs/cognitive-router/spec/`  
**Related:** `docs/cognitive-router/spec/media-decision-contract.md`, `eval-v2.md`, `replay-evaluator.ts`, `media-evaluator.ts`, `debugging-world.ts`, `cycle-note-template-v0.1.md`, `decision-artifact-template-v0.1.md`

This doc captures **high-leverage upgrades** for the two main service lanes (media buying, debugging). Implementation should stay behind the **OSS vs proprietary** boundary (`oss-proprietary-boundary-matrix.md`): **harness and taxonomy** can be OSS; **strong packs, calibration, and frozen readouts** stay proprietary where marked.

---

## A. Media buying lane

**Today:** account/adset-level-ish inputs, aggregate trends, single `MediaDecisionRecommendation` (`types.ts` + `media-decision-contract.md`).

### A1. Ad-level winner / loser calls

- Emit **explicit winner/loser** (or tiered rank) per **ad** (or smallest bought entity) using **CTR, CPC, CPA, and spend** — not only account-level aggregates.
- Support **relative vs target** and **peer percentile** language in rationale (deterministic rules, not LLM).

### A2. Creative decomposition: hook vs body vs CTA

- Extend input schema (and fixtures) so performance can attach to **hook / body / CTA** (or platform-mapped equivalents), so recommendations name **which element** is winning or dragging, not only “the creative.”

### A3. Splits when available

- Optional dimensions: **audience**, **placement**, **device** (and geo if present).  
- Router should **gracefully degrade** when splits are missing (confidence down, `missing_information` populated) per existing contract spirit.

### A4. Test plan, not only readout

- Output (or companion artifact) must include a **`test_next` plan**: hypotheses, **next variants** to try, **success metrics**, and **stop rules** — not only “diagnose” or static rationale strings.

### A5. Statistical rigor flags

- Flag **statistically weak** cells (low impressions, low conversions, high variance) so operators **do not overreact** to tiny samples.  
- Surface as structured fields (e.g. `reliability_tier`, `minimum_sample_met: boolean`) consumed by `media-evaluator` and reports.

**Contract touchpoint:** evolve `media-decision-contract.md` to v2 with backward-compatible optional blocks; bump `MediaDecisionInput` / `MediaDecisionRecommendation` when implementing.

---

## B. Debugging lane

**Today:** replay harness, synthetic debugging world, case-level replay reports; limited explicit **failure taxonomy** and **expected vs actual** in machine form for all paths.

### B1. Failure taxonomy

- Add a first-class **`failure_kind`** (or similar) on debugging/replay case inputs and reports, e.g.:  
  `routing_bug` | `schema_bug` | `data_issue` | `timeout` | `flake` | `logic_bug` | `integration` | `unknown` | …  
- Taxonomy drives **routing**, **evaluator gates**, and **dashboards**; keep enum **versioned** (OSS) vs **premium case labels** (proprietary packs).

### B2. Repro steps + failing case IDs

- Every failing or ambiguous case in a report should carry **repro steps** (short, structured) and **stable case IDs** (align with replay `id` and community pack conventions where applicable).

### B3. Baseline comparison narrative (structured)

- For each case (or suite): **vs fixed heuristic** and **vs score-threshold** (already partially in `ReplayCaseReport`) — extend with **explicit “better on / worse on”** dimensions (e.g. regime match, cost proxy, transition count when that harness exists).

### B4. Confidence + ambiguity with partial data

- When fields are missing or contradictory, output **confidence bands** and **ambiguity flags** (not only scalar confidence) — aligned with `field_confidence` patterns on terrain and media `signal_quality`.

### B5. Expected vs actual (per failing case)

- For failures: **`expected`** (from evaluator or hidden fixture) vs **`actual`** (routed choice, action, or outcome proxy) in **machine-readable** form for CI and for human triage.

**Harness touchpoint:** `replay-evaluator.ts` report types, `ReplayCaseReport`, and debugging runners — evolve with schema version in report JSON.

---

## C. Cross-lane pattern: decision artifact (highest leverage)

Every substantive ticket or cycle should end as a **decision artifact** (see `decision-artifact-template-v0.1.md`):

1. **What changed** — code, fixtures, thresholds, or contract version.  
2. **What it proves** — which hypothesis was validated or falsified; frozen vs mutable scope.  
3. **What still fails** — case IDs, metrics, and taxonomy labels.  
4. **What to do next** — one or two **testable** actions tied to the next eval command or pack version.

This aligns with `cycle-note-template-v0.1.md` but is **ticket-sized** so media and debugging work stay legible between full cycles.

---

## D. Suggested implementation order

1. **Taxonomy + expected/actual** (debugging) — unlocks clearer reports and CI without new media data.  
2. **Statistical weakness flags** (media) — reduces operator harm quickly.  
3. **Ad-level + creative splits** (media) — schema + evaluator + fixtures.  
4. **Test plan block** (media) — extends recommendation shape.  
5. **Baseline comparison dimensions** (debugging) — extend `ReplayCaseReport` summary.

## Changelog

- **v0.1.2** — First implementation pass in `agent-brain`: media v2 (`media-decision-v2.ts`, `media-decision-v0.2.json`, `eval:media:v0.2`); replay v2 fields on `ReplayCaseReport` + tutorial fixture sample ([TGA-243](https://youtrack.thegig.agency/issue/TGA-243), [TGA-244](https://youtrack.thegig.agency/issue/TGA-244)).
- **v0.1.1** — Linked YouTrack umbrella [TGA-242](https://youtrack.thegig.agency/issue/TGA-242) and child tickets [TGA-243](https://youtrack.thegig.agency/issue/TGA-243)–[TGA-245](https://youtrack.thegig.agency/issue/TGA-245).
- **v0.1** — Initial roadmap from product review.
