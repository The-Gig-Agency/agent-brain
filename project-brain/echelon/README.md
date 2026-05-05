# Echelon / adaptive commitment (doc hub)

Use this file to **choose depth**. For an **exhaustive flat index** of every note, see [`links.md`](links.md).

## Read first (product + proof)

1. [`canonical-claims-and-frozen-lanes-v0.1.md`](canonical-claims-and-frozen-lanes-v0.1.md) — what counts as headline proof (H1/H2) vs smoke.
2. [`adaptive-commitment-control-charter-v0.1.md`](adaptive-commitment-control-charter-v0.1.md) + [`adaptive-commitment-control-protocol-v0.1.md`](adaptive-commitment-control-protocol-v0.1.md) — program intent and cadence.
3. [`eval-v2.md`](eval-v2.md) — router-visible vs evaluator-only split.
4. [`commercial-open-core-epic-framing-v0.1.md`](commercial-open-core-epic-framing-v0.1.md) — primary path (open core first) and sequencing gates.

## Commercial / legal (when shipping or packaging)

- Boundary: [`oss-proprietary-boundary-matrix.md`](oss-proprietary-boundary-matrix.md) (CP-* registry).
- OSS extract: [`adr-002-phase1-oss-publish-scope.md`](adr-002-phase1-oss-publish-scope.md), [`oss-public-extract-runbook-v0.1.md`](oss-public-extract-runbook-v0.1.md).
- Moat index: [`proprietary-moat-registry-v0.1.md`](proprietary-moat-registry-v0.1.md) (+ `.json`).
- Packaging / shell: [`commercial-packaging-model1-v0.1.md`](commercial-packaging-model1-v0.1.md), [`echelon-product-shell-alignment-v0.1.md`](echelon-product-shell-alignment-v0.1.md), [`legal-repo-hygiene-checklist-v0.1.md`](legal-repo-hygiene-checklist-v0.1.md).

## Cognitive router specs (concept → types)

Living in **`docs/cognitive-router/spec/`** (also mirrored in OSS export): terrain, regimes, transitions, scoring, eval framework, media contract. Entry narrative: **`docs/cognitive-router/COGNITIVE_ROUTER_APP_CONCEPT_V1.md`**.

## Replay & eval history (archive)

Older **plans** and **findings** live under **`archive/`**. Start with **[`archive/README.md`](archive/README.md)** for purpose and **chronological reading order**.

**Findings**, versioned **plans**, and **`real-replays-*` notes** are **research log**: active threads stay in this folder; superseded material is in **`archive/`**. Neither path is mandatory reading. Prefer:

- Latest real-replay framing: **`findings-real-replays-v0.8.md`**
- Operational governance: **`operating-cadence-checklist-v0.1.md`**, **`promotion-decision-rubric-v0.1.md`**, cycle templates in `links.md`

## Replay mining / next wedges

- Compound + containment candidates: [`replay-case-candidates-compound-partial-v0.1.md`](replay-case-candidates-compound-partial-v0.1.md) (wired pack `eval:replays:v0.9-compound-partial`).
- V3 mined IDs (machine): `fixtures/echelon/real-replays-v3-mining-candidates.json` + [`real-replays-v3-mining.md`](real-replays-v3-mining.md).

## Out of scope in this folder

Physics note extracts live under **`ising-seeds/`** at repo root — unrelated to Echelon eval; ignore unless you are following that thread.
