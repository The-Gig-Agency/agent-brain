# OSS public extract runbook (v0.1)

**Ticket:** [TGA-235](https://youtrack.thegig.agency/issue/TGA-235) · ADR: `adr-002-phase1-oss-publish-scope.md`  
**Legal gate:** [TGA-240](https://youtrack.thegig.agency/issue/TGA-240) — LICENSE choice, counsel review, named accountable owner.

## Purpose

Produce a **reviewable** tree that mirrors the future public npm package **without** committing proprietary fixtures or frozen lanes. The canonical generator in `agent-brain` is:

```bash
npm run export:oss-echelon
```

Output directory (gitignored): `_oss_export/echelon-adaptive-control/`.

## Pre-flight (in `agent-brain`)

1. Confirm [TGA-234](https://youtrack.thegig.agency/issue/TGA-234) **CP-*** registry still matches the allowlist in `scripts/export-oss-echelon.sh` (no new proprietary paths slipped into the extract).
2. Run `npm run check` and `npm run check:oss-boundary`.
2. Run `npm run export:oss-echelon`, then follow the README inside `_oss_export/echelon-adaptive-control/` (`npm install`, `npm run check`, boundary + replay smoke scripts).

## When adding new OSS-safe modules

1. Update **`scripts/export-oss-echelon.sh`** allowlist (`FILES=(...)`) so the export tree still typechecks (`npm run check` in the export folder).
2. Do **not** add `run-real-replays-*.ts`, proprietary fixture basenames, or frozen manifest paths unless ADR 002 is amended and legal signs off.

## Public GitHub repo (first cut)

1. Create empty repo under org policy; add **LICENSE** from TGA-240 decision.
2. Copy contents of `_oss_export/echelon-adaptive-control/` (or re-run export on a clean branch) into the repo root; commit.
3. Add **GitHub Actions**: `npm ci`, `npm run check`, `npm run check:oss-boundary`, `npm run eval:replays:tutorial` (and optionally `eval:replays:community-example`, `check:community-pack-spec`).
4. Extend CI with **`npm pack --dry-run`** (or tarball unpack) + grep denylist for path segments: `real-replays`, `frozen`, `media-decision` fixtures, `run-real-replays` as in ADR 002.
5. Set `private: false` and publish **`@echelon/adaptive-control`** only after registry / naming alignment ([TGA-236](https://youtrack.thegig.agency/issue/TGA-236), [TGA-241](https://youtrack.thegig.agency/issue/TGA-241)).

## Sync policy

`agent-brain` remains the **integration superset**: proprietary fixtures and internal runners stay here; the public repo is a **subset** generated from the allowlist until automation (e.g. release job) copies on tag.
