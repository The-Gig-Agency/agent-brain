# Commercial tracks — Model 2 (API) & Model 3 (enterprise local license)

**Ticket:** [TGA-238](https://youtrack.thegig.agency/issue/TGA-238) · Epic [TGA-233](https://youtrack.thegig.agency/issue/TGA-233)  
**Execution detail for Model 1:** [TGA-237](https://youtrack.thegig.agency/issue/TGA-237) — `commercial-packaging-model1-v0.1.md` (SKUs, entitlement, CI). **TGA-238 sits above TGA-237:** strategy and sequencing, not packaging tables.  
**Registry:** `proprietary-moat-registry-v0.1.json` · **Boundary:** `oss-proprietary-boundary-matrix.md`

## Purpose

This ticket is the **commercial strategy roof**: compare **hosted scoring API** (Model 2) and **enterprise air-gapped license** (Model 3) against Model 1, with **build-order** and **gating** criteria so roadmap investment stays aligned with the open-core + eval-moat strategy. **Do not** duplicate Model 1 SKU tables — those live under TGA-237.

## Comparison matrix

| Dimension | Model 1 — Local + paid packs | Model 2 — `POST /route` API | Model 3 — Enterprise local license |
|-----------|------------------------------|-----------------------------|-------------------------------------|
| **Trust / privacy** | Strong: code + eval local by default | Weaker: payloads leave perimeter unless minimized | Strongest: same as Model 1 + contractual air-gap |
| **Adoption wedge** | Best for Cursor / IDE / agent hosts | Fast for “no install” SMB trials | Best for regulated / F500 engineering |
| **Moat alignment** | Paid **bytes** (packs) + optional calibration | Paid **inference** + latency + versioned API | Paid **bytes + support + SLAs** + renewal |
| **Margin structure** | High gross margin on packs; low COGS | COGS in GPU + SRE; margin at scale | High ARR; services load for updates |
| **Build complexity** | Medium: packaging + entitlement | High: auth, abuse, multi-tenant, RLS | Medium–high: license server + same packs as M1 |
| **IP leakage risk** | Low if packs stay signed/private | Higher (prompt + model extraction surface) | Low |
| **Headline benchmarks** | Frozen packs + manifest SHA | Risk of “mutable API” claims unless frozen proxy | Same as Model 1 |

## Model 2 — Hosted scoring API (sketch)

### Contract (illustrative, not implemented)

`POST /v1/route` or `POST /v1/adaptive-control`

**Request (minimized):** structured fields only — e.g. hashed issue id, attempt counts, contradiction flags, confidence vector, **no raw repo URLs** unless customer opts in.

**Response:** `search_posture`, `transition_guidance`, `confidence_recommendation`, optional `regime` ids for internal clients.

### When Model 2 is worth building

- SMB motion where **install friction** dominates and API is the only conversion path.
- **Hosted-only** scoring models (learned policies) that cannot ship on device.
- Need for **centralized** model updates without customer pull of tarballs.

### Gating criteria (all should be true before major investment)

1. Model 1 runtime is **stable** in the field (semver, adoption proof).
2. **Differential value** of hosted model is measured vs downloadable policy pack (not “thin wrapper”).
3. **Security review**: data classes, retention, regional deployment, customer BAA path.
4. **Benchmark story**: public claims still tied to **frozen** lanes or customer-local eval — not mutable API responses alone (same guardrail as mutable packs in boundary matrix).

### Risks to name explicitly

- Becomes a **generic LLM microservice** unrelated to eval moat.
- **Exfiltration** of ambiguity-quality patterns via prompt extraction.
- Margin compression vs local packs.

## Model 3 — Enterprise local annual license

### Shape

- Same **OSS runtime + signed pack bytes** as Model 1.
- Adds: **annual contract**, **support / SLA**, **benchmark refresh cadence**, optional **on-prem license server** (activation, not routing).
- **Dashboards** optional: self-hosted or VPC-deployed telemetry connector (opt-in aggregates only).

### When Model 3 is the lead motion

- Regulated industries, bank-style **no egress** policies.
- Procurement requires **vendor of record** + **indemnification** + **air-gap**.
- Buyer values **renewal-linked benchmark updates** more than lowest per-seat price.

### Gating criteria

1. At least one **frozen certification** lane with repeatable customer-facing report.
2. **Legal** packaging for redistribution of fixtures under enterprise terms ([TGA-240](https://youtrack.thegig.agency/issue/TGA-240)).
3. **Update mechanism** for packs without breaking frozen v1 customers (parallel `v2` assets in registry).

## Recommended build order

1. **Model 1** to revenue-capable: entitlement + signed tarball or private npm + registry rows ([TGA-236](https://youtrack.thegig.agency/issue/TGA-236), [TGA-237](https://youtrack.thegig.agency/issue/TGA-237)).
2. **Model 3** skeleton in parallel once a frozen lane is sales-ready: contract template, license file format, “no phone home” default, renewal includes pack semver bumps.
3. **Model 2** only after (a) API-minimized contract is spec’d, (b) security sign-off path exists, (c) there is a **non-replicable** hosted model or clear SMB funnel — otherwise it distracts from eval-moat positioning.

## Positioning sentence (external)

- **Model 1:** “Run adaptive investigation control locally; buy realism and certification packs.”
- **Model 2:** “Optional hosted scoring for teams that cannot run local inference — data-minimized by contract.”
- **Model 3:** “Same software, enterprise license: air-gapped, audited, with benchmark refresh and support.”

## Changelog

- **v0.1.1** — Explicit hierarchy: TGA-238 strategy roof vs TGA-237 Model 1 execution doc.
- **v0.1** — Initial roadmap for TGA-238.
