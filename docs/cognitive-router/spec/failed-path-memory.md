# Failed-Path Memory

**Status:** Draft v1
**Purpose:** Define how the router remembers and uses failed search paths.

## Goal

One of the clearest current agent failures is revisiting the same losing branch repeatedly.

The system needs explicit memory for:

- rejected hypotheses
- disproven assumptions
- failed experiments
- exhausted tool paths

This is central to making search policy operational.

## Core Principle

The router should not only know what terrain it is in.
It should also know:

- which paths have already failed
- why they failed
- whether the failure is local, global, or conditional

This supports better pruning, better transitions, and lower repeated cost.

## Memory Record Shape

```ts
export type FailedPathRecord = {
  id: string;
  regime: "prune" | "explore" | "compound" | "coordinate";
  path_label: string;
  failure_type: "disproven" | "exhausted" | "too_costly" | "blocked" | "stale";
  rationale: string;
  evidence: string[];
  confidence: number;
  retry_condition?: string;
  created_at: string;
};
```

## Failure Classes

### `disproven`

Use when:

- evidence directly contradicts the path

Implication:

- do not retry unless core assumptions change

### `exhausted`

Use when:

- the path was explored adequately and yielded no useful result

Implication:

- avoid immediate repetition

### `too_costly`

Use when:

- the path may work, but cost exceeds value under current constraints

Implication:

- retry only if budget or urgency changes

### `blocked`

Use when:

- execution failed due to a removable external blocker

Implication:

- retry only if the blocker clears

### `stale`

Use when:

- the path failed under old assumptions and may deserve reevaluation after a landscape shift

Implication:

- eligible for future review if terrain changes materially

## Usage Rules

- Every major rejected branch should have a stored rationale.
- The system should distinguish "wrong" from "not now."
- Failure memory should influence both branch ranking and transition logic.
- Memory should be inspectable by humans and agents.

## Router Behaviors

The router should:

- penalize previously failed paths during ranking
- surface prior failure reasons in the explanation
- allow conditional re-entry when retry conditions are met
- flag repeated retries on near-identical branches

Example:

- previous failure: "segment A tests produced signal too weak for cost"
- new terrain: lower acquisition cost, new channel available
- result: path may be eligible again under new conditions

## Anti-Patterns

Avoid:

- binary blacklisting with no nuance
- forgetting why a path failed
- re-running identical experiments without new information
- confusing blocked paths with disproven paths

## Open Questions

- How long should failed-path penalties persist?
- Should memory be shared across agents globally or scoped per task?
- Should low-confidence failures decay automatically?
