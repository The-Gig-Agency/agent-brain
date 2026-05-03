# Regime Library

**Status:** Draft v1
**Purpose:** Define the initial search regimes for the cognitive router.

## Goal

Start with a small regime set that is easy to evaluate and hard to misuse.

The first MVP should avoid a large ontology.
It should prove that routing helps before expanding into many fine-grained algorithms.

## MVP Regimes

### 1. Pruning And Elimination

Use when:

- branching factor is high
- uncertainty is not infinite, but too many options remain
- the task needs narrowing more than ideation

Best fit:

- debugging with multiple hypotheses
- prioritization across many candidate paths
- segment selection with constrained budget

Operating pattern:

- generate candidate branches
- eliminate weak paths quickly
- keep explicit rejection reasons
- converge toward a shortlist

Related algorithm inspirations:

- Branch and Bound
- hypothesis elimination
- beam-style narrowing

### 2. Exploratory Search

Use when:

- uncertainty is high
- information cost is low or medium
- feedback loops exist
- premature convergence is dangerous

Best fit:

- GTM exploration
- early product discovery
- unknown-bug diagnosis

Operating pattern:

- prioritize information gain
- run cheap probes
- preserve diversity longer
- favor learning over immediate optimization

Related algorithm inspirations:

- Bayesian Optimization
- Multi-Armed Bandits
- experimental search

### 3. Exploitation And Compounding

Use when:

- signal already exists
- reversibility is acceptable or conviction is high
- the main challenge is consistent execution through friction

Best fit:

- doubling down on an emerging segment
- scaling a working channel
- reinforcing a likely-correct fix path

Operating pattern:

- narrow the active branch set
- deepen investment in the best path
- optimize around execution consistency
- avoid reopening settled questions too often

Related algorithm inspirations:

- Momentum
- exploitation phases in bandit systems
- local optimization under stable assumptions

### 4. Adversarial Or Multi-Agent Reasoning

Use when:

- adversariality is high
- incentives matter
- multiple specialists or stakeholders shape the outcome

Best fit:

- negotiation
- competitive market strategy
- org design and interface definition
- red-team or counterparty-aware planning

Operating pattern:

- model other actors explicitly
- reason about incentives and reactions
- assign specialist roles when helpful
- test plans against adversarial response

Related algorithm inspirations:

- Game Theory
- Mixture of Experts
- adversarial search

## Expansion Regimes

After the MVP proves useful, the library can expand into more specific modes such as:

- Simulated Annealing
- Tabu Search
- Diffusion
- Evolutionary Search
- Curriculum Learning
- Meta-Learning

These should be added only when they improve measurable outcomes.

## Regime Object Shape

```ts
export type SearchRegime =
  | "prune"
  | "explore"
  | "compound"
  | "coordinate";

export type RegimeDefinition = {
  id: SearchRegime;
  name: string;
  useWhen: string[];
  avoidWhen: string[];
  typicalActions: string[];
  transitionSignals: string[];
  failureModes: string[];
  counterRegimes: SearchRegime[];
};
```

## Selection Principles

- Choose the smallest regime set that captures materially different search behavior.
- Prefer regimes that map to operational policy, not just abstract description.
- Keep clear differences between exploration, pruning, execution, and strategic coordination.
- Every regime should define both its strength and its failure pattern.

## Open Questions

- Should `escape` exist as a standalone regime in v1 or stay as a transition pattern?
- Should creative generation be folded into `explore` initially?
- Should `coordinate` be named `adversarial` or stay broader?
