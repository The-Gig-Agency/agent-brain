# Agent Brain

Shared concept and product docs for agent cognition, routing, orchestration, and related future-system ideas.

## Current Contents

- [`docs/architecture-guardrails.md`](docs/architecture-guardrails.md)
- [`docs/cognitive-router/COGNITIVE_ROUTER_APP_CONCEPT_V1.md`](docs/cognitive-router/COGNITIVE_ROUTER_APP_CONCEPT_V1.md)
- [`docs/cognitive-router/spec/terrain-schema.md`](docs/cognitive-router/spec/terrain-schema.md)
- [`docs/cognitive-router/spec/regime-library.md`](docs/cognitive-router/spec/regime-library.md)
- [`docs/cognitive-router/spec/regime-failure-modes.md`](docs/cognitive-router/spec/regime-failure-modes.md)
- [`docs/cognitive-router/spec/regime-transitions.md`](docs/cognitive-router/spec/regime-transitions.md)
- [`docs/cognitive-router/spec/scoring-model.md`](docs/cognitive-router/spec/scoring-model.md)
- [`docs/cognitive-router/spec/failed-path-memory.md`](docs/cognitive-router/spec/failed-path-memory.md)
- [`docs/cognitive-router/spec/prompt-contract.md`](docs/cognitive-router/spec/prompt-contract.md)
- [`docs/cognitive-router/spec/eval-framework.md`](docs/cognitive-router/spec/eval-framework.md)
- `src/cognitive-router/`: starter TypeScript types, scoring logic, and benchmark cases
- `project-brain/echelon/`: agent-focused MVP brief, roadmap, and eval-v2 notes
- `project-brain/echelon/v0.3-adversarial-tests.md`: the current falsification-oriented debugging-core pass
- `project-brain/echelon/v0.4-plan.md`: the current hardening plan for stronger baselines and holdout tests

## Purpose

This repo is meant to hold:

- concept docs
- product specs
- architecture notes
- evaluation frameworks
- future MVP planning for agent cognition systems

The first concept in the repo is the cognitive router / meta-cognitive orchestration idea:

- routing problems or agent tasks based on terrain
- selecting the right search regime
- using counter-regime checks
- improving policy choice over time through outcome scoring

## Starter Code

The repo now includes a minimal TypeScript foundation for the cognitive router:

- `src/cognitive-router/types.ts`
- `src/cognitive-router/scoring.ts`
- `src/cognitive-router/benchmarks.ts`
- `src/cognitive-router/evaluator.ts`
- `src/cognitive-router/debugging-world.ts`
- `src/cognitive-router/baselines.ts`
- `src/cognitive-router/router-runner.ts`
- `src/cognitive-router/benchmark-runner.ts`
- `src/cognitive-router/run-debugging-v1.ts`
- `src/cognitive-router/index.ts`

This is intentionally small and deterministic:

- typed terrain and regime models
- a weighted scoring engine
- transition-candidate logic
- benchmark cases for evaluation work
- a simple benchmark evaluator for exact and acceptable-match scoring
- a debugging-first synthetic eval engine with executable baselines
- an adversarial `v0.3` suite for permutation, transition-ablation, and misleading-evidence tests
- a `v0.4` hardening pass with anti-broadening traps, one stronger baseline, and generated holdout cases
- a `v0.5` control-oriented pass with anti-transition traps, transition-regret metrics, and replay-style cases

## Commands

- `npm run check`
- `npm run eval:debugging`
