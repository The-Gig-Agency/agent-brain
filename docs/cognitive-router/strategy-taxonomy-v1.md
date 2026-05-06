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

## Shape

`terrain -> regime -> strategy family -> algorithm -> parameters -> recommendation`

### Design rules

- Keep **1 primary** and **1 counter/secondary** by default.
- Add alternatives as full recommendation paths, not string labels.
- Favor concrete operating rules over decorative algorithm naming.
- Make every suggestion cash out into behavior.
- Each strategy family needs a parameter schema, not just a name.
- Strategy families should be more specific than regimes, so one regime can support multiple family variants.

## Strategy families

### prune_broad_discovery

Purpose, start wide, then cull weak branches without collapsing the search too early.

Typical algorithms:

- branch and bound
- beam search

### prune_threshold_filtering

Purpose, apply hard cutoffs when the evidence is already strong enough.

Typical algorithms:

- hypothesis elimination
- threshold ranking

### explore_hypothesis_search

Purpose, generate competing explanations and compare them actively.

Typical algorithms:

- active learning
- perturb-and-test loops

### explore_probe_learning

Purpose, use structured tests to learn quickly in uncertain terrain.

Typical algorithms:

- Bayesian optimization
- bandits

### compound_incremental_refinement

Purpose, improve the current path in small, compounding steps.

Typical algorithms:

- incremental refinement
- gradient descent

### compound_execution_momentum

Purpose, preserve forward motion once the path is working.

Typical algorithms:

- momentum
- curriculum learning

### coordinate_multi_actor_planning

Purpose, reason across actors, dependencies, and handoffs.

Typical algorithms:

- multi-agent planning
- mixture of experts

### coordinate_protocol_design

Purpose, define the rules of coordination explicitly.

Typical algorithms:

- game theory
- protocol design

## Algorithm registry

Each algorithm should declare:

- `id`
- `name`
- `family`
- `description`
- `best_for`
- `anti_pattern`
- `parameter_schema`

Each family should also declare its shared `parameter_schema` so the router can stay deterministic and inspectable.

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

Each surface mapping resolves to a full recommendation object:

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

## Output contract

`alternatives` should be structured recommendation paths, not string labels, so each fallback can be inspected, compared, and logged.

## Implementation note

The first implementation is deterministic and table-driven.
LLM interpretation can sit upstream, but the router output itself should stay stable and inspectable.
