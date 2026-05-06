# Cognitive router — glossary (v1)

Canonical definitions for orchestration, eval, and router specs. If a ticket or PR uses a term below, it should match this glossary unless the ticket explicitly overrides it.

**Related:** [`orchestration-contract.md`](./orchestration-contract.md) · [`terrain-schema.md`](./terrain-schema.md) · [`regime-library.md`](./regime-library.md) · [`regime-transitions.md`](./regime-transitions.md) · [`eval-framework.md`](./eval-framework.md)

---

## Search and terrain

| Term | Meaning |
|------|--------|
| **Search regime** | One of `prune`, `explore`, `compound`, `coordinate` — the discrete search posture used by the router and debugging harness. See `SEARCH_REGIMES` in `src/cognitive-router/types.ts` and [`regime-library.md`](./regime-library.md). |
| **Terrain** | A **`TerrainProfile`**: structured dimensions (feedback latency, uncertainty, branching factor, ruggedness, mode pressure, …) describing the problem *surface* for scoring. Full field list: [`terrain-schema.md`](./terrain-schema.md). |
| **Terrain assessment** | Broader input bundle when routing from narrative or tooling; feeds into regime recommendation. Distinct from a single **debug case**’s frozen `input_context.terrain`. |
| **Mode pressure** | A terrain dimension (`TerrainProfile.mode_pressure`) that biases which regime family the scorer favors (e.g. explore vs prune vs compound). |

## Scoring and recommendations

| Term | Meaning |
|------|--------|
| **`scoreTerrain`** | Deterministic function (`src/cognitive-router/scoring.ts`) that maps a `TerrainProfile` (+ optional memory context) to a **`RegimeRecommendation`**. |
| **Regime recommendation** | Result of `scoreTerrain`: **`primary_regime`**, **`secondary_regime`**, **`opposing_regime`** (counter-regime from definitions), **`confidence`**, score **breakdown**, and optional **`transition_candidate`**. |
| **Primary / secondary regime** | Top two regimes by weighted score; secondary may be null in edge cases. |
| **Counter-regime** | **`opposing_regime`** on the recommendation: the regime intended as a *check* against over-committing to the primary (from `REGIME_DEFINITIONS.counter_regimes` in scoring). Used in orchestration notes; not always the next active regime. |
| **Transition candidate** | Optional regime flagged by transition rules in scoring when the profile suggests a *possible* handoff; may or may not become an executed transition in the runtime loop. |
| **Confidence (regime)** | Scalar on `RegimeRecommendation` derived from score margin; used by the debugging runner for **confidence gating** when considering dynamic regime switches. |

## Memory and ablations

| Term | Meaning |
|------|--------|
| **Failed-path memory (scoring)** | **`MemoryScoringContext`**: aggregates such as repeated failed paths, disproven families, strong-signal counts — fed into `scoreTerrain` to adjust regime scores. See [`failed-path-memory.md`](./failed-path-memory.md). |
| **Terrain memory ablation** | Flags to zero or skip memory bumps inside `scoreTerrain` for controlled experiments (`TerrainMemoryAblation` in `types.ts`). |

## Debugging world vs replay

| Term | Meaning |
|------|--------|
| **`DebugEvalCase`** | Synthetic debugging case: visible `input_context` (terrain, budget, actions), hidden truth, expected/acceptable regimes. Consumed by `runDebugCase` in `router-runner.ts`. |
| **Baseline policy** | Non-routed policies (`fixed_heuristic`, `stronger_heuristic`, …) for comparison; do **not** emit `orchestration_trace` in v1. |
| **Routed policy** | `policy_id === "routed_policy"`: regime-aware action selection + transitions; emits both **`trace`** and **`orchestration_trace`** (v1). |
| **Replay case** | Real-style or tutorial **visible** + **evaluator** JSON cases scored by `replay-evaluator.ts` — separate contract from debugging orchestration (may share regime vocabulary). |

## Actions, clues, and observations

| Term | Meaning |
|------|--------|
| **Debug action** | An operator-visible action (`inspect`, `fix`, …) with `id`, `cost`, `family`, `kind` on a debug case. |
| **Clue / family signal** | Per-**`DebugFamily`** scores updated from observation polarity/strength after actions; used for “strong signal” heuristics in the runner. |
| **Observation** | Emitted **`DebugObservation`** on the legacy trace after an action (positive/negative signal tied to a family). |
| **Hidden effect** | Simulator outcome for an action (`getHiddenEffect` in `debugging-world.ts`); not visible to the routed policy as ground truth. |

## Orchestration (runtime loop)

| Term | Meaning |
|------|--------|
| **Orchestration lifecycle** | One **run** of `runDebugCase`: init → repeated steps (action + optional transition) → terminal result. Distinct from a single **search regime** label. |
| **Active regime** | Regime currently driving **action selection** in the runner (`state.activeRegime`); may lag or diverge from scored primary until a transition applies. |
| **Regime transition (runtime)** | When `activeRegime` changes; recorded on legacy trace as `transition` and on **`orchestration_trace_v1`** as `transition_applied` with a **trigger** enum. |
| **Role / role runner** | *(Planned.)* Executable specialization (explorer, optimizer, constraint, adversarial, …). **v1** still implements **regime → action policy** in `router-runner.ts`; first-class role runners are future work (e.g. AB-17). |
| **Orchestration trace (`orchestration_trace_v1`)** | **Orchestration-summary** stream (not a full action log): run boundaries, per-step **`scoreTerrain`** snapshots, counter-regime notes, transition triggers, drift signals. **Authoritative** per-step action/observation detail remains **`trace`** (`RouterTraceEvent`). Rationale and growth rules: [`orchestration-contract.md`](./orchestration-contract.md) §3.3. |
| **Router trace (`trace`)** | **`RouterTraceEvent[]`**: full legacy timeline — `regime_selected`, `action`, `observation`, `transition`, `drift_detected`, `failed_path`, etc. |

## Eval and reporting

| Term | Meaning |
|------|--------|
| **Suite / benchmark** | Aggregated runs over many cases with pass criteria; see [`eval-framework.md`](./eval-framework.md). |
| **False convergence (debug)** | Heuristic flag on `DebugRunResult` when trace patterns suggest premature success or instability (`detectFalseConvergence` in `trace.ts`). |

---

### Versioning

- **Glossary v1** — terms above reflect the **debugging_world_v1** orchestration slice and current TypeScript types. When orchestration or replay contracts bump major behavior, update this file or add `glossary.md` anchors per version.
