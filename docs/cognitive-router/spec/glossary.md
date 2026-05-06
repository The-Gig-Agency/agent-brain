# Cognitive router — glossary (v1)

Canonical definitions for orchestration, eval, and router specs (**AB-33** vocabulary: regime, **mode**, **role**, **strategy family**, **algorithm**, traces). If a ticket or PR uses a term below, it should match this glossary unless the ticket explicitly overrides it.

**Related:** [`orchestration-contract.md`](./orchestration-contract.md) · [`terrain-schema.md`](./terrain-schema.md) · [`regime-library.md`](./regime-library.md) · [`regime-transitions.md`](./regime-transitions.md) · [`eval-framework.md`](./eval-framework.md) · [`COGNITIVE_ROUTER_APP_CONCEPT_V1.md`](../COGNITIVE_ROUTER_APP_CONCEPT_V1.md)

---

### Term stack (do not conflate)

**Terrain** (signals) → **`scoreTerrain`** → **search regime** (four labels) → **strategy family** (taxonomy under a regime) → **algorithm** (concrete parameterized procedure). **Mode** is defined below and is **not** interchangeable with **search regime** or **mode pressure** without qualification.

---

## Search and terrain

| Term | Meaning |
|------|--------|
| **Search regime** | One of `prune`, `explore`, `compound`, `coordinate` — the discrete search posture used by the router and debugging harness. See `SEARCH_REGIMES` in `src/cognitive-router/types.ts` and [`regime-library.md`](./regime-library.md). |
| **Mode** | **Disambiguated label** — do not overload. (1) **In specs, tickets, and APIs** prefer **`search regime`**, **`strategy family`**, or **`algorithm`** instead of bare “mode” unless you mean (2) or (3). (2) **`Mode pressure`** means only the terrain field `TerrainProfile.mode_pressure` (see row below) — never shorten that to “mode” in technical writing. (3) **In product / concept prose** (e.g. [`COGNITIVE_ROUTER_APP_CONCEPT_V1.md`](../COGNITIVE_ROUTER_APP_CONCEPT_V1.md)), “mode” may describe informal operator stance; before implementation, map that prose to **`search regime`** and/or **`strategy family`** explicitly. |
| **Mode pressure** | A **terrain dimension** only: `TerrainProfile.mode_pressure` in `types.ts` — biases scoring toward explore / prune / compound / coordinate style pressure. **Not** a strategy family, not an algorithm, and not the same as colloquial “mode”. |
| **Terrain** | A **`TerrainProfile`**: structured dimensions (feedback latency, uncertainty, branching factor, ruggedness, mode pressure, …) describing the problem *surface* for scoring. Full field list: [`terrain-schema.md`](./terrain-schema.md). |
| **Terrain assessment** | Broader input bundle when routing from narrative or tooling; feeds into regime recommendation. Distinct from a single **debug case**’s frozen `input_context.terrain`. |

## Strategy family and algorithm (AB-2 track)

These terms name the **layers beneath search regime** for product-facing routing (SDR and other adapters). They are **not** implemented as first-class runtime types in the **debugging_world_v1** orchestration slice yet; tickets **AB-12**–**AB-15** own the canonical catalogs and shapes.

| Term | Meaning |
|------|--------|
| **Strategy family** | A **named pattern under a search regime**: a stable taxonomy bucket that groups related ways of attacking a problem *before* picking a concrete procedure. Example shape: “under `explore`, broad discovery vs targeted refinement” (illustrative only — real ids and per-regime lists live in **AB-12**). **Not** a search regime by itself; **not** a single algorithm; **not** the same as **debug family** (see **Debug family** in Actions). |
| **Algorithm** | A **concrete, parameterized procedure** selected after (or alongside) a strategy family: named id, inputs, defaults, costs, and prerequisites (**AB-13** registry). Multiple algorithms may map to one strategy family; one algorithm should not silently stand in for a whole regime. Distinct from **`scoreTerrain`** (which scores terrain into regimes, not algorithms). |
| **Algorithm registry** | The authoritative catalog tying **algorithm ids** to parameter schemas and documentation (**AB-13**). Consumers (internal API, AB-5) should treat registry ids as the stable reference, not ad hoc strings. |

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
| **Debug family** | A **`DebugFamily`** value: defect / signal taxonomy for **synthetic debugging** cases (`debugging-world.ts`, `types.ts`). Used for clues, actions, and observations in the eval harness. **Not** a **strategy family** (product routing under a regime) and **not** an **algorithm**. |
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
