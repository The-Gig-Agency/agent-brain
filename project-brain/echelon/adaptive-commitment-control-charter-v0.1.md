# Adaptive Commitment Control Charter (v0.1)

## Purpose

Establish a disciplined research program to test whether Echelon is discovering reusable adaptive commitment-control primitives rather than overfitting to debugging-specific heuristics.

## Core Hypothesis

A small set of control primitives can measurably improve search quality under uncertainty by regulating when to commit, when to expand, and when to revise confidence.

## Proving Ground and Scope

- primary proving ground: debugging incidents
- adjacent transfer domain: media decisioning
- scope rule: expand domains only after primitive-level causal evidence is stable

## Primitives Under Test

1. commitment timing (when to narrow vs continue exploration)
2. exploration pressure control (avoid premature narrowing under uncertainty)
3. confidence gating and collapse (adjust confidence when evidence quality changes)
4. transition regulation (switch regime when warranted, resist thrashing)
5. recovery after drift (re-open search when environment assumptions break)
6. failed-path suppression (avoid repeating disproven trajectories)

## Invariants (Must Hold)

1. no unjustified overcommitment in underdetermined cases
2. partial fixes remain partial until disconfirming checks pass
3. confidence decreases appropriately when contradictory evidence arrives
4. drift triggers adaptive recovery rather than static persistence
5. transition behavior improves cost-quality tradeoff vs fixed baselines

## Success Criteria

Program is on track if all are true on frozen benchmark:

- routed policy outperforms strong fixed baselines on at least one transition-first metric family
- calibration quality improves (lower overconfidence penalty)
- ablation studies show meaningful degradation when key primitives are removed
- similar control topology appears in both debugging and media packs

## Failure / Falsification Criteria

Hypothesis is weakened or rejected if any persist:

- gains disappear on frozen suite but reappear only on newly tuned suites
- ablations show no clear primitive contribution (bundle works, parts do not matter)
- performance depends mainly on prompt wording or benchmark shaping
- cross-domain transfer fails without major ontology or regime expansion

## Benchmark Governance

- maintain one sacred frozen benchmark (immutable once ratified)
- use separate experimental suites for iteration
- track benchmark versions and report against frozen suite first
- no headline claims based solely on mutable packs

## Experiment Plan (Next 2 Cycles)

- cycle A: transition-first debugging pack (confidence-collapse, drift, partial-resolution traps)
- cycle B: media pack with same primitive tests and matching metrics
- run ablation matrix each cycle:
  - remove one primitive at a time
  - compare against full router plus fixed baselines

## Reporting Standard

Each report must include:

- exact and acceptable action quality
- calibration metrics
- transition regret metrics
- drift recovery behavior
- ablation deltas
- explicit "what this does not prove"

## Non-Goals (For Now)

- broad multi-domain expansion
- large ontology growth
- many new regimes
- general cognition platform positioning

## Positioning Statement

Debugging is the proving ground. Adaptive commitment control is the hypothesis.

The objective is not to sound intelligent; it is to demonstrate measurable control advantages under uncertainty.
