# Community replay pack format & contribution policy (v0.1)

**Ticket:** [TGA-239](https://youtrack.thegig.agency/issue/TGA-239) · Epic [TGA-233](https://youtrack.thegig.agency/issue/TGA-233)  
**Harness:** `replay-dataset.ts`, `replay-evaluator.ts`, `runReplaySuite` · **Types:** `ReplayVisibleDataset`, `ReplayEvaluatorDataset`, `CommunityPackManifest`  
**Example fixtures:** `fixtures/echelon/community-example-v0.1.*`  
**Validation:** `src/cognitive-router/community-pack-validation.ts` · **Self-test:** `npm run check:community-pack-spec`

## Goals

1. Let third parties contribute **router-visible + evaluator-paired** replay cases under a clear license, without confusing them with **paid ambiguity packs** or **frozen certification** lanes.
2. Keep **premium / frozen identity** unspoofable from OSS-only distribution (signing and registry remain source of truth for commercial bytes — this spec adds **lint rules** for community PRs).

## Pack kinds

| `pack_manifest.pack_kind` | Meaning |
|---------------------------|--------|
| *(omitted)* | First-party internal or legacy packs (not for external PRs without manifest). |
| `community` | External contribution; must satisfy rules below. |

## Required conventions (community)

### Case identifiers

- Every `ReplayVisibleCase.id` and matching `ReplayEvaluatorCase.id` **must** match:  
  `^community/[a-z0-9][a-z0-9-]{0,62}$`  
  (lowercase, hyphenated slug after `community/`.)

### Reserved namespaces (spoofing prevention)

The following **must not** appear in community case ids, `dataset_name`, or `purpose` strings as **certification impersonation**:

- Prefixes: `frozen-`, `tga-paid/`, `echelon-certified/`, `registry:` followed by a known proprietary `asset.id` from `proprietary-moat-registry-v0.1.json`.
- Substrings implying ratified certification: `frozen-debug-v1`, `frozen-media-v1`, `frozen_certification`, `certification artifact` in `dataset_name` (allowed in free-text `notes` only when clearly describing motivation, not claiming status).

**Commercial packs** use signing and private registry ([TGA-237](https://youtrack.thegig.agency/issue/TGA-237)); the OSS runtime **does not** treat `dataset_name` as proof of certification.

### `pack_manifest` (recommended on community datasets)

```json
{
  "pack_schema_version": "0.1",
  "pack_kind": "community",
  "contributor_display_name": "string",
  "license_spdx": "MIT",
  "redaction_attestation": "string (what was removed vs original incident)"
}
```

Attach the same `pack_manifest` block to **both** visible and evaluator JSON roots for a pair.

### Content rules

- **No real customer names**, production URLs with auth tokens, or employee-only identifiers in visible or evaluator JSON.
- **Fictional** `repo`, `repo_local_path`, `pr_url`, SHAs (like tutorial pack) unless contributor attests public-only sources and license.
- **Paired cases**: evaluator row exists for every visible id; same ordering not required but ids must match 1:1.

### Review checklist (maintainer)

- [ ] Id prefix `community/` on all cases.
- [ ] `pack_manifest` present and `license_spdx` acceptable for repo.
- [ ] No reserved certification strings in `dataset_name` / `purpose`.
- [ ] No evaluator-only leakage into visible-only files (per `eval-v2.md`).
- [ ] `npm run eval:replays:community-example` pattern passes for structural copycats.

## Contribution pipeline

1. Author opens PR adding `fixtures/echelon/community-<slug>-v0.1.visible.json` + `.evaluator.json` + one-line link in `project-brain/echelon/links.md` (optional).
2. PR template (future): link to this spec + attest redaction.
3. Maintainer runs `npm run check:community-pack-spec` + `npm run eval:replays:community-example` (or pack-specific script once added).
4. Merge = consent to project’s CLA/DCO policy ([TGA-240](https://youtrack.thegig.agency/issue/TGA-240) decision).

## Anti-spoofing (OSS runtime behavior)

- **`validateCommunityReplayDatasetPair`**: strict checks for `pack_kind === "community"` submissions and CI.
- **`assertNotImpersonatingCertification`**: rejects obvious certification impersonation in `dataset_name` / `purpose` for **any** pack loaded without a verified commercial manifest (future: wire to signed manifest; today: heuristic guard used in self-test and optional strict mode).

## Changelog

- **v0.1** — Spec + example fixtures + validation module + `npm run check:community-pack-spec`.
