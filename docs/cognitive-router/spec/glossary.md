# Cognitive router — glossary (v1)

Canonical definitions for orchestration and eval work. When a term appears in code, specs, or tickets, use these meanings unless a ticket explicitly supersedes them.

| Term | Meaning |
|------|--------|
| **Search regime** | One of `prune`, `explore`, `compound`, `coordinate` — the high-level search posture chosen from terrain scoring (`scoreTerrain`). |
| **Terrain** | Structured profile of the problem context (latency, uncertainty, branching, etc.) used as input to regime scoring. |
| **Orchestration lifecycle** | Step loop around a single case: budget, actions, observations, optional regime transitions — not the same as “regime” itself. |
| **Role / role runner** | (Planned) Executable behavior specialized for a lane (explorer, optimizer, …). v1 implementation still maps **regime → action policy** in `router-runner.ts`; role runners land in later tickets (e.g. AB-17). |
| **Router trace event** | Legacy stream in `DebugRunResult.trace` (`RouterTraceEvent`): actions, observations, transitions, drift. |
| **Orchestration trace (`orchestration_trace_v1`)** | Structured stream in `DebugRunResult.orchestration_trace` for **routed debugging-world** runs: recommendations, counter-regime notes, transition triggers, drift signals, run boundaries. See `orchestration-contract.md`. |

**Related:** [`orchestration-contract.md`](./orchestration-contract.md) · [`regime-library.md`](./regime-library.md) · [`regime-transitions.md`](./regime-transitions.md)
