# Regime Transitions

**Status:** Draft v1
**Purpose:** Define how and when the system should switch search regimes.

## Goal

The deepest orchestration unit is probably not one regime in isolation.

It is:

- which regime fits now
- what should come next
- which signals should trigger the switch

This turns routing into a temporal control system rather than a one-shot classification step.

## Core Principle

Many tasks fail not because the initial regime was wrong, but because the system stayed in it too long.

Examples:

- exploration should become exploitation
- pruning should become scaling
- diffusion should become convergence
- experimentation should become momentum

## Canonical Transition Patterns

### `explore -> prune`

Use when:

- enough branches have been surfaced
- uncertainty has reduced
- the next bottleneck is choice overload, not discovery

Transition signals:

- repeated tests produce similar winners
- new experiments add little information
- candidate set is still too broad for action

### `prune -> compound`

Use when:

- one or two branches clearly dominate
- the cost of indecision exceeds the value of more elimination
- execution quality matters more than more ranking

Transition signals:

- shortlist is stable across multiple passes
- top option keeps outperforming alternatives
- team energy is being wasted on marginal comparison

### `compound -> explore`

Use when:

- returns flatten
- the environment shifts
- the current path no longer compounds

Transition signals:

- marginal results decline
- failure mode of doubling down appears
- assumptions behind the winning path change

### `prune -> explore`

Use when:

- pruning happened too early
- the search space was mis-specified
- the shortlist is weak

Transition signals:

- eliminated branches were rejected on poor evidence
- all remaining options look bad
- new information suggests the space was underexplored

### `coordinate -> explore`

Use when:

- strategic modeling is blocking learning
- the real issue is uncertainty, not opposition

Transition signals:

- adversarial reasoning dominates despite little evidence
- low-cost experiments could answer key questions faster

### `explore -> coordinate`

Use when:

- uncertainty is no longer the main constraint
- incentives, reactions, or interfaces now dominate the outcome

Transition signals:

- competitor or stakeholder response becomes the bottleneck
- execution now depends on negotiating across agents

## Transition Contract

Each regime should define:

- expected entry conditions
- expected exit conditions
- signals of healthy progress
- signals of overstay
- preferred next regimes

## Example Type

```ts
export type RegimeTransition = {
  from: "prune" | "explore" | "compound" | "coordinate";
  to: "prune" | "explore" | "compound" | "coordinate";
  when: string[];
  signals: string[];
  rationale: string;
};
```

## Design Rules

- A transition should be justified by observable signal, not intuition alone.
- Transitions should be few enough to explain clearly.
- The router should prefer stable transitions over oscillation.
- A counter-regime check may suggest a transition before the primary regime fails completely.

## Open Questions

- Should the system predict the next regime proactively in every output?
- Should transition thresholds be domain-specific or global?
- How should the router suppress rapid back-and-forth switching?
