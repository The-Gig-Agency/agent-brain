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
3. Cross-link miner protocol: `real-replays-v3-mining.md`, **machine-readable list** `fixtures/echelon/real-replays-v3-mining-candidates.json`, `test-design-anti-bias.md`.

---

## D. Option 1 — private history (no public GitHub scour)

Use **local clones** + issue/PR/commit text already tied to your mining JSON — not a crawl of public GitHub.

### D.1 Corpus you already mined

All rows below are in **`fixtures/echelon/real-replays-v3-mining-candidates.json`** (`commit_sha`, `repo_local_path`). A human still **ratifies** regime labels when writing `visible`/`evaluator` replay fixtures.

**Hypothesis — compound trials first** (stacked / delayed / same-family depth):

| ID | Repo family | Why compound-leaning |
|----|-------------|----------------------|
| `cg-1036` | creatorgift-backend | Partial-fix / rollover / non-stationary state; likely **multi-touch** closure. |
| `cg-992` | creatorgift-backend | Ingestion skips downstream setup — **delayed dependency chain**. |
| `ciq-bf61b23` | ciq-automations | Auto-fix + re-fetch — **first correction ≠ final truth**; deepen same flow. |
| `acp-faf5153` | agentic-control-plane-kit | Path/URL normalization — downstream symptom, **composed fix**. |

**Hypothesis — partial containment first** / fail-closed (often **`prune`** + extended metrics later):

| ID | Repo family | Why containment-leaning |
|----|-------------|---------------------------|
| `acp-9b20f69` | agentic-control-plane-kit | **Fails closed on ambiguous 200** — correctness = bound unsafe success. |
| `acp-2f10f7c` | agentic-control-plane-kit | Fail-closed audit mapping + env validation — **stop bad public state**. |
| `acp-f79bf6c` | agentic-control-plane-kit | Hosted login → **explicit blocked result** vs misleading progress. |

**Contrast / second wave** for explore–prune stress (weaker default for **`compound`**): `ciq-6adf83e`, `ciq-7eefd8d`, `acp-e7eebcc`, `cg-981`, `cg-995`, `cg-1013`, `ciq-a072b65` — see `terrain_tags` in JSON.

### D.2 Local git commands (per candidate)

Run in the clone path from JSON (yours may differ from the template `repo_local_path`):

```bash
cd <repo_local_path_from_json>
git show --stat <commit_sha>
git show <commit_sha> --no-patch --format=%B
git log --oneline <commit_sha>~6..<commit_sha>
```

Look for: follow-up commits, same-issue reopen, “still broken after”, part 2 deploy, revert-then-fix, ordered migrations.

Optional (private remote, after `gh auth`):

```bash
gh pr list --search "keyword" --limit 20
```

### D.3 First pack slice (wired)

**Implemented:** `fixtures/echelon/real-replays-v0.9-compound-partial.{visible,evaluator}.json` + `npm run eval:replays:v0.9-compound-partial`.

1. **Three compound-leaning:** `v09-cg-1036`, `v09-cg-992`, `v09-ciq-bf61b23` (`hidden_expected_regime_override: compound`).
2. **Two containment-leaning:** `v09-acp-9b20f69`, `v09-acp-2f10f7c` (`prune` + `containment_preferred_inference` visible hint).
3. Mutable only; **frozen-debug-v1 untouched**.

## Related

- `findings-real-replays-v0.8.md` (gaps + best next move)
- `docs/cognitive-router/spec/regime-library.md` (Exploitation And Compounding)
- `canonical-claims-and-frozen-lanes-v0.1.md` (headline claims remain **H1** frozen lane until new freeze)
