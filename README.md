# Agent Brain

Shared concept and product docs for agent cognition, routing, orchestration, and related future-system ideas.

## Quickstart

```bash
npm install
npm run check
```

**Clean clone / agents:** `npm run check` runs `tsc` from this package’s **devDependencies** (`typescript` is not assumed globally installed). If `tsc` is missing, run `npm install` or `npm ci` first, and avoid `npm install --omit=dev` for this repo. In CI, prefer `npm ci` then `npm run check`.

**Headline proof vs smoke:** For certification-style claims, use **only** frozen lanes **H1 / H2** in [`project-brain/echelon/canonical-claims-and-frozen-lanes-v0.1.md`](project-brain/echelon/canonical-claims-and-frozen-lanes-v0.1.md) (pinned SHA + lock docs). Tutorial replay (`eval:replays:tutorial`) is OSS wiring smoke, not product proof.

## Current Contents

| Layer | Where |
|--------|--------|
| Architecture | [`docs/architecture-guardrails.md`](docs/architecture-guardrails.md) |
| Router concept + specs | [`docs/cognitive-router/COGNITIVE_ROUTER_APP_CONCEPT_V1.md`](docs/cognitive-router/COGNITIVE_ROUTER_APP_CONCEPT_V1.md) · **`docs/cognitive-router/spec/`** (terrain, regimes, transitions, scoring, eval, media) |
| Echelon program (tiered hub) | [`project-brain/echelon/README.md`](project-brain/echelon/README.md) — proof, charter, OSS/commercial; **[`project-brain/echelon/links.md`](project-brain/echelon/links.md)** indexes all notes |
| Code | **`src/cognitive-router/`** — types, scoring, benchmarks, replay harness, eval runners (`npm run eval:*`) |
| Internal recommend HTTP (v1) | **`src/server/`** — `POST /v1/recommend` (structured terrain), `POST /v1/intake-recommend` (messy text, AB-40); see [`docs/api/router-recommend-v1.yaml`](docs/api/router-recommend-v1.yaml), [`src/server/README.md`](src/server/README.md) |

Historical replay/findings bullets were moved off this page to reduce duplication; follow the Echelon **README** or **links**.

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

This is intentionally small and deterministic (terrain scoring, replay harness with visible/evaluator split, synthetic debugging suites, many versioned **`eval:replays:v*`** lanes — see **`package.json`** and Echelon [`eval-v2.md`](project-brain/echelon/eval-v2.md)).

## Commands

- `npm run check`
- `npm run check:oss-boundary` (asserts replay loader defaults stay on OSS-safe `tutorial-replay-v0.1` — see `project-brain/echelon/adr-002-phase1-oss-publish-scope.md`)
- `npm run eval:debugging`
- `npm run eval:replays:tutorial` (synthetic tutorial replay smoke test; safe for open-core extraction)
- `npm run eval:replays:community-example` (community pack schema example; see `project-brain/echelon/community-replay-pack-spec-v0.1.md`)
- `npm run check:community-pack-spec` (validation + anti-impersonation selftest for TGA-239)
- Legal / shell alignment index: [`project-brain/echelon/README.md`](project-brain/echelon/README.md) · TGA-240 / TGA-241 docs linked there
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
- `npm run eval:replays:v0.9-compound-partial` (mutable compound + containment wedge — not H1)
- `npm run eval:frozen:debug:v1` (same runner as v0.8; ratified frozen-debug-v1 — see `project-brain/echelon/frozen-debug-v1-lock.md`)
- `npm run eval:media:v0.1`
- `npm run eval:media:v0.2` (media v2 structured readouts + `media-decision-v0.2.json`)
- `npm run eval:media:boundary:v0.1` (mutable boundary pack: hold / multi-channel realloc / explore–scale & prune–reallocate stress + OOS-style profiles — see `fixtures/echelon/media-decision-boundary-v0.1.json`)
- `npm run eval:ingestion:v0.1` (AB-1 messy input → terrain/confidence/clarification cross-domain fixture lane)
- `npm run eval:frozen:media:v1` (same runner as media v0.1; ratified frozen-media-v1 — see `project-brain/echelon/frozen-media-v1-lock.md`)
- `npm run eval:transition-candidate:v0.1` (mutable candidate lane: transition traps + `transition_cycle_metrics` — not frozen)
- `npm run eval:transition-candidate:v0.2` (expanded 20-case candidate lane — not frozen)
- `npm run eval:ablation-matrix:v0.1` (one-factor primitive table: debugging + replay/media scoring harnesses — see [`project-brain/echelon/archive/findings-ablation-matrix-v0.1.md`](project-brain/echelon/archive/findings-ablation-matrix-v0.1.md))
- `npm run smoke:outcome-events:v1` (AB-28 recommendation/outcome telemetry schema selftest)
- `npm run serve:router-recommend:v1` (internal HTTP: `POST /v1/recommend` — AB-25; auth/logging: [`src/server/README.md`](src/server/README.md))
- `npm run smoke:router-recommend:v1` (deterministic handler smoke)
- `npm run smoke:intake-recommend-v1` (intake handler smoke — AB-40)
- `npm run smoke:router-recommend-http:v1` (HTTP auth/readiness smoke)
- `npm run smoke:router-recommend-ops:v1` (readiness/auth/structured-log smoke)
- `npm run smoke:ab18-orchestration` (routed `orchestration_trace_v1` + legacy transition alignment — AB-18)
- `npm run smoke:ab17-role-runners` (routed regime → role runner registry — AB-17)
- Example internal clients: `examples/internal/router-recommend-client.example.mjs` (AB-27), `examples/internal/router-intake-recommend-client.example.mjs` (AB-40)

Cycle governance templates (copy each cycle): `project-brain/echelon/operating-cadence-checklist-v0.1.md`, `cycle-note-template-v0.1.md`, `cycle-appendix-negatives-template-v0.1.md`; promotion rubric: `promotion-decision-rubric-v0.1.md`.

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
