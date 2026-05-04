# Commercial packaging — Model 1 (local OSS + paid control packs)

**Ticket:** [TGA-237](https://youtrack.thegig.agency/issue/TGA-237) · Epic [TGA-233](https://youtrack.thegig.agency/issue/TGA-233)  
**Registry:** `proprietary-moat-registry-v0.1.json` ([TGA-236](https://youtrack.thegig.agency/issue/TGA-236))  
**Boundary:** `oss-proprietary-boundary-matrix.md` · **Phase 1 OSS:** `adr-002-phase1-oss-publish-scope.md`

## Ticket layering (reduces overlap with TGA-238)

| Layer | Ticket | Owns |
|-------|--------|------|
| **Strategy roof** | [TGA-238](https://youtrack.thegig.agency/issue/TGA-238) | When to invest in Model 1 vs Model 2 (API) vs Model 3 (enterprise local); gating, build order, comparison matrix. |
| **Model 1 execution** | **TGA-237 (this doc)** | SKUs, entitlement channels, telemetry defaults, CI hooks for **local OSS + paid packs** only. |

Do **not** duplicate Model 2/3 analysis here — link to `commercial-tracks-model2-model3-v0.1.md` for that.

## Model summary (primary)

**Public:** thin npm package (working name `@echelon/adaptive-control` or `@echelon/router` — TBD) with runtime, types, contracts, baselines, replay/eval **harness**, and **tutorial + synthetic** fixtures only.

**Paid:** versioned **control packs** (bytes + optional calibrated thresholds) delivered through a **private** channel with **entitlement**; no dependency on sending customer issue text to a hosted “route my secrets” API.

## SKU map (draft)

| SKU | Audience | Registry `asset.id` (initial) | Notes |
|-----|----------|-------------------------------|--------|
| **Free — Core runtime** | Developers | `tutorial-replay-v0.1`, `debugging-synthetic-v1`, `scoring-policy-default` | Matches Phase 1 OSS scope; `npm run check:oss-boundary` style guarantees in public CI. |
| **Pack — Advanced replay** | Teams proving adaptive control | `replay-real-v1`, `replay-v0.6d` … `replay-v0.8` (bundle tiers TBD) | Sold as versioned tarball or private `@echelon/packs-replay-*`; ambiguity-quality IP. |
| **Pack — Frozen certification** | Enterprise / compliance buyers | `frozen-debug-v1`, `frozen-media-v1` | Requires manifest SHA + lock doc; **only** lane approved for headline claims per boundary matrix. |
| **Pack — Transition eval** | Research-heavy buyers | `transition-candidate-v0.1`, `transition-candidate-v0.2` | Mutable until explicitly frozen as v2+ product. |
| **Pack — Media buying** | GTM operators | `frozen-media-v1` + future media packs | Domain lane; keep separate from debugging frozen where possible. |
| **Add-on — Enterprise calibration** | Single-tenant | *future rows in registry* | Customer-specific bands derived under contract; no upload by default. |
| **Add-on — Team telemetry** | Org dashboard | `team-telemetry-future` | Opt-in aggregates only; default **local** eval. |

Bundles (e.g. “Research bundle” = replay + transition) are **marketing compositions** over registry ids; express as manifest list of `asset.id` + semver.

## Entitlement mechanisms (pick one or offer all)

1. **Private npm scope** — `@echelon/packs-frozen-debug-v1@x.y.z`; auth via npm token or OIDC (CI-friendly).
2. **Signed tarball + manifest** — customer downloads; verify Ed25519/minisign; manifest lists asset ids + content hashes.
3. **License file / key** — `ECHELON_LICENSE_PATH` or similar pointing at JWT or signed blob; runtime resolves download URL from key (hosted **license** server, not **routing** server — privacy-preserving).

Recommendation for v1: **signed tarball + manifest** for air-gapped buyers; **private npm** for developer velocity.

## Telemetry and privacy (defaults)

- **Default:** no benchmark payload leaves the customer environment.
- **Opt-in telemetry:** aggregate pass rates, timing, and **asset id + semver** only — no router-visible case text, no evaluator-only fields.
- **Forbidden default:** shipping “POST /route” with full issue bodies without explicit enterprise agreement (that is Model 2; weaker story).

## CI / packaging hooks

- Public repo: denylist on `npm pack` output (paths matching `real-replays`, `frozen`, `media-decision` except where explicitly allowlisted for docs-only references).
- Paid pack build: include **only** `fixtures` + `lock_documents` + `manifest` rows referenced in the SKU manifest; reproducibility test = same SHA as registry `manifest_pointer` where frozen.

## Open decisions

- Exact package namespace (`@echelon/*` vs org scope).
- Whether first paid artifact is **one** mega-bundle or **per-lane** packs (per-lane improves partial upgrades).
- CLA / export for media fixtures ([TGA-240](https://youtrack.thegig.agency/issue/TGA-240)).

## Changelog

- **v0.1.1** — Ticket layering table: TGA-238 = strategy roof; TGA-237 = Model 1 execution only.
- **v0.1** — Initial Model 1 packaging doc tied to registry v0.1.
