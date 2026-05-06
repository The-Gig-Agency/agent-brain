# Strategy Taxonomy v1

**Date:** 2026-05-06
**Status:** Draft, implemented in repo
**Canonical home:** `/docs/cognitive-router`

## Goal

Bridge the router from:

- terrain / regime

into:

- strategy family
- concrete algorithm
- operating rules
- SDR prospecting surface mapping
- recommendation output contract

This is the missing layer between the router and a usable product.

## Shape

`terrain -> regime -> strategy family -> algorithm -> parameters -> recommendation`

### Design rules

- Keep **1 primary** and **1 counter/secondary** by default.
- Only add a third option when confidence is low or terrain is mixed.
- Favor concrete operating rules over decorative algorithm naming.
- Make every suggestion cash out into behavior.

## Strategy families

### prune

Purpose, narrow the search space and remove weak branches.

Typical algorithms:

- branch and bound
- beam search
- hypothesis elimination
- ranking and thresholding
- constraint satisfaction

Best when:

- branching factor is high
- evidence is strong enough to cut
- downside of keeping dead branches is high

### explore

Purpose, gather information and expand hypothesis coverage.

Typical algorithms:

- Bayesian optimization
- bandits
- hypothesis generation
- active learning
- perturb-and-test loops

Best when:

- uncertainty is high
- feedback is fast enough to learn from attempts
- information is valuable

### compound

Purpose, deepen the strongest known path and compound gains.

Typical algorithms:

- gradient descent
- momentum
- curriculum learning
- exploitation-first policies
- incremental refinement

Best when:

- signal is already good
- environment is stable
- the main gain is execution depth

### coordinate

Purpose, model multiple agents, incentives, or interfaces.

Typical algorithms:

- game theory
- mixture of experts
- negotiation / protocol design
- multi-agent planning
- incentive-aware routing

Best when:

- strategic behavior matters
- coordination load is high
- the bottleneck is not just search, but alignment across actors

## SDR prospecting mapping

### Common surfaces

- ICP definition
- list building
- enrichment
- message drafting
- sequence design
- objection handling
- pipeline review
- territory / segmentation decisions

### Surface to strategy defaults

- ICP definition, **explore** then **prune**
- list building, **prune**
- enrichment, **prune**
- message drafting, **compound**
- sequence design, **explore** then **compound**
- objection handling, **coordinate**
- pipeline review, **prune** or **coordinate** depending on bottleneck
- territory / segmentation, **explore** then **prune**

## Output contract

The recommendation output should include:

- `primary_regime`
- `secondary_regime`
- `opposing_regime`
- `strategy_family`
- `primary_algorithm`
- `secondary_algorithm`
- `operating_rules`
- `rationale`
- `alternatives`
- `confidence`

## Implementation note

The first implementation is deterministic and table-driven.
LLM interpretation can sit upstream, but the router output itself should stay stable and inspectable.
