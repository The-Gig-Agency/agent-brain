# OSS vs proprietary boundary matrix

**Document revision:** v0.4 (2026-05-04)  
**Status:** Product approved (v0.2); v0.4 adds **CP-*** canonical registry (each component **exactly one** target tier); v0.3 **decision log** retained  
**Ticket:** [TGA-234](https://youtrack.thegig.agency/issue/TGA-234) (child of [TGA-233](https://youtrack.thegig.agency/issue/TGA-233))  
**Related:** [TGA-233](https://youtrack.thegig.agency/issue/TGA-233) epic framing `commercial-open-core-epic-framing-v0.1.md`, `frozen-lanes-manifest-v1.json`, `eval-v2.md`, `adaptive-commitment-control-protocol-v0.1.md`, `adr-002-phase1-oss-publish-scope.md` ([TGA-235](https://youtrack.thegig.agency/issue/TGA-235)), `proprietary-moat-registry-v0.1.json` ([TGA-236](https://youtrack.thegig.agency/issue/TGA-236)), `commercial-packaging-model1-v0.1.md` ([TGA-237](https://youtrack.thegig.agency/issue/TGA-237)), `commercial-tracks-model2-model3-v0.1.md` ([TGA-238](https://youtrack.thegig.agency/issue/TGA-238)), `community-replay-pack-spec-v0.1.md` ([TGA-239](https://youtrack.thegig.agency/issue/TGA-239)), `legal-repo-hygiene-checklist-v0.1.md` ([TGA-240](https://youtrack.thegig.agency/issue/TGA-240)), `echelon-product-shell-alignment-v0.1.md` ([TGA-241](https://youtrack.thegig.agency/issue/TGA-241))

## Purpose

Single source of truth for what ships **open**, **source-available** (visible spec, no premium data), or **proprietary**, so packaging (npm free tier + paid packs), CI, and legal can align without accidental leakage of evaluator truth or paid datasets into public artifacts.

This document is **not** legal advice; legal review tracks [TGA-240](https://youtrack.thegig.agency/issue/TGA-240).

## Moat summary (what is *not* the product)

The moat is **not** the thin local runtime.

The moat is the **evaluation and control layer**:

- Replay realism (especially ambiguity-quality and operational realism)
- Frozen benchmarks (certification artifacts, not mutable “leaderboard bait”)
- Transition evaluation (temporal control, not one-shot labels)
- Calibration thresholds and gates (what “pass” means under discipline)
- Packs and suites that **discriminate** adaptive policies (not toy `if uncertainty > threshold` demos)
- **Router-visible vs evaluator-only** separation (anti-leakage, enterprise trust)

Most OSS agent stacks accidentally open-source the only defensible layer. This split intentionally keeps **harness and contracts** open while protecting **datasets, frozen lanes, calibration, and premium realism**.

## Public positioning vs internal vocabulary

**Internal** (specs, code, research notes): terms like *regime*, *terrain*, *cognitive router* remain precise and fine.

**External / commercial** messaging should prefer language that matches what the system actually does, e.g.:

- **Adaptive investigation control** — how search and verification are steered under uncertainty  
- **Adaptive commitment control** — when to deepen, widen, hold, or transition (aligned with `adaptive-commitment-control-*` docs)

Avoid over-branding *regime* / *terrain* in headlines, pricing pages, and partner one-pagers unless the audience is already bought into the ontology.

## Primitive portability

A **primitive** (policy fragment, signal, scoring dimension, or transition rule) is **portable** when it satisfies all of:

1. **Ablation survival** — removing or degrading unrelated parts does not erase its measured effect; it is not a brittle interaction artifact.  
2. **Cross-domain transfer without ontology expansion** — it still applies when the surface domain changes, without inventing new labels or buckets to “fit” each domain.  
3. **Replay robustness** — under deliberate replay degradation (noisy context, trimmed history, adversarial distractors), it **preserves discriminative power** relative to baselines.  
4. **Calibration stability across terrain classes** — threshold and gate behavior stays coherent across classes of cases, not hand-tuned per micro-genre.

Portability is the deeper scientific object: it is what separates reusable **control knowledge** from one-off eval hacks.

## Evidence and marketing guardrails

**No headline claims based solely on mutable packs.**

Marketing, fundraising, and public benchmarks must anchor on **versioned, frozen** certification lanes (or other explicitly immutable baselines), not on suites that change week to week. Mutable packs are essential for R&D and community contribution — but **benchmark drift** is how systems (and teams) become self-delusional. Frozen lanes exist partly to prevent that.

## Strategic positioning note (“eval company gravity”)

A plausible end state is that the highest enterprise value concentrates in:

- Benchmark realism  
- Transition evaluation  
- Calibration infrastructure  
- Replay packs and ambiguity-quality datasets  

…more than in the runtime shell. That is **not necessarily bad**: it matches **eval infrastructure as product** and aligns with local-first OSS + paid packs. It does imply deliberate investment in **registry, certification, and governance** alongside code.

## Tier definitions

| Tier | Meaning |
|------|--------|
| **OSS** | Apache-2.0/MIT-style public repo + public npm; third parties may fork and redistribute. |
| **Source-available** | Public read access to **interfaces, schemas, and harness**; **no** redistribution of frozen or paid pack bytes; may include reference **synthetic** fixtures only. |
| **Proprietary** | Closed repo or private registry; license key / contract; no public redistribution of artifacts or weights. |

**Community packs:** OSS **format + validator + loader**; individual pack content may be OSS (author’s choice) or submitted under project CLA; **curated registry** for “official community” listings can remain governance-heavy without making pack bytes proprietary by default.

## Canonical disposition registry (CP-*) — source of truth

**Rules**

1. **Exactly one row per product component** below. If a concern splits (e.g. code vs bytes), it becomes **two CP rows**, not one cell with dual tiers.
2. **`Target tier`** is the **intended shipping posture** for that component (not “sometimes OSS sometimes not” in one cell).
3. **Conflicts:** If narrative elsewhere disagrees, **this table wins** until the doc is version-bumped and reconciled.
4. **BD-*** rows remain the binding **decision log** for process triggers; they may **reference** CP-IDs.

| CP-ID | Component | Target tier | Primary anchor(s) | Rationale (short) |
|-------|-----------|-------------|-------------------|-------------------|
| **CP-001** | Terrain / regime wire types & core TS shapes | **OSS** | `src/cognitive-router/types.ts`, `docs/cognitive-router/spec/terrain-schema.md` | Stable interop for hosts and plugins. |
| **CP-002** | Regime semantics (public doc) | **OSS** | `docs/cognitive-router/spec/regime-library.md` | Ecosystem vocabulary; moat is data/thresholds, not names. |
| **CP-003** | Regime transition contract (spec) | **OSS** | `docs/cognitive-router/spec/regime-transitions.md` | Host-visible behavior contract. |
| **CP-004** | Prompt / extraction contract (spec) | **OSS** | `docs/cognitive-router/spec/prompt-contract.md` | Alternative extractors; product may ship other prompts privately. |
| **CP-005** | Thin local runtime (router glue) | **OSS** | `src/cognitive-router/router-runner.ts` | Small auditable execution harness; no secret paths in OSS build. |
| **CP-006** | Public package / plugin entry surface | **OSS** | `src/cognitive-router/index.ts`, npm package layout ([TGA-235](https://youtrack.thegig.agency/issue/TGA-235)) | Primary distribution wedge per [TGA-233](https://youtrack.thegig.agency/issue/TGA-233). |
| **CP-007** | Trace / provenance helpers | **OSS** | `src/cognitive-router/trace.ts` | Debuggability and research participation. |
| **CP-008** | Baseline policies | **OSS** | `src/cognitive-router/baselines.ts` | Fair comparisons; not moat. |
| **CP-009** | Scoring **implementation** (algorithms, structure) | **OSS** | `src/cognitive-router/scoring.ts` | Reference path until **BD-003** split; today ships in open slice per ADR-002. |
| **CP-010** | Production-tuned **weights, calibration tables, learned mappings** tied to paid benchmarks | **Proprietary** | Paid pack or private module | Confidential tuning; see BD-003 trigger. |
| **CP-011** | Benchmark registry (metadata for **public** suites) | **OSS** | `src/cognitive-router/benchmarks.ts` | IDs + schema for public lanes; paid suite **bytes** are separate CP rows. |
| **CP-012** | Benchmark runner | **OSS** | `src/cognitive-router/benchmark-runner.ts` | Generic harness over registered cases. |
| **CP-013** | Abstract evaluator contract | **OSS** | `src/cognitive-router/evaluator.ts` | Interface only. |
| **CP-014** | Replay dataset loader + blinded split helpers | **OSS** | `src/cognitive-router/replay-dataset.ts` | Enforces router vs evaluator separation per `eval-v2.md`. |
| **CP-015** | Replay evaluator **source** | **OSS** | `src/cognitive-router/replay-evaluator.ts` | Metrics code + public schema; certification gates are CP-016. |
| **CP-016** | Certification / frozen **pass thresholds** (commercial “pass” definition) | **Proprietary** | Private manifest, paid pack, lock docs | Enterprise certification posture; not OSS defaults. |
| **CP-017** | Media decision **contract + OSS runtime logic** | **OSS** | `media-decision-contract.md`, `src/cognitive-router/media-decision.ts`, `src/cognitive-router/media-decision-v2.ts` | Operator-facing contract; no licensed case bytes in OSS. |
| **CP-018** | Media evaluator **engine** | **OSS** | `src/cognitive-router/media-evaluator.ts` | Code path; licensed fixtures/thresholds = CP-019 / CP-016 pattern. |
| **CP-019** | Media-buying **fixtures & calibrated acceptance bands** | **Proprietary** | `fixtures/echelon/media-decision-*.json`, paid successors | Domain pack IP. |
| **CP-020** | Debugging synthetic worlds | **OSS** | `src/cognitive-router/debugging-world.ts` | Teaching / CI substrate. |
| **CP-021** | Ablation / matrix **runner code** | **OSS** | `ablation-matrix-v0.1.ts`, `run-ablation-matrix-v0.1.ts` | Research tooling. |
| **CP-022** | Ablation **matrix definitions** (premium study grids) | **Proprietary** | Private JSON / grids | Discriminative study definitions. |
| **CP-023** | Transition candidate metric **definitions** | **OSS** | `src/cognitive-router/transition-candidate-metrics.ts` | Formulas in code. |
| **CP-024** | Transition-eval **suites, holdouts, candidate fixtures** | **Proprietary** | `run-transition-candidate-v0.*`, paired fixtures | Temporal moat-adjacent benchmarking. |
| **CP-025** | Tutorial + community-**example** replay fixtures | **OSS** | `fixtures/echelon/tutorial-replay-v0.1.*`, `community-example-v0.1.*` | OSS-safe defaults and schema validation smoke. |
| **CP-026** | Community pack **format, validator, self-test** | **OSS** | `community-pack-validation.ts`, `community-replay-pack-spec-v0.1.md` | Contribution path without shipping paid bytes. |
| **CP-027** | **Submitted** community replay pack **content** (non-Echelon author bytes) | **Source-available** | Per-pack license / CLA at submission | Not Echelon proprietary by default; governance in registry. |
| **CP-028** | Real replay pack bytes (v0.6–v1, tight/diverse/candidates, etc.) | **Proprietary** | `fixtures/echelon/real-replays-*.json` | Ambiguity-quality / realism IP. |
| **CP-029** | Frozen certification pack bytes + manifest | **Proprietary** | `frozen-lanes-manifest-v1.json`, `frozen-*`, lock markdown | Immutable certification artifacts. |
| **CP-030** | Calibration metrics & tables (product baselines) | **Proprietary** | Embedded in private reports + lock docs | Enterprise calibration sale. |
| **CP-031** | Learned routing policies (future ML) | **Proprietary** | Future layers on `scoring` | Training data + weights. |
| **CP-032** | Benchmark telemetry / cohort analytics (future) | **Proprietary** | Future dashboards | Tenant / team analytics. |
| **CP-033** | Tuning / sweeps infrastructure | **Proprietary** | Private scripts, grids, experiment DB | Operational eval cost. |
| **CP-034** | Echelon strategy / methodology markdown (`project-brain/echelon`) | **Source-available** | `*.md` in this folder | Per-doc external quote policy; many internal-first. |

## Pack taxonomy (product language)

| Pack kind | Contents | Tier |
|-----------|----------|------|
| **Synthetic / tutorial** | Small crafted cases, obvious terrain boundaries | **OSS** (ship with runtime) |
| **Community replay** | User-submitted, reviewed; schema-validated | **OSS** (per-pack license at submission) + **governance** |
| **Advanced replay** | Realistic ambiguity, mixed explore/prune, holdouts | **Paid** |
| **Frozen certification** | Versioned fixtures + lock thresholds + manifest SHA | **Paid** (or enterprise contract) |
| **Transition-eval** | Temporal regime stress, oscillation suppression tests | **Paid** |
| **Enterprise calibration** | Customer-specific threshold bands (derived from licensed runner) | **Paid** / contract |

## Distribution rules (npm vs private)

1. **Public `@echelon/*` (names TBD):** types, interfaces, baseline policies, loaders, runners, **OSS fixtures only**, placeholder scoring. CI proves no accidental `fixtures/echelon/real-replays-*` or `frozen-*` paths in published tarball (allowlist denylist test).
2. **Private registry / signed tarball:** frozen manifests, real-replays, media-buying packs, calibration tables, learned policy blobs. Runtime resolves pack URI only when **entitlement** present ([TGA-237](https://youtrack.thegig.agency/issue/TGA-237)).
3. **Never** publish evaluator-only JSON alongside router-visible npm package in a single artifact without explicit blinded packaging review.

## Separation invariant (non-negotiable)

Per `eval-v2.md`: **router-visible** inputs and **evaluator-only** truth stay in separate files; public OSS must not ship combined “cheat” fixtures. Premium packs may still ship **both** halves to **entitled** customers via private channel.

## Decision log (binding format)

Each row is a **single** decision (not a theme). **Status:** `proposed` | `accepted` | `deferred` | `superseded`. Owner is the **DRI** until closed.

| ID | Decision | Status | Owner (role) | Date | Notes / trigger |
|----|----------|--------|--------------|------|-------------------|
| **BD-001** | Default public OSS replay fixtures are **tutorial-only**; proprietary `real-replays-*` never ship in public npm default path. | accepted | Engineering (Echelon track) | 2026-05-04 | **CP-025** default path; implemented per [TGA-235](https://youtrack.thegig.agency/issue/TGA-235); `check:oss-boundary`. |
| **BD-002** | Headline / certification claims may use **only** frozen certification lanes + pinned SHA, not mutable packs alone. | accepted | Product | 2026-05-04 | Enforced table: `canonical-claims-and-frozen-lanes-v0.1.md` (H1/H2 + pin). |
| **BD-003** | Split `scoring.ts`: OSS ships **interface + placeholder weights**; production-tuned weights ship in **paid pack** or private module. | deferred | Engineering + Product | — | **CP-009** (OSS) vs **CP-010** (proprietary). **Trigger:** first external licensee needs weight confidentiality *or* first third-party fork copies weights; until then monolith scoring stays OSS per ADR-002. |
| **BD-004** | `frozen-debug-v1` / `frozen-media-v1` bytes already in private `agent-brain`: **retroactive** posture for first paid-only freeze (`frozen-*-v2`) vs “v1 is public marketing loss”. | deferred | Product + Legal | — | **Trigger:** counsel + [TGA-240](https://youtrack.thegig.agency/issue/TGA-240) before first external pack sale; input [TGA-236](https://youtrack.thegig.agency/issue/TGA-236). |
| **BD-005** | Which `project-brain/echelon/*` findings become **public** vs **internal-only** prose. | deferred | Product | — | **Trigger:** first public marketing site or OSS repo README scope freeze. |

## Open questions (non-decisions — input to future BD rows)

_Keep this list short; convert each item into a **BD-*** row when ready to decide._

- (none queued beyond BD-003–BD-005 above.)

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | | | |
| Product | Approved | 2026-05-04 | v0.2 feedback incorporated (moat framing, public vocabulary, primitive portability, marketing guardrails, eval-gravity note). |

## Changelog

- **v0.4** — **CP-*** canonical disposition registry: one target tier per component; scoring / replay / media / ablation / transition concerns split where tiers diverge; epic link to [TGA-233](https://youtrack.thegig.agency/issue/TGA-233) framing doc.
- **v0.3** — Decision log (BD-* rows) replaces broad “open questions” list; sharper execution format for TGA-234 feedback.
- **v0.2** — Product-approved revision: moat preamble, public vs internal naming, primitive portability, headline-claims / mutable-pack guardrail, strategic “eval company gravity” note; consolidated filename to `oss-proprietary-boundary-matrix.md`.
- **v0.1** — Initial matrix for TGA-234 (`oss-proprietary-boundary-matrix-v0.1.md`, superseded).
