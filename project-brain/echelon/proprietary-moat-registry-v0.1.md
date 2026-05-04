# Proprietary moat registry (v0.1)

**Ticket:** [TGA-236](https://youtrack.thegig.agency/issue/TGA-236) · Epic [TGA-233](https://youtrack.thegig.agency/issue/TGA-233)  
**Machine index:** `proprietary-moat-registry-v0.1.json`  
**Related:** `oss-proprietary-boundary-matrix.md`, `frozen-lanes-manifest-v1.json`, `adr-002-phase1-oss-publish-scope.md`

## Purpose

Versioned inventory of **datasets, frozen certification lanes, suites, runners, and policy code** so paid packaging ([TGA-237](https://youtrack.thegig.agency/issue/TGA-237)), CI, and legal can answer: *what is this byte blob, who owns it, how is it released, and does it pair with a ratified router+evaluator SHA?*

This file is the **human guide**; the JSON file is the **mergeable artifact** for scripts (diff, license checks, pack manifests).

## Ownership (DRI)

| Role | Responsibility |
|------|----------------|
| **Engineering DRI** | YouTrack **assignee on [TGA-236](https://youtrack.thegig.agency/issue/TGA-236)** — keeps `proprietary-moat-registry-v0.1.json` accurate paths, `npm_scripts`, runner modules; blocks merges that skip registry updates when review trigger fires. |
| **Product DRI** | Maps SKUs ([TGA-237](https://youtrack.thegig.agency/issue/TGA-237)) to `asset.id` bundles; names new paid tiers. |

Names are **not** duplicated in this file — use the **YouTrack assignee** field as source of truth for who is DRI this quarter.

## Update cadence (minimum)

1. **Same PR** as any change under `fixtures/echelon/`, frozen manifest, or a new/changed `eval:*` script that loads fixtures — registry row added or updated.  
2. **End of each sprint** — quick scan: JSON `updated_at`, fixture list, dead scripts.  
3. **Before any paid pack tarball / private npm publish** — manifest hash matches registry + lock docs.

JSON mirrors this under `governance.update_cadence` and `governance.review_trigger` for tooling.

## How to update

1. Add or edit an object in `assets[]` in the JSON file; bump `registry_schema_version` only on breaking schema changes (prefer additive fields).
2. Frozen certification assets: **never** mutate `fixtures` or pass semantics in place — add `frozen-*-v2` + new `id` per immutability policy in `frozen-lanes-manifest-v1.json`.
3. Link new paid SKUs in `commercial-packaging-model1-v0.1.md` to one or more `asset.id` values.

## Column semantics (JSON)

| Field | Meaning |
|-------|--------|
| `id` | Stable slug; use in SKUs, license manifests, and support tickets. |
| `category` | `frozen_certification`, `replay_pack`, `media_pack`, `transition_suite`, `tuning_infrastructure`, `synthetic_benchmark`, `tutorial_pack`, `scoring_policy`, `telemetry`, `lab_derived`. |
| `license_tier` | `proprietary_paid`, `internal_rnd`, `oss`, `oss_reference`, `oss_until_forked`. |
| `distribution` | Where bytes may ship (private registry, contract tarball, public with runtime, internal only). |
| `certification` | `true` = customer-facing certification lane (frozen); marketing guardrails apply. |
| `mutable` | `false` for ratified frozen bytes; `true` for R&D and mutable packs. |
| `fixtures` | Repo-relative paths in `agent-brain`; empty when data is inline in runner / TS. |
| `npm_scripts` | `package.json` script names for reproducibility. |
| `lock_documents` | Ratified pass thresholds and narrative locks. |
| `metric_schema` | Report shape id (see replay/media evaluators). |

## Summary counts (v0.1)

- **Frozen certification:** `frozen-debug-v1`, `frozen-media-v1` (see manifest).
- **Proprietary replay packs:** all `real-replays-*` fixtures except `tutorial-replay-v0.1.*`.
- **OSS / reference:** `tutorial-replay-v0.1`, `community-example-v0.1`, `debugging-synthetic-v1`, `scoring-policy-default` (until split).
- **Transition / tuning:** `transition-candidate-v0.1`, `transition-candidate-v0.2`, `ablation-matrix-v0.1`.
- **Lab / ephemeral:** `replay-tmp-v0.6f-subset` — do not ship to customers without promotion.

## Gaps / follow-ups

- Wire `replay-v3-mining-candidates` to a first-class runner and npm script when promoted.
- Transition suites: extend JSON with explicit fixture paths once extracted from `benchmark-runner` / TS constants.
- Add `min_oss_runtime_semver` when the public package exists.
- Team telemetry: replace placeholder row when product exists.

## Changelog

- **v0.1.1** — Governance: DRI roles, update cadence, review trigger (JSON `governance` block extended).
- **v0.1** — Initial registry for TGA-236.
