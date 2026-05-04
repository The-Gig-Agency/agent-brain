# Commercial / open-core epic framing (TGA-233)

**Ticket:** [TGA-233](https://youtrack.thegig.agency/issue/TGA-233)  
**Purpose:** Narrow the epic from “everything commercial” to one **primary path**, an explicit **sequence**, and child tickets that hang off that spine.

## Primary path (single spine)

**Chosen path:** **Open-core package first** — a small, auditable **`@echelon/*` npm module** (working name: `@echelon/adaptive-control`) that ships **wire types, cognitive-router specs, deterministic runtime + replay harness, baselines, tutorial/community-example fixtures**, and **CI-enforced OSS boundaries**. Integrators adopt the package **without** frozen lanes, real-replay JSON, or calibration tables.

**Moat follows the spine; it does not compete with it.** Paid value is **bytes + gates**: real-replay packs, frozen certification manifests, media-buying fixtures, transition-eval suites, production weights — loaded only via **registry + entitlement** ([TGA-236](https://youtrack.thegig.agency/issue/TGA-236), [TGA-237](https://youtrack.thegig.agency/issue/TGA-237)), not by widening the first public tarball.

**Explicitly secondary** (same epic, later gates): product shell / installer / gateway façades ([TGA-241](https://youtrack.thegig.agency/issue/TGA-241), [TGA-160](https://youtrack.thegig.agency/issue/TGA-160)), CLI convenience package, community registry **politics** beyond schema validation.

## Sequencing (tight order)

| Gate | Ticket / artifact | Exit criterion |
|------|-------------------|----------------|
| **G1** | [TGA-234](https://youtrack.thegig.agency/issue/TGA-234) `oss-proprietary-boundary-matrix.md` | **CP-*** registry complete: every product component has **exactly one** target tier row; BD-* decisions current for extract. |
| **G2** | [TGA-235](https://youtrack.thegig.agency/issue/TGA-235) ADR-002 + extract | Allowlisted public slice builds and smokes in CI; `export:oss-echelon` reproducible. |
| **G3** | [TGA-240](https://youtrack.thegig.agency/issue/TGA-240) | LICENSE + counsel sign-off before **first public Git push** of extract. |
| **G4** | [TGA-236](https://youtrack.thegig.agency/issue/TGA-236) moat registry | Named DRIs, cadence, and asset URIs for proprietary packs documented. |
| **G5** | [TGA-237](https://youtrack.thegig.agency/issue/TGA-237) / [TGA-238](https://youtrack.thegig.agency/issue/TGA-238) | Packaging Model 1 + strategy roof: free vs paid install paths **tested** (denylist CI on public package). |
| **G6** | [TGA-239](https://youtrack.thegig.agency/issue/TGA-239) | Community pack spec + validator story aligned with OSS defaults. |
| **G7** | [TGA-241](https://youtrack.thegig.agency/issue/TGA-241) | Product shell consumes semver’d OSS only; proprietary bytes never implied by default install. |

Work **may** proceed on G4–G6 in parallel with G2 **only** where it does not change the CP registry out from under G1 without a version bump.

## Child ticket map (minimal)

| Ticket | Role on spine |
|--------|----------------|
| TGA-234 | **Law of the land** — disposition per component. |
| TGA-235 | **First shippable open slice** — extract + guards. |
| TGA-240 | **Publish blocker** — legal. |
| TGA-236 | **Operational moat index** — who owns which bytes. |
| TGA-237 / 238 | **Revenue packaging** — after spine is real. |
| TGA-239 | **Community lane** — format OSS; curation governance optional. |
| TGA-241 | **Shell alignment** — after or alongside G5, not before G2 clarity. |

## Pasteback for YouTrack (TGA-233 epic description / comment)

> **Primary path:** Open-core `@echelon/*` package first (types, specs, runtime, replay harness, OSS-only fixtures, boundary CI). Moat = proprietary pack bytes + frozen certification via registry/entitlement — not a parallel “mystery track” before the package exists.  
> **Sequence:** G1 boundary CP registry → G2 extract (TGA-235) → G3 legal/TGA-240 → G4 registry → G5 packaging → G6 community spec → G7 shell alignment (TGA-241).  
> **Doc:** `project-brain/echelon/commercial-open-core-epic-framing-v0.1.md`
