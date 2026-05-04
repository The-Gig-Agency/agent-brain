# Agent Brain

Shared concept and product docs for agent cognition, routing, orchestration, and related future-system ideas.

## Quickstart

```bash
npm install
npm run check
```

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
- [`docs/cognitive-router/spec/media-decision-contract.md`](docs/cognitive-router/spec/media-decision-contract.md)
- [`docs/cognitive-router/spec/media-operator-report-template.md`](docs/cognitive-router/spec/media-operator-report-template.md)
- `src/cognitive-router/`: starter TypeScript types, scoring logic, and benchmark cases
- `project-brain/echelon/`: agent-focused MVP brief, roadmap, and eval-v2 notes
- `project-brain/echelon/v0.3-adversarial-tests.md`: the current falsification-oriented debugging-core pass
- `project-brain/echelon/v0.4-plan.md`: the current hardening plan for stronger baselines and holdout tests
- `project-brain/echelon/real-replays-v1.md`: the first real-case replay dataset notes
- `project-brain/echelon/real-replays-v2-candidates.md`: the next mined replay-expansion set from private repo history
- `project-brain/echelon/real-replays-v3-mining.md`: the next degraded-evidence mining pass for real replay candidates
- `project-brain/echelon/findings-real-replays-v0.6b-diverse.md`: the first replay pass that preserves separation after reducing repo and org fingerprinting in the visible layer
- `project-brain/echelon/findings-real-replays-v0.6c-candidates.md`: the first broader replay-expansion pass over a new mined private-repo candidate set
- `project-brain/echelon/findings-real-replays-v0.6c-tight.md`: the tightened replay-visible rerun of the broader v0.6c candidate set
- `project-brain/echelon/findings-real-replays-v0.6d.md`: the degraded-evidence replay wedge focused on misleading incidents, conflicting telemetry, and delayed root causes
- `project-brain/echelon/findings-real-replays-v0.6e.md`: the first mixed real-world replay pack that tests the explore-versus-prune boundary

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
- split real-replay fixtures for router-visible versus evaluator-only debugging cases
- a first replay evaluator for real merged bug-fix cases, with explicit caveats about current truth-adjacent visible context
- a tighter `v0.6a` replay pass with weaker visible clues and deliberate ambiguity augmentation
- a `v0.6b` replay pass that keeps the ambiguity but reduces repository and organization fingerprinting in the router-visible layer
- a `v0.6c` replay-expansion pass that broadens the real-case mix and recovers separation on hidden-dependency bugs
- a `v0.6c-tight` replay pass that weakens repo and file-path leakage while preserving the broader real-case signal
- a `v0.6d` degraded-evidence replay wedge that stress-tests adaptive commitment against fixed narrowing
- a `v0.6e` mixed replay pack that tests whether the router can distinguish real explore-deserving from prune-deserving cases
- a `v0.6f` harder-asymmetry pack that adds noisy prune cases and weaker-signaled explore cases while making the visible layer read less like labeled terrain

## Commands

- `npm run check`
- `npm run eval:debugging`
- `npm run eval:replays`
- `npm run eval:replays:tight`
- `npm run eval:replays:diverse`
- `npm run eval:replays:v2`
- `npm run eval:replays:v2:tight`
- `npm run eval:replays:v0.6d`
- `npm run eval:replays:v0.6e`
- `npm run eval:replays:v0.6f`
- `npm run eval:replays:v0.7`
- `npm run eval:replays:v0.7a`
- `npm run eval:replays:v0.7b`
- `npm run eval:replays:v0.8`
- `npm run eval:media:v0.1`

## Where eval reports go

Eval runs write a timestamped JSON report under `reports/<suite-id>/...json`.

Important: `reports/` is intentionally **gitignored** (local run artifacts), so don’t expect these files to show up in commits unless you explicitly change that policy.

Example (local file path):

```text
reports/real-replays-v0.7/real-replays-v0.7-2026-05-04T18-16-46.237Z.json
```

## Replay fixtures layout (router-visible vs evaluator-only)

Real replay packs are split into two fixtures under `fixtures/echelon/`:

- `*.visible.json`: what the router is allowed to see (issue-like context, symptoms, partial evidence)
- `*.evaluator.json`: hidden labels/expectations used only for scoring (expected regime, likely fix files, notes)

## How to add a new real replay pack version

Follow the existing `v0.7` pattern:

- **Add fixtures**
  - `fixtures/echelon/real-replays-vX.Y.visible.json`
  - `fixtures/echelon/real-replays-vX.Y.evaluator.json`
- **Add a runner**
  - `src/cognitive-router/run-real-replays-vX.Y.ts` calling `runReplaySuite("real-replays-vX.Y.visible.json", "real-replays-vX.Y.evaluator.json", "real-replays-vX.Y")`
  - It should write to `reports/real-replays-vX.Y`
- **Add an npm script**
  - In `package.json`: `"eval:replays:vX.Y": "npm run build && node dist/cognitive-router/run-real-replays-vX.Y.js"`
- **Run it**
  - `npm run eval:replays:vX.Y`
