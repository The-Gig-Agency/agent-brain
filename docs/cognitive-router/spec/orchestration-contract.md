# Runtime orchestration contract (v1)

**Status:** Draft aligned with AB-39 — canonical spec for the first vertical slice.  
**Glossary:** [`glossary.md`](./glossary.md)

**Ticket closure**

- **AB-18** — Counter-regime checks and transition triggers for **live** `debugging_world_v1` runs are implemented on the `routed_policy` path in `router-runner.ts` (`maybeTransition`), with a structured **`orchestration_trace_v1`** stream (`orchestration-trace-v1.ts`) alongside the legacy `trace`. Acceptance mapping: [§8](#8-ab-18-acceptance-mapping-closed).
- **AB-24** — Versioned **HTTP** recommendation contract is separate: OpenAPI `docs/api/router-recommend-v1.yaml` and `src/server/` (one-shot `POST /v1/recommend`); it does not duplicate the stepping orchestration stream.

## 1. Vertical slice (v1)

- **Slice id:** `debugging_world_v1`
- **Scope:** A single **`DebugEvalCase`** executed via `runDebugCase(..., "routed_policy", options)` in `src/cognitive-router/router-runner.ts`.
- **Out of scope (v1):** Multi-agent distribution, hosted service orchestration, LLM-specific tool loops, media/replay harnesses as first-class orchestration clients (they keep their own contracts until explicitly merged).

## 2. Lifecycle (v1)

1. **Initialize** runtime state from case terrain + budget (`createRuntimeState`).
2. **Emit** initial regime selection on the legacy router trace (`regime_selected` at step `0`).
3. **Repeat** until success, budget exhausted, or **max steps** (see §4):
   - Choose and execute one visible action (`executeAction`).
   - If routed policy and transitions enabled, evaluate **regime transition** (`maybeTransition`).
4. **Terminate** with `DebugRunResult`.

## 3. Trace contracts

### 3.1 Legacy: `RouterTraceEvent[]` (`trace`)

Unchanged for backward compatibility — actions, observations, `transition`, `drift_detected`, `failed_path`, etc.

### 3.2 Orchestration: `orchestration_trace_v1`

- **Schema id:** `orchestration_trace_v1` (constant `ORCHESTRATION_TRACE_SCHEMA_ID` in `src/cognitive-router/orchestration-trace-v1.ts`).
- **Presence:** `DebugRunResult.orchestration_trace` is set **only** when `policy_id === "routed_policy"`.
- **Minimum event types (v1):**
  - `run_start` — `case_id`, `vertical_slice_id: "debugging_world_v1"`, `policy_id`, `schema_id`.
  - `recommendation` — snapshot from `scoreTerrain` after memory ablation: primary, secondary, opposing, confidence, `transition_candidate`.
  - `counter_regime_note` — active regime vs **opposing** regime from the recommendation, with a short explanatory note.
  - `transition_applied` — when active regime changes: `from`, `to`, `trigger`, `detail` (mirrors legacy `transition.reason` semantics).
  - `drift_signal` — when legacy `drift_detected` fires (compound without strong signal branch).
  - `run_end` — `success`, `final_regime`, `total_steps`, `total_cost`.

### 3.3 Design decision: orchestration trace is **summary-only** (v1)

**Intent:** `orchestration_trace_v1` is **not** a second full timeline of actions and observations. It is an **orchestration-semantic** layer: what the scorer recommended, how that relates to the active regime and counter-regime, why transitions fired, and run boundaries.

**Rationale**

1. **Single source of truth for actions** — `DebugRunResult.trace` (`RouterTraceEvent`) already carries `action`, `observation`, `failed_path`, and legacy `transition` / `drift_detected`. Duplicating those payloads in `orchestration_trace` would drift, double storage, and complicate evaluators.
2. **Join model** — Consumers correlate orchestration events with legacy trace rows by **`step`** (and `case_id` from `run_start`). That is the supported “wide” view: orchestration summary + trace detail.
3. **Scope control** — AB-19 observability can grow **annotations** and **trigger taxonomy** on this stream without turning it into a replay format.

**What “stand on its own” means**

- For **orchestration forensics** (regime gating, counter-regime, triggers): the v1 stream is sufficient **together with** `trace`, not alone.
- For **action-level replay** without loading `trace`: **out of scope for v1** — use `trace` or export a merged view in tooling.

**Follow-up (v2+), only if product requires a self-contained artifact**

- Prefer **`action_ref`** / **`observation_ref`** events (step + ids, no full payload) over duplicating `RouterTraceEvent`.
- Alternatively a **`merged_export_v1`** tool-side format — still not required inside `orchestration_trace_v1` types until agreed.

**Extensibility:** Add new `type` discriminators inside `orchestration_trace_v1` only for **orchestration-only** facts (e.g. role id, dwell timer). For action-shape changes, bump schema (e.g. `orchestration_trace_v2`) once consumers exist.

## 4. Transition knobs (v1)

Fixed constants live in **`src/cognitive-router/orchestration-transition-constants.ts`** (`ORCHESTRATION_V1`). Not a user-facing config surface.

| Constant | Role |
|----------|------|
| `MAX_STEPS_PER_RUN` | Hard cap on routed steps per case. |
| `MIN_PRIMARY_CONFIDENCE_FOR_REGIME_SWITCH` | Minimum scored confidence before dynamic primary can override active regime (confidence gate). |
| `STRONG_FAMILY_SIGNAL_MARGIN` | Margin between top and second clue families for “strong signal” heuristics. |

## 5. Transition triggers (`transition_applied.trigger`)

| Trigger | When (v1) |
|---------|-----------|
| `strong_family_signal` | Explore → prune when strong family signal appears. |
| `targeted_inspect_compound` | Prune → compound when narrow + targeted inspect satisfied (or ablation allows skip). |
| `compound_drift_recovery` | Compound → explore when compounded path fails for inferred/root family. |
| `scoring_confidence_gate` | Active regime follows scored primary when confidence ≥ gate and gating not disabled. |
| `other` | Reserved — should not occur in v1 default branches. |

## 6. Implementation map

| Concern | Module |
|---------|--------|
| Step loop + legacy trace | `router-runner.ts` |
| v1 constants | `orchestration-transition-constants.ts` |
| v1 trace types + helpers | `orchestration-trace-v1.ts` |
| v1 role runners (AB-17) | `routed-role-runners.ts` |
| Result field | `DebugRunResult.orchestration_trace` in `types.ts` |

## 7. Consumers

Evaluators and reports may read `orchestration_trace` alongside `trace` for richer narratives. Frozen lanes that predate this field may ignore it.

**Join rule:** interpret `orchestration_trace_v1` as **summary-only** (§3.3); pair with `trace` for full action/observation detail using shared `step` indices.

## 8. AB-18 acceptance mapping (closed)

| AB-18 intent | Where it lands (v1) |
|--------------|---------------------|
| **Counter-regime** surfaced during runs | Each `maybeTransition` call (routed, transitions on) appends **`recommendation`** then **`counter_regime_note`**: active regime vs scorer’s **`opposing_regime`**, same `step`, with a short note. |
| **Transition triggers** on live stepping | When the active regime changes, legacy **`trace`** gets `type: "transition"` and **`orchestration_trace`** gets **`transition_applied`** with the same `step`, `from`, `to`, plus typed **`trigger`** (§5) and `detail` aligned with the legacy `reason`. |
| **Drift-related signals** | Compound-without-strong-signal path emits **`drift_signal`** on the orchestration stream when legacy **`drift_detected`** is recorded on `trace`. |
| **Scope** | Applies to **`runDebugCase(..., "routed_policy")`** on **`DebugEvalCase`** from the debugging world vertical slice (`debugging_world_v1`). Not emitted for frozen baseline policies or for the HTTP recommend-only service. |

**Regression check:** `npm run smoke:ab18-orchestration` runs `src/cognitive-router/run-ab18-orchestration-selftest.ts` after build.
