# Replay case candidates — compound ops & partial containment (v0.1)

**Purpose:** Concrete **mining targets** for gaps called out in `findings-real-replays-v0.8.md` — **compound-deserving real ops** and **partial resolution / containment** — without pretending these packs exist until fixtures + evaluator rows are added.

**Facts:** No current real-replay fixture sets `hidden_expected_regime_override` to **`compound`** (grep `fixtures/echelon/*.evaluator.json`). `SearchRegime` includes `compound`; replay harness supports it.

---

## A. Compound-deserving operational incidents (mine toward `compound`)

**Definition for labeling:** After initial localization, the **right debugging posture** is **deepen execution on the chosen branch** (sequence of dependent patches, rollout staging, idempotency follow-ups, migration ordering), **not** broad exploration and **not** narrow single-file prune-only closure.

| Candidate ID (slug) | Operational shape | Why **compound** (not explore/prune) | Visible-layer cues to preserve |
|----------------------|---------------------|----------------------------------------|--------------------------------|
| **cmp-rollout-stage2** | Fix lands; prod still wrong until **second coordinated change** (flag + code path, or migration step B after A). | Conviction on family is high; work is **stacked commits** in same subsystem. | “First deploy improved X but Y still failing”; logs show partial progress. |
| **cmp-webhook-chain** | Signature OK but **idempotency / retry semantics** still broken — fixes are **same integration surface**, multiple tight edits. | Same hypothesis; **execution depth** through friction. | Partner retries, duplicate delivery, dedupe keys. |
| **cmp-migration-order** | DB fix requires **ordered migrations** or policy + data backfill in **sequence**. | Mis-framed as single migration when really **compound execution**. | “Still failing after first migration”; ordering/docs in PR. |
| **cmp-slo-after-correctness** | Correctness patch merged; **SLO/hardening** still requires follow-on in same module. | Not new discovery — **deepening** after signal. | Latency/error budget mention post-merge. |
| **cmp-edge-env-parity** | Local passes; prod fails until **config + function + secret** aligned — **same incident**, multi-step closure. | Explore already narrowed; remainder is **consistent execution across layers**. | Env-specific failures, missing binding. |

**Evaluator sketch:** `hidden_expected_regime_override`: **`compound`**. `patch_family_judgment` should stress **dependent steps / same family**, not greenfield search.

**Mining query (informal):** merges touching **≤3 directories** with **≥2 commits** or **follow-up PR** linked to same issue; incident text mentions “still broken after first fix”, “part 2”, “follow-up deploy”.

---

## B. Partial resolution / containment (mine toward evaluation nuance)

**Definition:** **Acceptable operator outcome** is **stop harm / bound blast radius** without full root-cause identification in the same window. Often socially correct posture is **prune** (narrow intervention) or limited **coordinate**, **not** infinite explore.

| Candidate ID (slug) | Operational shape | Resolution type | Hidden regime (typical) | What to score beyond regime match |
|---------------------|---------------------|------------------|---------------------------|-----------------------------------|
| **prt-feature-off** | **Kill switch** / feature flag off stops user-visible failure. | Containment | Often **`prune`** | Whether routing avoids **spurious explore** when containment is appropriate; **cost** of unnecessary branches before containment. |
| **prt-queue-throttle** | **Rate limit / queue** stabilizes surface while root unknown. | Containment | **`prune`** | Same; optional tag **partial_resolution** in evaluator notes. |
| **prt-rollback** | **Revert** to last good release; root cause deferred. | Partial closure | **`prune`** | Treat “found rollback target quickly” as success path; **drift recovery** narrative. |
| **prt-scope-narrow** | **Disable single broken path** in admin/API while backend fix scheduled. | Scoped containment | **`prune`** | Discriminate from **explore** when symptoms scream broad search but fix is **local disable**. |
| **prt-env-isolate** | **Isolate** bad tenant / shard / region from fleet. | Operational containment | **`prune`** or **`coordinate`** | Multi-party; may need `coordinate` if regime set extended in evaluator. |

**Metrics (existing hooks, not new theory):**

- **Debugging / transition lanes:** `partial_resolution_handling` and related aggregates in `transition-candidate-metrics.ts` (see `findings-transition-candidate-v0.1.md`).
- **Replay reports:** today emphasize **hidden regime match**; for partial-resolution packs add **evaluator notes** + future report fields for **regret / recovery cost** when you extend `ReplayCaseReport` (per v0.8 “best next move”).

**Important:** The current replay evaluator does **not** yet encode “containment success” as a first-class pass bit — these cases still clarify **what to mine** and **how human raters should label** before you extend schemas.

---

## C. Suggested pack hygiene

1. Build **mutable** pack first (e.g. `real-replays-v0.9-compound-candidates`) — **do not** touch **frozen-debug-v1** until ratified as v2.
2. Per case: one primary **`hidden_expected_regime_override`**; for compound rows, add reviewer checklist: “Would **explore** be mis-calibrated optimism?” “Would **prune-only** miss stacked work?”
3. Cross-link miner protocol: `real-replays-v3-mining.md`, `test-design-anti-bias.md`.

## Related

- `findings-real-replays-v0.8.md` (gaps + best next move)
- `docs/cognitive-router/spec/regime-library.md` (Exploitation And Compounding)
- `canonical-claims-and-frozen-lanes-v0.1.md` (headline claims remain **H1** frozen lane until new freeze)
