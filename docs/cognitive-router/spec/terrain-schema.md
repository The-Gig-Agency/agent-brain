# Terrain Schema

**Status:** Draft v1
**Purpose:** Define the canonical problem-terrain model for cognitive routing.

## Goal

This schema describes problem structure rather than problem topic.

It should work across:

- agent tasks
- coding/debugging
- product and GTM decisions
- organizational design
- human decision support

The router should classify terrain first, then choose the search regime.

## Core Principle

Hard problems often share latent topological properties even when they come from different domains.

The schema should capture properties like:

- ruggedness
- reversibility
- feedback latency
- branching factor
- adversariality
- information cost
- local minima density

These are treated as universal descriptors of search landscapes.

## Canonical Dimensions

### `feedback_latency`

How quickly the system receives meaningful signal after taking action.

Allowed values:

- `fast`
- `medium`
- `slow`

Interpretation:

- `fast`: rapid feedback loops, cheap iteration
- `medium`: meaningful signal arrives after some delay
- `slow`: learning is expensive and delayed

### `reversibility`

How reversible the downside is after taking action.

Allowed values:

- `high`
- `medium`
- `low`

Interpretation:

- `high`: mistakes are cheap to undo
- `medium`: partial unwind possible
- `low`: strong lock-in or irreversible cost

### `uncertainty`

How uncertain the landscape is given current knowledge.

Allowed values:

- `low`
- `medium`
- `high`

Interpretation:

- `low`: likely good enough to execute
- `medium`: some meaningful unknowns remain
- `high`: sparse evidence and large model uncertainty

### `branching_factor`

How many plausible next paths exist.

Allowed values:

- `low`
- `medium`
- `high`

Interpretation:

- `low`: few meaningful choices
- `medium`: a manageable option set
- `high`: many plausible branches compete for attention

### `adversariality`

How strategic other agents are in the landscape.

Allowed values:

- `none`
- `some`
- `high`

Interpretation:

- `none`: environment is mostly passive
- `some`: other actors influence outcomes
- `high`: strategic competition or negotiation dominates

### `ruggedness`

How non-smooth the landscape is.

Allowed values:

- `low`
- `medium`
- `high`

Interpretation:

- `low`: local progress likely points toward global progress
- `medium`: some traps and uneven returns
- `high`: strong local minima, discontinuities, deceptive paths

### `local_minima_risk`

How likely the system is to get stuck in a plausible but suboptimal path.

Allowed values:

- `low`
- `medium`
- `high`

Interpretation:

- `low`: simple hill-climbing is often adequate
- `medium`: periodic reframing may be needed
- `high`: active escape behavior is likely valuable

### `information_cost`

How expensive it is to gather discriminating evidence.

Allowed values:

- `low`
- `medium`
- `high`

Interpretation:

- `low`: experimentation is cheap
- `medium`: learning costs some budget or time
- `high`: information is expensive or slow to buy

### `coordination_load`

How much alignment or specialization across people or agents is required.

Allowed values:

- `low`
- `medium`
- `high`

Interpretation:

- `low`: one actor can drive progress
- `medium`: some coordination is needed
- `high`: specialization, interfaces, or cross-agent handoff matter

### `environment_stability`

How much the terrain changes while the system is operating.

Allowed values:

- `stable`
- `shifting`

Interpretation:

- `stable`: core assumptions remain reliable for a while
- `shifting`: the landscape updates during search

### `time_horizon`

Whether the task is primarily one-shot or iterative.

Allowed values:

- `one_shot`
- `iterative`

Interpretation:

- `one_shot`: limited opportunity to adapt after action
- `iterative`: repeated feedback and adaptation are expected

### `mode_pressure`

Which macro mode the system appears to need right now.

Allowed values:

- `explore`
- `prune`
- `compound`
- `escape`
- `coordinate`
- `create`

Interpretation:

- `explore`: widen search and learn quickly
- `prune`: eliminate weak branches
- `compound`: execute and deepen a winning path
- `escape`: break out of a stuck state
- `coordinate`: manage specialists or incentives
- `create`: generate variants before selecting

## Derived Features

The system may derive higher-level scores from the raw dimensions.

Examples:

- `experimentation_friendliness`
- `strategic_complexity`
- `convergence_pressure`
- `search_cost`
- `adaptation_need`

These should remain derived values, not user-facing primitives.

## Example Type

```ts
export type TerrainProfile = {
  feedback_latency: "fast" | "medium" | "slow";
  reversibility: "high" | "medium" | "low";
  uncertainty: "low" | "medium" | "high";
  branching_factor: "low" | "medium" | "high";
  adversariality: "none" | "some" | "high";
  ruggedness: "low" | "medium" | "high";
  local_minima_risk: "low" | "medium" | "high";
  information_cost: "low" | "medium" | "high";
  coordination_load: "low" | "medium" | "high";
  environment_stability: "stable" | "shifting";
  time_horizon: "one_shot" | "iterative";
  mode_pressure: "explore" | "prune" | "compound" | "escape" | "coordinate" | "create";
};
```

## Input Contract

The terrain profile may come from:

- direct questionnaire answers
- LLM extraction from free text
- execution traces
- prior runs

When fields are uncertain, the system should store:

- guessed value
- confidence
- whether the value came from user input or inference

## Design Rules

- Keep the first version compact enough to reason about manually.
- Prefer dimensions that change regime choice, not dimensions that only sound smart.
- Avoid mixing terrain descriptors with recommendations.
- Treat terrain as the canonical state passed into scoring and transition logic.

## Open Questions

- Should `mode_pressure` be user-supplied, inferred, or both?
- Should `ruggedness` and `local_minima_risk` stay separate in v1?
- Should `coordination_load` split into human vs agent coordination later?
