# Decision artifact — ticket / PR template (v0.1)

**Purpose:** Turn engineering or eval work into a **short, durable decision record** (media buying, debugging, or shared harness). Use at **ticket close**, **PR merge**, or **end of a micro-cycle** when a full cycle note is too heavy.

**YouTrack (process adoption):** [TGA-245](https://youtrack.thegig.agency/issue/TGA-245) under umbrella [TGA-242](https://youtrack.thegig.agency/issue/TGA-242).

**Related:** `cycle-note-template-v0.1.md` (full cadence), `router-core-service-upgrades-v0.1.md`

---

## Metadata

- **Id:** `<TGA-xxx / PR / commit>`
- **Owner:** `<name>`
- **Date:** `<YYYY-MM-DD>`
- **Scope:** `media` | `debugging` | `harness` | `cross`

---

## 1. What changed

- Code: `<paths or “none”>`
- Fixtures / packs: `<asset ids from registry or “none”>`
- Thresholds / contracts: `<version or “none”>`
- Commands run: `<npm run …>`

---

## 2. What it proves

- Hypothesis addressed: `<one sentence>`
- Evidence: `<pass/fail on which suite; frozen vs mutable>`
- Confidence: `<high / medium / low — why>`

---

## 3. What still fails

- Case IDs / entities: `<list>`
- **Failure taxonomy** (if applicable): `<routing_bug | schema_bug | …>`
- Metrics: `<numbers or “see report path”>`
- **Expected vs actual** (if applicable): `<bulleted per case>`

---

## 4. What to do next

- Next action 1: `<testable; owner; rough when>`
- Next action 2: `<optional>`
- **Explicit non-goals** (optional): `<what we are not doing yet>`

---

## Attachments

- Report JSON path(s): `reports/…`
- Links: `<YouTrack / PR>`
