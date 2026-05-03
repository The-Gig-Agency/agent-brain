# Architecture Guardrails

**Status:** Draft v1
**Purpose:** Protect the project from drifting into generic agent-framework territory.

## Core Position

This project should not become "another agent framework."

That space is already crowded with:

- agent frameworks
- orchestration layers
- workflow runtimes
- memory systems
- agent operating systems
- multi-agent execution environments

The rare thing in this project is not:

- agents
- orchestration
- memory
- MCPs
- workflows

It is:

- adaptive search-policy governance

That is the center of gravity to protect.

## What This Project Is

This project is a control layer for adaptive agent search.

It should focus on:

- detecting terrain
- selecting search regimes
- managing regime transitions
- remembering failed paths
- invoking counter-regimes
- detecting drift
- measuring whether routing improves outcomes

The system is fundamentally:

- a search-policy transition engine

It is not fundamentally:

- "agents with different styles"

That distinction matters.

## What This Project Is Not

This project should not become:

- a planner-executor loop with nicer language
- a prompt-wrapper framework
- a routing-by-keyword layer
- a personality-agent system
- a crew-style orchestration clone
- a YAML-heavy workflow religion
- a general agent runtime with thin regime branding

If the architecture devolves into those shapes, the project has lost its differentiator.

## Primary Design Test

Every meaningful addition should answer:

- does this improve terrain detection?
- does this improve search-policy selection?
- does this improve transition timing?
- does this improve failed-path memory?
- does this improve counter-regime checking?
- does this improve measurement of outcome quality?

If the answer is no, the feature is likely framework drift.

## Required First-Class Components

The architecture should make these explicit and central:

- terrain schema
- regime scoring engine
- transition conditions
- failed-path memory
- counter-regime invocation
- confidence decay or calibration
- drift detection
- evaluation harness
- routing telemetry

If these are weak while generic agent abstractions are strong, the architecture is moving in the wrong direction.

## Discouraged Components

These are not banned forever, but they should arrive late and only if clearly justified:

- generic agent base classes
- broad orchestration DSLs
- agent personality systems
- framework-wide YAML configuration as the main abstraction
- multi-agent role systems that do not materially change search policy
- elaborate workflow graphs without routing telemetry

The project should resist implementing generic infrastructure before the core routing engine proves value.

## Product Framing Guardrails

Do not position this as:

- an agent framework
- an agent OS
- a workflow platform
- a memory system

Prefer positioning such as:

- search-policy engine
- regime router
- control plane for adaptive agent search
- evaluation and governance layer for reasoning policies

That keeps the differentiation legible.

## Codebase Smell Checks

These are warning signs that the project may be drifting:

- more code for agent lifecycle abstractions than for routing logic
- more configuration syntax than evaluation machinery
- more prompt templates than measurable policy behaviors
- more role/personality definitions than transition rules
- more orchestration glue than benchmark coverage

If those conditions appear, pause and re-center the architecture.

## Success Criteria

The project is on track when:

- terrain is explicit, typed, and inspectable
- regime choice is deterministic enough to audit
- transition logic is observable
- repeated failed paths are actively suppressed
- routing telemetry explains why the system chose a path
- benchmarks show better outcomes or lower cost than simpler baselines

## Commercial Guardrail

The product should not win by sounding smarter.

It should win by improving:

- debugging success
- workflow efficiency
- planning quality
- convergence speed
- retry reduction
- token and tool cost

If the main value is "this feels intellectually satisfying," the product is in danger.

## Decision Rule

When faced with ambiguity, choose the implementation that makes the system more like:

- a measurable search-policy governance layer

and less like:

- a generic agent framework with a compelling essay attached
