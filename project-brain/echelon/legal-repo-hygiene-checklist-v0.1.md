# Legal & repo hygiene checklist (v0.1)

**Ticket:** [TGA-240](https://youtrack.thegig.agency/issue/TGA-240) · Epic [TGA-233](https://youtrack.thegig.agency/issue/TGA-233)  
**Related:** `oss-proprietary-boundary-matrix.md`, `adr-002-phase1-oss-publish-scope.md`, `community-replay-pack-spec-v0.1.md`, `commercial-packaging-model1-v0.1.md`

## Disclaimer

This document is **engineering and product hygiene guidance**, not legal advice. **Counsel review** is required before first external distribution of OSS artifacts or paid pack bytes.

## Ownership (who runs the review)

| Accountability | Who | Where to record the name |
|----------------|-----|--------------------------|
| **A — Accountable (signs off on “ship”)** | Single exec or delegate (e.g. CTO / GM product line) | YouTrack **TGA-240** description field: `Accountable: <name>`. |
| **R — Responsible (drives checklist to completion)** | Engineering DRI for Echelon open-core extract | YouTrack **TGA-240** assignee + link to this file. |
| **C — Consulted (must review before close)** | **Outside or in-house counsel** (IP + commercial + OSS if applicable) | YouTrack **TGA-240** comment: `Counsel: <firm or name>`, plus engagement date. |
| **I — Informed** | Finance (revenue recognition on packs), Security (if `SECURITY.md` / vuln process) | Optional watchers on TGA-240. |

**Rule:** TGA-240 is **not** closable until **Accountable** and **Counsel** fields are filled in YouTrack (names, not “TBD”). This markdown stays in sync when those names are known (copy one line into the Blockers table below).

## Scope

| Scope | Repo / artifact |
|-------|------------------|
| **A** | Future **public OSS** extract (Phase 1 per ADR-002) |
| **B** | **Private** `agent-brain` monorepo (current) |
| **C** | **Paid pack** tarballs / private npm packages |
| **D** | **Community** contributions (`community/` packs, specs) |

---

## Checklist

### 1. License files

| # | Item | Scope | Status | Owner | Notes |
|---|------|-------|--------|-------|-------|
| 1.1 | Root `LICENSE` chosen (e.g. MIT, Apache-2.0) and committed | A | ☐ Pending | | Dual-license only if counsel approves. |
| 1.2 | `LICENSE` or `COPYING` documents **proprietary** retention for private repo | B | ☐ Pending | | `agent-brain` currently has **no** root `LICENSE`; decide: proprietary header file vs implicit org policy. |
| 1.3 | Paid pack manifest includes **license terms** reference (EULA URL or text hash) | C | ☐ Pending | | Tie to SKU in [TGA-237](https://youtrack.thegig.agency/issue/TGA-237). |
| 1.4 | Community packs carry `license_spdx` in `pack_manifest` + file-level note | D | ☐ Partial | | Example: `community-example-v0.1.*` uses MIT in manifest. |

### 2. SPDX / copyright headers (source)

| # | Item | Scope | Status | Owner | Notes |
|---|------|-------|--------|-------|-------|
| 2.1 | Adopt header template for **new** `.ts` / `.tsx` in OSS repo | A | ☐ Pending | | Short form: SPDX-License-Identifier + copyright line. |
| 2.2 | Bulk header pass strategy (only on files that ship in OSS tarball) | A | ☐ Pending | | Avoid claiming license on files that remain private-only. |
| 2.3 | Third-party code / adapted snippets: `NOTICE` or `third_party/` attribution | A, B | ☐ Pending | | Required if any copied code enters OSS tree. |

### 3. Contributor boundary (CLA / DCO)

| # | Item | Scope | Status | Owner | Notes |
|---|------|-------|--------|-------|-------|
| 3.1 | Choose **DCO** (`Signed-off-by`) vs **CLA** (entity assignment) | A, D | ☐ Pending | | DCO lighter for individual contributors; CLA common for corporate contributors. |
| 3.2 | `CONTRIBUTING.md` links DCO/CLA instructions and `community-replay-pack-spec-v0.1.md` | A | ☐ Pending | | |
| 3.3 | GitHub / GitLab org setting: require sign-off or CLA bot before merge | A | ☐ Pending | | |

### 4. Trademark & naming

| # | Item | Scope | Status | Owner | Notes |
|---|------|-------|--------|-------|-------|
| 4.1 | Policy for use of **Echelon** / `@echelon` npm scope vs neutral package name | A, C | ☐ Pending | | Avoid npm scope squatting; align with product marketing. |
| 4.2 | Community packs must not imply **certification** without signing (see `community-pack-validation.ts`) | D | ☑ In code | | Heuristic guard; legal still defines “Echelon Certified” marks. |

### 5. Privacy & data in fixtures

| # | Item | Scope | Status | Owner | Notes |
|---|------|-------|--------|-------|-------|
| 5.1 | Redaction standard for any future **real** traces in paid packs | C | ☐ Pending | | PII, customer names, tokens. |
| 5.2 | Contributor attestation field (`redaction_attestation`) enforced in review | D | ☐ Pending | | Spec in TGA-239. |

### 6. Export control & sanctions (screening)

| # | Item | Scope | Status | Owner | Notes |
|---|------|-------|--------|-------|-------|
| 6.1 | Counsel note: encryption **use** (TLS) vs controlled **cryptography** | A, C | ☐ Pending | | Usually N/A for statistical routing; record “no controlled crypto” if true. |
| 6.2 | Denied-party / sanctions screening for **paid** customers (if selling enterprise) | C | ☐ Pending | | Process owner outside eng. |

### 7. Security disclosure

| # | Item | Scope | Status | Owner | Notes |
|---|------|-------|--------|-------|-------|
| 7.1 | `SECURITY.md` with disclosure contact | A | ☐ Pending | | Before public repo. |

### 8. CI / compliance hooks

| # | Item | Scope | Status | Owner | Notes |
|---|------|-------|--------|-------|-------|
| 8.1 | License checker optional job (e.g. reuse-lint, fossa) | A | ☐ Pending | | After headers stable. |
| 8.2 | Keep `check:oss-boundary` + `check:community-pack-spec` in public CI | A | ☐ Pending | | Already defined in `package.json`. |

---

## Blockers (explicit)

| Blocker | Owner (role) | Next action |
|---------|----------------|-------------|
| Counsel engagement for OSS + EULA | **Consulted — Counsel** (name in YouTrack TGA-240) | Engagement letter or internal ticket; **schedule review before first `npm publish`**. |
| `agent-brain` root license posture | **Accountable** + **Responsible** (names in TGA-240) | One-page decision: proprietary `LICENSE` / `NOTICE` vs implicit org policy; counsel **Consulted** if any ambiguity. |

Until the **Accountable** and **Counsel** rows are named on the YouTrack ticket, status here remains **blocked — ownership incomplete** (not “vague”: intentionally stops execution).

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | | | Checklist driven to completion or blocked rows above. |
| Product | | | |
| Legal | | | Not filled until counsel review. |

## Changelog

- **v0.1.1** — RACI-style ownership; blockers tied to named roles + YouTrack fields (Accountable, Counsel, Assignee).
- **v0.1** — Initial checklist for TGA-240.
