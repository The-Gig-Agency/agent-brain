# Evaluation Framework

**Status:** Draft v1
**Purpose:** Define how to measure whether cognitive routing improves outcomes.

## Goal

The moat is not the ontology alone.

The core defensible layer is showing that routing policies improve results in particular terrains.

This framework exists to answer:

- does routing improve outcomes?
- in which terrains?
- at what cost?

## Primary Hypothesis

Search-policy selection can improve task performance compared with naive or single-regime agent behavior.

## Benchmark Domains

Start with a small set of wedge domains:

- code debugging
- GTM decisions under uncertainty
- product prioritization

These should be chosen because bad search is expensive and visible.

## Baselines

Compare routed behavior against:

- naive serial trial-and-error
- fixed single-regime strategy
- human-authored heuristic flows where available

## Metrics

### Outcome Quality

- task success rate
- quality of final recommendation
- bug resolution correctness
- plan usefulness or reviewer score

### Search Efficiency

- number of retries
- branch count explored
- time to good-enough answer
- token cost
- tool-call cost

### Process Quality

- frequency of repeated failed paths
- quality of transition timing
- false convergence rate
- unnecessary exploration rate

## Example Evaluation Questions

- Does routed debugging reduce repeated failed fixes?
- Does exploration-first routing improve segment selection under budget constraints?
- Does transition from explore to compound happen earlier and more correctly than baseline?

## Experiment Design

Recommended first pass:

1. collect canonical benchmark cases
2. assign reference terrain profiles
3. define preferred regimes or acceptable sets
4. run baseline behavior
5. run routed behavior
6. compare outcome and efficiency metrics

## Logging Requirements

To evaluate honestly, the system should log:

- inferred terrain profile
- regime selected
- confidence
- transition events
- failed-path memory writes
- final outcome
- token and tool costs

## Success Criteria For MVP

An MVP is promising if it shows at least some of the following:

- fewer repeated failed paths
- lower cost for equal or better outcomes
- better debugging hit rate
- cleaner exploration-to-exploitation transitions
- better reviewer judgment on strategic outputs

## Design Rules

- Favor small, auditable benchmarks over grand claims.
- Evaluate routing policy, not only explanation quality.
- Separate extraction quality from routing quality when possible.
- Track where the regime choice helped and where it hurt.

## Open Questions

- Which metric should dominate in mixed-quality cases: success or cost?
- How much human labeling is needed for benchmark truth?
- Should each domain have its own preferred-regime labels or only outcome-based evaluation?
