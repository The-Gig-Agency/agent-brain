# ADR 002 — Phase 1 open-source publish scope

**Status:** Accepted (implementation started in `agent-brain`)  
**Ticket:** [TGA-235](https://youtrack.thegig.agency/issue/TGA-235) · Parent [TGA-233](https://youtrack.thegig.agency/issue/TGA-233)  
**Depends on:** [TGA-234](https://youtrack.thegig.agency/issue/TGA-234) — `oss-proprietary-boundary-matrix.md` (**CP-*** disposition registry)  
**Related:** `legal-repo-hygiene-checklist-v0.1.md` ([TGA-240](https://youtrack.thegig.agency/issue/TGA-240)), `echelon-product-shell-alignment-v0.1.md` ([TGA-241](https://youtrack.thegig.agency/issue/TGA-241))

## Context

Echelon cognitive routing and replay evaluation currently live in the private **`agent-brain`** monorepo. Phase 1 defines what ships first as **open core** (public repo + npm) so integrators get a local-first runtime, schemas, baselines, and eval harness **without** publishing frozen lanes, real replay packs, or calibration artifacts.

## Decision

### Phase 1 OSS surface (must ship together)

1. **Wire types and assessment shapes** — `TerrainProfile`, `TerrainAssessment`, `RegimeRecommendation`, replay dataset types, etc. (`src/cognitive-router/types.ts` + aligned `docs/cognitive-router/spec/*`).
2. **Deterministic scoring** — keep **current** `scoring.ts` in OSS until [TGA-234](https://youtrack.thegig.agency/issue/TGA-234) split lands; document that **tuned production weights** move to paid packs later.
3. **Baselines** — `baselines.ts` (fair comparisons).
4. **Trace helpers** — `trace.ts` (provenance / metrics helpers used by runners).
5. **Router runner** — `router-runner.ts` (debugging-world harness glue).
6. **Debugging synthetic substrate** — `debugging-world.ts` + `evaluator.ts` contract.
7. **Benchmark primitives** — `benchmarks.ts` (public suite entries only), `benchmark-runner.ts`.
8. **Replay harness** — `replay-dataset.ts`, `replay-evaluator.ts` (code paths), with **OSS-default fixtures** = tutorial pack only.
9. **Public API entry** — `src/cognitive-router/index.ts` exports trimmed to Phase-1 surface when extracted (see cut list).

### Phase 1 explicitly **out** of public npm tarball

| Area | Reason |
|------|--------|
| `fixtures/echelon/real-replays-*.json` | Proprietary / realism IP per boundary matrix |
| `fixtures/echelon/*tight*`, `*diverse*`, `*candidates*`, `v0.*` real suites | Same |
| `fixtures/echelon/media-decision-v0.1.json` | Paid / domain pack lane |
| `project-brain/echelon/frozen-*`, `frozen-lanes-manifest-v1.json` | Certification artifacts |
| All `run-real-replays-*.ts` except patterns re-exported as **examples** | Tied to proprietary fixtures; keep in private repo or gated package |
| `run-media-eval-v0.1.ts`, transition runners, ablation runners | Research / paid lanes; optional **second** private package |
| `reports/` | Local artifacts only |

### OSS-safe default fixtures

- **Canonical public default:** `tutorial-replay-v0.1.visible.json` + `tutorial-replay-v0.1.evaluator.json` under `fixtures/echelon/`.
- **Semantics:** synthetic, fictional repos/SHAs; **not** for headline benchmark claims (replay evaluator caveats when filename contains `tutorial-replay`).
- **`runRealReplaysV1Suite()`** must pass **`real-replays-v1.*` explicitly** so internal R&D behavior stays unchanged while library defaults stay OSS-safe.

### Package layout (target npm scope)

**Preferred primary package (name TBD, aligns with product narrative):**

- `@echelon/adaptive-control` *or* `@echelon/router` — single ESM module exporting types, `scoreTerrain`, baselines, replay load/run, benchmark runner, debugging-world entrypoints.

**Deferred (Phase 1.5+):**

- `@echelon/cli` — thin wrapper for `npm exec` / CI.
- `@echelon/packs-*` — private scoped packages for paid bytes (see [TGA-237](https://youtrack.thegig.agency/issue/TGA-237)).

Monorepo vs single package: start **single package** to reduce publish friction; split only when install size or boundary enforcement requires it.

### Public API sketch (TypeScript)

Consumers should rely on:

```ts
// Core assessment → recommendation (local, deterministic)
import { scoreTerrain, type TerrainAssessment, type RegimeRecommendation } from "@echelon/adaptive-control";

// Fair baselines
import { chooseBaselineAction, type RuntimeStateView } from "@echelon/adaptive-control";

// Replay harness (explicit filenames in app code; library defaults = tutorial only)
import { runReplaySuite, loadReplayVisibleDataset } from "@echelon/adaptive-control";

// Synthetic debugging runtimes
import { /* debugging-world exports */ } from "@echelon/adaptive-control";
```

Host integrations (Cursor / Claude / OpenHands) depend on **stable JSON shapes** from `docs/cognitive-router/spec/` shipped beside or linked from the package README.

### Migration from `agent-brain` (ordered cut)

1. Create public repo (empty) with LICENSE (MIT or Apache-2.0 — [TGA-240](https://youtrack.thegig.agency/issue/TGA-240)), `package.json`, `tsconfig` aligned with Node 20+ ESM.
2. Copy allowlisted `src/cognitive-router/*.ts` + `docs/cognitive-router/spec/**` + `fixtures/echelon/tutorial-replay-v0.1.*` only.
3. Port `scripts/verify-echelon-oss-boundary.sh` (or equivalent) to **public CI**; extend with `npm pack` file-list denylist for `real-replays`, `frozen`, `media-decision`.
4. Wire GitHub Actions: `npm ci`, `npm run check`, `npm run check:oss-boundary`, `npm run eval:replays:tutorial`.
5. Keep **`agent-brain`** as integration superset: proprietary fixtures + runners stay here until [TGA-236](https://youtrack.thegig.agency/issue/TGA-236) registry defines sync.

### CI story (public repo)

| Job | Purpose |
|-----|--------|
| `typecheck` | `tsc --noEmit` |
| `oss-boundary` | `bash scripts/verify-echelon-oss-boundary.sh` + pack-list grep for banned path segments |
| `replay-smoke` | `npm run eval:replays:tutorial` (fails if tutorial fixtures missing or harness regresses) |

Optional: **license header** check per [TGA-240](https://youtrack.thegig.agency/issue/TGA-240).

## Consequences

- **Positive:** Safer defaults for open extraction; tutorial pack proves harness end-to-end without leaking proprietary JSON.
- **Positive:** `runRealReplaysV1Suite` explicit paths preserve internal eval semantics.
- **Risk:** External callers who depended on **implicit** `runReplaySuite()` defaults pointing at `real-replays-v1` must pass filenames explicitly (intentional breaking clarity for OSS).
- **Follow-up:** Split `scoring.ts` when commercial weights diverge; add `MANIFEST.json` of allowed fixture basenames in OSS repo.

## Implementation notes (this repo)

| Artifact | Role |
|----------|------|
| `fixtures/echelon/tutorial-replay-v0.1.*` | OSS-safe canonical tutorial dataset |
| `src/cognitive-router/run-tutorial-replay-v0.1.ts` | Smoke runner |
| `npm run eval:replays:tutorial` | CI-friendly harness check |
| `npm run check:oss-boundary` | Asserts tutorial defaults in loaders / `runReplaySuite` |
| `scripts/verify-echelon-oss-boundary.sh` | Guard script for CI |
| `scripts/export-oss-echelon.sh` | Allowlisted copy into `_oss_export/echelon-adaptive-control/` for legal / engineering review |
| `oss-public-extract-runbook-v0.1.md` | Steps: regenerate extract, open public repo, CI denylist, publish after TGA-240 |

## Acceptance (TGA-235)

Each item is **done** only when the verification line passes on a clean checkout.

- [x] ADR + cut list merged in repo (`this file`). **Verify:** file present at `project-brain/echelon/adr-002-phase1-oss-publish-scope.md`.
- [x] OSS-default replay path uses **tutorial** fixtures only; v1 suite wired explicitly in `runRealReplaysV1Suite`. **Verify:** `npm run check:oss-boundary` passes in `agent-brain`.
- [x] CI guard script + npm hook (`check:oss-boundary`). **Verify:** `scripts/verify-echelon-oss-boundary.sh` exists and is invoked from root `package.json`.
- [x] Local extract + review tree. **Verify:** `npm run export:oss-echelon` then, under `_oss_export/echelon-adaptive-control/`, `npm install && npm run check && npm run check:oss-boundary && npm run eval:replays:tutorial` all pass.
- [x] Runbook for public cut. **Verify:** `project-brain/echelon/oss-public-extract-runbook-v0.1.md` references this ADR and TGA-240 gate.
- [ ] Public repo created and first publish (follow-up when [TGA-240](https://youtrack.thegig.agency/issue/TGA-240) confirms LICENSE and scope). **Verify:** public default branch exists with equivalent tree and CI green.
