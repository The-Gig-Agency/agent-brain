# Music DNA × Agent Brain Integration Plan

**Date:** 2026-07-25 (revised)  
**Status:** Draft (Revised per owner feedback + current codebase review)  
**Goal:** Integrate Agent Brain's cognitive routing into Music DNA's preference inference engine

> **Sync Note:** The `music-dna` repo (`acedge123/music-dna`) has an older version of this plan at `docs/musicdna/agent-brain-integration-plan.md`. Please sync this version there.

---

## Overview

This plan outlines the technical work required to integrate Agent Brain's regime selection into Music DNA's session flow. The integration will make Music DNA's adaptive behavior explicit, tunable, and measurable.

> **Key Principle (per owner feedback):** Regime is a *weight source* for the existing selector, not a replacement. The plan folds regime into `selectPairing` as an additional input — it does not fork a parallel implementation.

---

## Owner Feedback Summary (2026-07-25)

Critical corrections incorporated into this revision:

| Issue | Original Plan | Correction |
|-------|--------------|------------|
| Recognition mode | Dropped in `selectPairingWithStrategy` | **Preserved.** `PairingStrategy` adds `recognition_mode` and `min_canon_floor` |
| Round-based mode_pressure | `if (round < 4) return "explore"` | **Removed.** Tautology — guarantees shadow shows no difference. Let confidence/bias/probes drive it |
| Probe flips → ruggedness | Flip = high ruggedness | **Inverted.** Flip = lane was wrong, not taste is rugged. Use probe *disagreement without flip* as ruggedness signal |
| Compound disables probes | `probe_enabled: false` | **Changed.** Probes recover from wrong lane. Use *decayed schedule*, not hard disable |
| regime_log JSONB array | On sessions table | **Changed.** Use append-only `regime_events` table to avoid lost-update races |
| env var at module scope | `const URL = process.env.X` | **Changed.** Read inside handler (SSR prerender) |
| User-visible regime | Open question | **Decided: No.** Breaks critic illusion |
| Edge case: stuck user | Not addressed | **Added.** Escape transition at round 15, hard cap at 18 |

**Priority reordering:**
1. Ship telemetry first (shadow logging) — 2 weeks of data before changing behavior
2. Refactor `selectPairing` to take `PairingStrategy` with current hard-coded defaults
3. Only then wire terrain mapper as strategy source

---

## Current Codebase Reality (music-dna repo, not idea-builder)

> **Important:** The analysis was initially done on `acedge123/idea-builder`. The current codebase is `acedge123/music-dna` which has significant differences.

### Key Differences in Current Code

| Feature | idea-builder (old) | music-dna (current) |
|---------|-------------------|---------------------|
| Recognition mode | Implicit in logic | **First-class `SelectionMode`** type |
| Cross-lane probes | In `choice.ts` | **Quarantined** in `experiments/` — NOT ACTIVE |
| Selection instrumentation | None | **`selection_reason`** returned with every pick |
| Probe flips | Active | **Always empty** — probes are experimental |

### Implications for Integration

1. **Probe flips don't exist in production** — `probe_state.flips` is always empty, so "probe disagreement" is the only signal
2. **Recognition mode is already the mechanism** — `SelectionMode` (`diagnostic_first`, `recognition_boost`, `recognition_first`) controls the behavior
3. **`selection_reason` is perfect for shadow logging** — already instrumented
4. **Regime should map to SelectionMode** — not create a parallel concept

### Updated Strategy Mapping

Instead of a new `PairingStrategy` type, regime should influence the **existing** `SelectionMode`.

**The actual current rule** (`nextPairingImpl`, ~line 579) is lane-driven, not round-driven:

```typescript
const mode: SelectionMode =
  sessionLane === "general"
    ? "recognition_first"
    : laneConfidence < 0.6
      ? "recognition_boost"
      : "diagnostic_first";
```

A behavior-preserving mapping must keep both branches and the `0.6` threshold:

```typescript
function regimeToSelectionMode(
  regime: SearchRegime,
  sessionLane: Lane,
  laneConfidence: number,
): SelectionMode {
  // PRESERVED: general lane is never diagnostic-first — users need songs they know
  if (sessionLane === "general") return "recognition_first";
  if (laneConfidence < 0.6) return "recognition_boost";

  // Only lane-confident sessions have room for regime to matter
  return regime === "explore" ? "recognition_boost" : "diagnostic_first";
}
```

> **But see Gap 1 below** — `SelectionMode` alone is too coarse a lever to carry the integration.

---

## Pre-Implementation Gap Analysis (2026-07-25)

Full re-review of this plan against `acedge123/music-dna@ef3d6b6` and `agent-brain@src/cognitive-router`. Everything below must be resolved before coding. Gaps are ordered by severity.

### Gap 1 — `SelectionMode` is too coarse to carry the integration (BLOCKER)

`SelectionMode` is set **once per round from `lane` and `lane_confidence`**, and `lane_confidence` is written at session start and never updated (cross-lane probes, the only thing that changed lanes mid-session, are quarantined). So within a session the mode is effectively **constant**.

If regime only drives `SelectionMode`, then:
- For `general` sessions, mode is pinned to `recognition_first` regardless of regime.
- For lane-confident sessions, mode is pinned by a static number.
- `mode_differs` in shadow would measure *a threshold change*, not the value of regime routing.

**Resolution:** regime must drive the *scoring knobs inside* `selectPairing`, which are currently hard-coded literals:

| Knob | Current literal | Location |
|------|-----------------|----------|
| `recogBlend` | `0.6` / `0.4` / `0` | derived from `mode` |
| challenge boost | `1.5` | `challengeBoost` |
| leaning-axis threshold | `15` | `leaningAxes` filter |
| leaning-axis count | top `3` | `.slice(0, 3)` |
| axis-need blend | `0.4 + 0.6 * axisNeed` | weight formula |
| canon floor | `0` / `45` / `55` | `RECOGNITION_FLOORS` |
| fork hard-filter | always on when `leaningAxes.size > 0` | `forkPool` |

The strategy type should name **these** fields so the defaults are literally today's numbers:

```typescript
export type PairingKnobs = {
  mode: SelectionMode;          // existing lever, preserved
  recog_blend: number;          // 0..1, overrides mode-derived default
  canon_floor: number;          // 0..100 — SAME SCALE as RECOGNITION_FLOORS
  challenge_boost: number;      // multiplier, default 1.5
  leaning_axis_threshold: number; // default 15
  leaning_axis_count: number;   // default 3
  axis_need_floor: number;      // default 0.4  (the "0.4 +" term)
  axis_need_span: number;       // default 0.6  (the "0.6 *" term)
  fork_filter: "hard" | "soft" | "off"; // default "hard"
};

export const LEGACY_KNOBS: PairingKnobs = {
  mode: "diagnostic_first",
  recog_blend: 0,
  canon_floor: 0,
  challenge_boost: 1.5,
  leaning_axis_threshold: 15,
  leaning_axis_count: 3,
  axis_need_floor: 0.4,
  axis_need_span: 0.6,
  fork_filter: "hard",
};
```

`fork_filter: "soft"` (weight instead of hard-filter) is the single highest-value explore lever, because the current hard filter collapses the pool to fork-matching pairings whenever any axis exceeds 15.

> **Unit bug in current plan:** `min_canon_floor: 0.3` is on a 0–1 scale, but `RECOGNITION_FLOORS` are `0/45/55` on a 0–100 scale. As written the plan would disable the recognition floor entirely.

### Gap 2 — Agent Brain's scoring is nearly a pass-through for this terrain (BLOCKER)

Nine of the twelve terrain fields are hard-coded constants in the mapper. Scoring those constants through `DIMENSION_WEIGHTS` gives a fixed baseline **before any session data is considered**:

| Field (constant) | explore | prune | compound | coordinate |
|---|---|---|---|---|
| `feedback_latency: fast` | +2 | +1 | | |
| `reversibility: high` | +2 | +1 | | |
| `adversariality: none` | | +1 | +1 | |
| `information_cost: low` | +2 | +1 | | |
| `coordination_load: low` | | +1 | +1 | |
| `environment_stability: stable` | | +1 | +2 | |
| `time_horizon: iterative` | +2 | | +1 | |
| **Baseline** | **+8** | **+5** | **+5** | **0** |

Meanwhile `mode_pressure` is weighted `+4` — the heaviest single weight in the table — and the mapper computes `mode_pressure` itself from confidence/bias/volatility.

Consequences, all verified by hand-scoring:

1. **`scoreTerrain` almost always just echoes `inferModePressure`.** The mapper is making the decision; Agent Brain is rubber-stamping it. Any claim that "Agent Brain chose the regime" is currently unearned.
2. **Confidence is asymmetric.** `explore` can reach margin 13 (confidence clamps to 1.0), while `prune` and `compound` top out around margin 2 (confidence ≈ 0.56). Any confidence-gated logic silently biases toward explore.
3. **`shouldTransitionRegime`'s `rec.confidence > 0.7` branch is dead code** for prune/compound.

**Resolution:** either (a) accept the mapper as the decision-maker and drop `mode_pressure` to a weaker signal so the other dimensions can actually move the result, or (b) stop hard-coding the nine constants and derive at least `information_cost`, `environment_stability`, and `branching_factor` from real session data. Recommend (a) + (b): set `mode_pressure` from a *coarser* signal and let `uncertainty`/`ruggedness`/`local_minima_risk` carry the decision. Whichever is chosen, **record the expected regime distribution before shipping** so shadow data can be checked against it.

### Gap 3 — Three of four transition rules can never fire (BLOCKER)

`TRANSITION_RULES` evaluated against the mapper's terrain:

| Rule | Condition | Status with current mapper |
|------|-----------|----------------------------|
| `explore → prune` | `branching_factor === "high"` | **Only rounds 0–4.** Mapper sets `branching_factor: session.round < 5 ? "high" : "medium"`, so this is unreachable from round 5 on |
| `prune → compound` | `uncertainty === "low"` and stable | Works |
| `compound → explore` | `shifting` OR `local_minima_risk === "high"` | **Never fires.** `environment_stability` is hard-coded `"stable"`, and `local_minima_risk: "high"` requires artist bias — but `inferModePressure` only returns `compound` when `!artistBias.biased`. The two conditions are mutually exclusive |
| `→ coordinate` | `adversariality high` OR `coordination_load high` | **Never fires.** Both hard-coded to `none`/`low` |

The `compound → explore` rule is the *safety valve that un-sticks a user locked into compounding*, and it is unreachable. This must be fixed before canary, not after.

**Resolution:** drive `environment_stability` from real signal — set `"shifting"` when skip rate rises or decision times trend upward mid-session — and decouple `local_minima_risk` from the `mode_pressure` guard so both can be true at once.

### Gap 4 — The Skip feature is missing from the plan entirely (BLOCKER)

`skipPairingImpl` exists and is a first-class user signal meaning *"I don't recognize either song."* It:
- adds the pairing to `probe_state.skipped_pairing_ids`, which is folded into `usedIds` and therefore **inflates `round` without producing a vector delta**;
- sets `probe_state.wants_wider_probe = true`;
- emits a `pairing_skipped` event.

This is the strongest recognition-failure signal in the product and it maps directly onto terrain:

```typescript
export function detectSkipPressure(
  probeState: { skipped_pairing_ids?: string[] },
  round: number,
): { skip_count: number; skip_rate: number; recognition_failing: boolean } {
  const skip_count = probeState.skipped_pairing_ids?.length ?? 0;
  const skip_rate = round > 0 ? skip_count / round : 0;
  return { skip_count, skip_rate, recognition_failing: skip_count >= 2 || skip_rate > 0.25 };
}
```

Wiring: `recognition_failing` should force `information_cost: "high"` (pairings the user can't engage with are expensive), push `environment_stability: "shifting"` (unblocking Gap 3), and force `mode: "recognition_first"` regardless of regime. Note the plan's confidence math is also distorted by skips, since `round` counts them but the vector does not move — a skip-heavy session looks "stuck at low confidence" purely as an artifact.

### Gap 5 — Required inputs don't exist in the database

| Input the plan assumes | Reality | Required work |
|---|---|---|
| `session.artist_frequency` | **Does not exist anywhere.** No column, no computation | Derive per round: join `choices → songs` and tally `chosen.artist`. Adds a query to `nextPairingImpl` |
| `recentDeltas` | `applyChoice` computes `delta_vector` (line ~1110) but it is **never persisted**; `choices` has no delta column | Either add `delta_vector JSONB` to `choices` (cheap, recommended) or recompute by re-joining `song_axes` per round (expensive) |
| `recentChoices[].ms_to_decide` | Exists on `choices` | Just needs to be selected — currently `nextPairingImpl` only selects `pairing_id` |
| `session.round` | Derived as `usedIds.size` (choices **+ skips**) | Pass explicitly; don't recompute differently in the mapper |

`nextPairingImpl` currently issues `supabase.from("choices").select("pairing_id")`. It must become `select("pairing_id, chosen_song_id, ms_to_decide, created_at")` plus an artist lookup. **This is the first real code change and it should ship with the telemetry step.**

### Gap 6 — All analytics SQL references non-existent columns

The rollout queries use `sessions.archetype_confidence` and `sessions.rounds`. Neither exists. Actual columns are `archetype_score`, `archetype_margin`, `archetype_flagged`, `archetype_top3`. Round count must come from `choices`.

```sql
-- CORRECTED baseline / A-B query
SELECT
  s.routing_mode,
  COUNT(*)                                        AS sessions,
  AVG(s.archetype_score)                          AS avg_archetype_score,
  AVG(s.archetype_margin)                         AS avg_archetype_margin,
  AVG(c.n)                                        AS avg_rounds,
  AVG((s.completed_at IS NOT NULL)::int) * 100    AS completion_rate,
  AVG(EXTRACT(EPOCH FROM (s.completed_at - s.started_at))) AS avg_duration_seconds
FROM sessions s
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS n FROM choices WHERE session_id = s.id
) c ON TRUE
WHERE s.started_at > NOW() - INTERVAL '14 days'
GROUP BY s.routing_mode;
```

Also note `archetype_score` is a **cosine similarity, not a probability** (see `ArchetypeAssignment.score` and `fit_tier`). "+10% archetype confidence" is not a well-defined target on a cosine. Recommend switching the primary metric to `archetype_margin` (top minus runner-up), which is what actually indicates a decisive read, and tracking `archetype_flagged` rate as a guardrail.

### Gap 7 — Reinventing A/B infrastructure that already exists

The plan proposes a `shadow_comparisons` table, a bespoke `hashSessionId` bucketer, and new env vars. But `event_log` **already has `experiment_key` and `variant` columns**, plus `session_id`, `pairing_id`, `choice_id`, `response_time_ms`, `props`, and `client`, with RLS and an existing `recordEvent` server function.

Use it:

```typescript
await recordEvent({
  event_type: "pairing_shown",
  session_id,
  pairing_id,
  experiment_key: "agent_brain_routing",
  variant: routingMode,            // "legacy" | "shadow" | "agent-brain"
  props: { regime, terrain, knobs, selection_reason },
});
```

This removes a table, gets RLS for free, and makes the A/B analysis a `GROUP BY variant` over data the team already knows how to query.

**Required change the plan misses:** `EVENT_TYPES` is a `z.enum` allow-list. Any new event type (e.g. `regime_shadow`) **must be added to that array** or `recordEvent` throws. Prefer reusing `pairing_shown` with `experiment_key` set, to avoid touching the enum at all.

Assignment should also be **persisted on the session at creation** (`sessions.routing_mode`) rather than recomputed per request from a hash. A session must not flip arms mid-run if the rollout percentage is changed.

### Gap 8 — New tables have no RLS, GRANTs, or ownership path

Every table in this project follows a strict pattern: `GRANT` → `ENABLE ROW LEVEL SECURITY` → explicit policies (see `event_log`, `session_reasoning`, `test_runs`). The plan's `CREATE TABLE` statements have none, so the tables would be unreadable by `authenticated` and would trip the Supabase security linter.

If `regime_events` is still wanted after Gap 7, it needs the full treatment:

```sql
CREATE TABLE public.regime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  round INT NOT NULL,
  regime TEXT NOT NULL,
  previous_regime TEXT,
  trigger TEXT NOT NULL,
  terrain_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  rationale TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_regime_events_session ON public.regime_events(session_id);

GRANT SELECT, INSERT ON public.regime_events TO authenticated;
GRANT ALL ON public.regime_events TO service_role;
ALTER TABLE public.regime_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own regime events" ON public.regime_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own regime events" ON public.regime_events
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );
```

Note `user_id` is required — the RLS pattern in this codebase scopes by user, and `regime_events` has no other ownership path.

### Gap 9 — Section 2.2's rewrite silently drops production behavior

The proposed `selectPairing` body in Section 2.2 is not a refactor of the real function. Compared to the shipped implementation it drops:

- `differentArtist` as an **unconditional** filter. The real code always excludes same-artist matchups ("micro-comparisons inside one artist's catalog"). The plan makes it conditional on `artist_diversity_weight > 0.3`, which would start serving same-artist pairings in compound regime.
- The **recognition floor** using `recognition.get(p.id).min_canon >= canonFloor`, including the "if the floor empties the pool, drop the floor" fallback.
- `recogBlend` blending of `recognition_score` with `diagnostic_weight`.
- The **fork/leaning-axes hard filter**.
- The `selection_reason` return value — which the shadow-logging plan depends on.
- `assertWithinLane`, and the general-lane retry fallback in `nextPairingImpl`.

It also invents `isRecognizable(p)` and `isCanonSong(p)` helpers that do not exist; recognition lives in a `Map<string, RecognitionRow>` passed in from the `pairing_recognition` view, not on the candidate.

**Resolution:** discard the Section 2.2 rewrite. The refactor is strictly "replace seven literals with `knobs.*` fields," nothing else. The golden test in Step 2 must assert byte-identical `selection_reason` output across a seeded RNG corpus, not merely the same pairing id.

### Gap 10 — Type and correctness errors in the mapper code

1. **`ModePressure` vs `SearchRegime` are conflated.** `inferModePressure` returns a `ModePressure` (a terrain *input*: `explore | prune | compound | escape | coordinate | create`). `scoreTerrain` returns a `SearchRegime` (the *output*: `prune | explore | compound | coordinate`). `RegimeShadowLog.inferred_regime` is typed as the former but consumed as the latter. Shadow logging must log **both** — `mode_pressure_in` and `regime_out` — and their disagreement is itself the signal that Agent Brain is adding value (see Gap 2).
2. **`escape` is a real `ModePressure` value and should be used.** The plan bolts on a bespoke escape branch at round 15. Instead, return `"escape"` from `inferModePressure` for stuck sessions; the weight table already handles it (`explore +2, prune +1, compound -1`).
3. **Wrong argument order.** After adding `recentDeltas`/`recentChoices` params, `sessionToTerrain` still calls `inferModePressure(session, config)` — passing `config` where `recentDeltas` is expected.
4. **`MusicDNATerrainInput` is declared twice** with different shapes (once in §1.1, once in §1.2). Keep the §1.2 version.
5. **Stale rationale string.** `recommendMusicDNARegime` still emits `"Probe flips occurred — taste landscape is rugged"` for `ruggedness === "high"`, but ruggedness no longer comes from probes.
6. **`recognition_mode: "blended"` is not a real value.** The actual union is `diagnostic_first | recognition_boost | recognition_first`.
7. **`detectDecisionHesitation` is computed but unused** in `inferModePressure` — it is destructured and then never read.

### Gap 11 — Interaction with `shouldStop` is unspecified

`shouldStop` runs **before** selection with `min_rounds = 12` and `confidence_threshold = 0.6`, and returns `done` when both are met. The plan then introduces `MAX_ROUNDS = 18` and `ESCAPE_ROUND = 15` without reconciling them.

Open items: Does regime affect `shouldStop`? A compound regime arguably should be allowed to stop earlier; explore should not. If regime can extend a session past 12 rounds, that directly changes completion rate — the primary rollout metric. **Decide explicitly, and if `shouldStop` stays untouched, say so in the plan**, because "avg rounds 14 → 12" is listed as a success metric and `shouldStop` is what actually controls it.

### Gap 12 — Untouched surfaces that will drift

- **`docs/musicdna/api-v1.md` and `docs/musicdna/mobile_flutter_api_contract.md`** — adding `routing_mode`/`regime` to the pairing response is a contract change. Both docs need updating, and the mobile client tolerating unknown fields must be confirmed.
- **`src/routes/api/public/test/$action.ts`** — the agent test harness calls the `*Impl` functions directly with a service-role client and a synthetic user id. Any new required argument to `nextPairingImpl` breaks it. It also has no `auth.uid()`, which matters for the RLS policies in Gap 8 (service role bypasses RLS, so this is fine — but `user_id` must still be populated explicitly).
- **`src/routes/api/v1/e2e.test.ts`** — end-to-end test drives real sessions; will need a fixed `routing_mode` so it stays deterministic.
- **`docs/musicdna/instrumentation.md`** — should document the new `experiment_key`/`variant` convention.
- **Bootstrap phase** — the `sessionLane === "general" && bootstrapChoices.length < 2` branch returns *before* reaching `selectPairing`. Regime routing must not apply to bootstrap rounds; the plan never mentions this early return.

### Gap 13 — The real session is 6 rounds, and that invalidates most of the round-based design (BLOCKER)

There are **three conflicting round budgets** in the codebase:

| Location | Limit | Effect |
|---|---|---|
| `src/routes/onboarding.tsx:35` | `MAX_ROUNDS = 6` | **This is the shipped web experience.** UI renders `Round NN / 6` and calls `finalizeSession` when `nr > MAX_ROUNDS` |
| `pairing.ts` `shouldStop` | `min_rounds = 12` | Engine default — **unreachable from web**, the UI ends the session first |
| `src/routes/api/v1/e2e.test.ts:33` | `MAX_ROUNDS = 12` | Test harness disagrees with the product |

The evidence-threshold comment confirms 6 is intentional, not a leftover:

> `// Tuned for 6-round adaptive test: 2 supporting choices on an axis is enough to call a tendency ... 0.55 keeps out pure noise without demanding 12 rounds.`

Everything round-indexed in this plan was written against a 12–18 round assumption and is therefore wrong:

1. **`ESCAPE_ROUND = 15` / `MAX_ROUNDS = 18` are dead code.** They are 2.5–3× the entire shipped session. The stuck-user safety valve can never fire.
2. **Compound can essentially never fire.** `inferModePressure` returns `compound` only when `confidence > 0.7`, i.e. 7 of 10 axes at |value| ≥ 30. Each pairing moves only the axes in its `tests` array. Reaching 7 axes in 6 rounds is not achievable in practice. **The compound regime is unreachable in production**, which removes roughly a third of the integration's value.
3. **`STABILITY_CHECKPOINTS = {8, 10, 12, 14}` never fire.** The `archetype_ranking_snapshot` event does not exist in web sessions. Any telemetry plan depending on those snapshots is planning against data that is never written.
4. **`PROBE_ROUNDS = {4, 9, 14}`** — only round 4 is even reachable, and the whole set is `void`ed anyway.
5. **`branching_factor: round < 5 ? "high" : "medium"`** means the mapper flips this field exactly once, at round 5 of 6. Combined with Gap 3, the `explore → prune` transition is confined to a 6-round session's first five rounds.

**This must be resolved before the terrain mapper is written**, because it determines whether regime routing has any room to operate at all. Options:

- **(a) Reconcile the budgets.** Decide the real number, make `shouldStop`, the UI, and the e2e test agree, and delete the other two constants. Even if the answer is "6", having one number is a prerequisite.
- **(b) Re-scale every threshold to a 6-round world.** `confidence > 0.7` for compound becomes unreachable; a 6-round product needs something closer to `> 0.4`, and the escape valve belongs around round 4–5, not 15.
- **(c) Express regime thresholds as fractions of the session budget** rather than absolute rounds, so they survive a future change to the round count.

Recommend (a) then (c). Note that if the product is genuinely 6 rounds, **explore vs. prune is the only live distinction**, and the plan should say so plainly rather than describing a three-regime lifecycle that the product cannot reach.

### Gap 14 — Regime must not starve the evidence ledger

`finalizeSession` gates every user-visible claim on an evidence threshold:

```typescript
const MIN_SUPPORT = 2;      // supporting choices on an axis
const MIN_CONFIDENCE = 0.55;
const allowed_claims = patterns.filter(
  (p) => p.supporting_choices >= MIN_SUPPORT && p.confidence >= MIN_CONFIDENCE,
).slice(0, 5);
```

`supporting_choices` counts how many choices tested that axis. `selectPairing` already concentrates selection via the fork hard-filter (any axis over 15 pulls the pool toward pairings testing that axis). A regime that narrows further — compound, or an aggressive `challenge_boost` — concentrates the same axes again and **reduces the number of distinct axes reaching `MIN_SUPPORT`**.

The failure is user-visible, not subtle. When nothing clears the threshold the reveal falls back to:

> `"Nothing cleared the evidence threshold this round. Either you're harder to read than most, or the matchups didn't catch you. Worth another pass."`

With only 6 rounds and `MIN_SUPPORT = 2`, the ledger has very little slack: roughly 3 axes can clear the bar in a best case, fewer if pairings overlap in what they test.

**Rule to state explicitly in the plan: regime shapes *selection*, never *evidence gating*.** Regime must not touch `MIN_SUPPORT`, `MIN_CONFIDENCE`, or the `patterns` computation.

**Additionally, add axis coverage as a rollout guardrail**, because selection changes can degrade it silently:

```typescript
// Guardrail metric — track per session, alert on regression
axis_coverage = countDistinctAxesWith(supporting_choices >= MIN_SUPPORT);
allowed_claims_count = allowed_claims.length;
empty_reveal_rate = share of sessions where allowed_claims.length === 0;
```

`empty_reveal_rate` should be a **hard rollback trigger**, not a metric to review later. It is the clearest signal that regime routing has starved the ledger.

> **Note on thresholds:** the "≥3 supporting, 0 contradicting" rule is a *different surface* — it governs `ShippedClaim` in the decade/subculture flow (`if (supports < 3 || contradicts !== 0) continue;`). The main MusicDNA reveal uses 2/0.55. Both should be checked, but they are not the same gate.

**Also reuse, don't duplicate:** `finalizeSession` already derives artist bias with the same threshold the terrain mapper proposes (`if (n >= 3) counterarguments.push({ claim: "User may simply prefer ${artist}." })`) and already computes a snap-decision signal (`ms_to_decide < 2000`, flagged at ≥60% of choices). The mapper's `detectArtistBias` and `detectDecisionHesitation` should share these definitions rather than inventing parallel thresholds that can drift.

### Gap 15 — Corrections to the proposed Stage 1 gate and probe cadence

**The golden fixture is `index.test.ts`, not `session.test.ts`.**

- `session.test.ts` only exercises `buildStartSessionSeed` — lane, confidence, probe candidates, seed vector. It never calls `selectPairing`, so it cannot detect a selection behavior change.
- `index.test.ts` is the actual golden fixture, self-described: *"Golden-fixture test: drive the full engine loop with in-memory gateways... If cosine, archetype scoring, probe alignment, or pairing selection tweaks change behavior, this test surfaces it."*
- `pairing.test.ts` is the direct `selectPairing` contract test, including `drops same-artist pairings`.

**Stage 1 gate = `pairing.test.ts` + `index.test.ts`, both green with unchanged fixtures, plus a new assertion on byte-identical `selection_reason`.** Existing tests compare picked ids; they do not pin the full `selection_reason`, so a knob refactor could shift scoring without failing them.

**Probe cadence is moot, and the reason matters.** Tying cadence to confidence rather than round number is the right instinct, but cross-lane probes are **quarantined** (`experiments/cross-lane-probes.ts`), and `nextPairingImpl` actively throws if `probe_state.pending` is non-empty. `PROBE_ROUNDS = {4, 9, 14}` is `void`ed. So there is no probe schedule to decay — `probe_weight` and `decayedProbeWeight` in this plan control a mechanism that is switched off. Those fields should be **removed from `PairingKnobs`** until cross-lane probes are reactivated against their documented criteria.

If the intent was *within-lane* diversification rather than cross-lane probing, that is a different mechanism and should be specified as such — most likely as the `fork_filter: "soft"` knob from Gap 1, which is the real lever for widening selection.

**On `fit_tier`:** it is computed every round and written to `event_log.props.fit_tier` on each `choice_scored` event, so it is technically available mid-session. But two caveats: it is *archetype* strength-of-fit, not lane confidence — `sessions.lane_confidence` is a separate value set once at session start — and reading it back per round means querying `event_log`, since it is not on the session row. It is a usable signal, but it is not the same thing as lane confidence and the plan should not treat the two interchangeably.

### Gap 16 — Shadow exit criteria must be defined before shadow starts

"Two weeks of data" with no decision rule becomes indefinite shadow mode. Concrete criteria, all measurable from the shadow log:

**Proceed to Stage 2 when all of these hold:**

| Criterion | Threshold | Rationale |
|---|---|---|
| Error rate in recommendation path | `0` over the full window | Any exception means the mapper is not production-ready |
| `mode_differs` rate | `≥ 15%` and `≤ 60%` | Below 15%, regime adds nothing over current logic. Above 60%, the mapper is miscalibrated rather than insightful |
| `scoring_agrees` (Gap 2) | `< 95%` | At ~100%, `scoreTerrain` is echoing the mapper and Agent Brain is not contributing a decision |
| Regime distribution | every reachable regime ≥ 5% | If compound is 0% (see Gap 13), the integration is two-regime and the plan must say so |
| Divergences reviewed by hand | `≥ 30` cases | Someone must confirm the different choice is *better*, not merely different |
| Sessions in window | `≥ 200` | Below this, rates are noise |

**Abort and re-specify if:** `mode_differs > 60%`, or hand review finds the divergent pick worse in the majority of sampled cases, or compound never fires (which makes Gap 13 the blocker rather than anything in the mapper).

### Revised Sequencing

| Step | Scope | Gates on |
|------|-------|----------|
| **−1. Round budget** | Gap 13 — reconcile `onboarding.tsx` (6), `shouldStop` (12), `e2e.test.ts` (12) to one number; re-scale regime thresholds to it | Nothing. **This blocks everything else** |
| **0. Data plumbing** | Add `delta_vector` to `choices`; widen the `choices` select; compute artist frequency; add `sessions.routing_mode` | — |
| **1. Telemetry** | Log `mode_pressure_in`, `regime_out`, terrain, `selection_reason` via `event_log` with `experiment_key`; add `axis_coverage` and `empty_reveal_rate` to the baseline | Step 0 |
| **2. Fix mapper** | Gaps 2, 3, 4, 10 — real signals for the constant fields, reachable transitions, skip pressure, `escape`; drop `probe_weight` (Gap 15) | Steps −1 and 1 |
| **3. Knobs refactor** | Replace seven literals in `selectPairing` with `PairingKnobs`; gate on `pairing.test.ts` + `index.test.ts` with a new `selection_reason` assertion | Step 2 |
| **4. Shadow** | Compute knobs from terrain, log divergence, keep serving legacy | Step 3 gate green |
| **5. Canary → A/B → Full** | As previously planned | Gap 16 exit criteria met |

Step −1 is a genuine blocker: until the round budget is settled, there is no way to know whether compound is reachable, and therefore no way to know whether this is a three-regime integration or a two-regime one.

### Decisions Still Needed

1. **Gap 13 — the round budget.** What is the real session length? If it is 6, compound is unreachable and the integration is explore-vs-prune only. This is the decision everything else depends on.
2. **Gap 2 resolution** — de-weight `mode_pressure`, or derive the nine constant terrain fields from real data? This determines whether Agent Brain is genuinely routing or just echoing the mapper.
3. **Gap 11** — may regime change `shouldStop`? If yes, "avg rounds" stops being a clean metric.
4. **`delta_vector` persistence** — add the column (recommended) or recompute from `song_axes`?
5. **Primary success metric** — `archetype_margin` is the defensible choice; confirm before baselining. `empty_reveal_rate` should be a hard rollback trigger regardless (Gap 14).

---

## Minimal First Step: Shadow Logging

The simplest way to start is **shadow logging only** — compute what Agent Brain *would* recommend, log it alongside the current behavior, but don't change any behavior. This gives us:

1. Data to validate the terrain mapper before making changes
2. Metrics showing where current behavior differs from regime recommendations
3. Zero risk to production

### Implementation in Music DNA

Add a single function to `nextPairingImpl` in `src/lib/musicdna.functions.ts`:

```typescript
// src/lib/musicdna-regime-shadow.ts
import type { SelectionReason } from "@/musicdna/engine/pairing";

export type RegimeShadowLog = {
  session_id: string;
  round: number;
  // Terrain inputs
  confidence: number;
  lane_confidence: number;
  artist_bias: { biased: boolean; count: number };
  vector_volatility: { volatile: boolean; avgMagnitude: number };
  // FIXED (Gap 10.1): mode_pressure (terrain INPUT) and regime (scoring OUTPUT)
  // are different types. Log both — their disagreement is the evidence that
  // Agent Brain's scoring table is contributing something beyond the mapper.
  mode_pressure_in: ModePressure;   // explore|prune|compound|escape|coordinate|create
  regime_out: SearchRegime;         // prune|explore|compound|coordinate
  scoring_agrees: boolean;          // regime_out === mode_pressure_in
  would_use_mode: "diagnostic_first" | "recognition_boost" | "recognition_first";
  // Actual behavior
  actual_mode: "diagnostic_first" | "recognition_boost" | "recognition_first";
  actual_selection_reason: SelectionReason;
  // Did they differ?
  mode_differs: boolean;
};

export function computeRegimeShadow(
  session: { id: string; round: number; lane_confidence: number; vector: Record<string, number> },
  artistFreq: Record<string, number>,
  recentDeltas: Array<Record<string, number>>,
  actualMode: "diagnostic_first" | "recognition_boost" | "recognition_first",
  actualSelectionReason: SelectionReason,
): RegimeShadowLog {
  const confidence = calculateSessionConfidence({ vector: session.vector } as any).confidence;
  const artistBias = detectArtistBias({ artist_frequency: artistFreq } as any);
  const volatility = detectVectorVolatility(recentDeltas);
  
  const inferredRegime = inferModePressure(
    { vector: session.vector, artist_frequency: artistFreq } as any,
    recentDeltas,
    [],
  );
  const wouldUseMode = regimeToSelectionMode(inferredRegime, session.lane_confidence);
  
  return {
    session_id: session.id,
    round: session.round,
    confidence,
    lane_confidence: session.lane_confidence,
    artist_bias: { biased: artistBias.biased, count: artistBias.count },
    vector_volatility: { volatile: volatility.volatile, avgMagnitude: volatility.avgMagnitude },
    inferred_regime: inferredRegime,
    would_use_mode: wouldUseMode,
    actual_mode: actualMode,
    actual_selection_reason: actualSelectionReason,
    mode_differs: wouldUseMode !== actualMode,
  };
}
```

### Call Site

In `nextPairingImpl` after `selectPairing` returns:

```typescript
// After selectPairing
const result = selectPairing({ pool, vector, used_ids, session_lane, dims, rng, mode, recognition });

// Shadow log (read env at runtime for SSR)
const shadowEnabled = (() => {
  if (typeof process !== "undefined") return process.env.REGIME_SHADOW_LOG === "true";
  return false;
})();

if (shadowEnabled && result.kind === "picked") {
  const shadow = computeRegimeShadow(
    { id: session_id, round, lane_confidence, vector },
    artistFrequency,
    recentDeltas,
    mode,
    result.selection_reason,
  );
  
  // Log to console or insert into regime_shadow_log table
  console.log("[regime-shadow]", JSON.stringify(shadow));
}
```

### Database Table (Optional)

```sql
CREATE TABLE regime_shadow_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  round INT NOT NULL,
  confidence REAL,
  lane_confidence REAL,
  artist_bias_count INT,
  vector_volatility REAL,
  inferred_regime TEXT,
  would_use_mode TEXT,
  actual_mode TEXT,
  mode_differs BOOLEAN
);

CREATE INDEX idx_regime_shadow_log_session ON regime_shadow_log(session_id);
CREATE INDEX idx_regime_shadow_log_differs ON regime_shadow_log(mode_differs) WHERE mode_differs = true;
```

### Success Metric

After 2 weeks of shadow logging:
- If `mode_differs` > 30% of rounds, the regime logic is adding signal
- If `mode_differs` < 5%, the current hard-coded logic already matches what Agent Brain recommends (or the mapper needs calibration)
- Analyze the cases where they differ to tune thresholds

**Second, independent metric (Gap 2):** track `scoring_agrees`. If `scoring_agrees` is true in ~100% of rounds, `scoreTerrain` is echoing `inferModePressure` and Agent Brain is not contributing a decision — the mapper is. That is a finding about the integration's premise, not a bug in the logging, and it should be resolved before canary.

Also record the **observed regime distribution** and compare it against the distribution predicted by hand-scoring the weight table. A large divergence means the constant terrain fields are miscalibrated.

---

## Phase 1: Foundation

### 1.1 Shared Types Package

Create a shared types package that both projects can import.

**Location:** `src/cognitive-router/integrations/musicdna-types.ts` (Agent Brain)

```typescript
// Types specific to Music DNA integration

import type { TerrainProfile, SearchRegime } from "../types.js";

export type MusicDNASessionState = {
  session_id: string;
  round: number;
  vector: Record<string, number>;
  lane: string;
  lane_confidence: number;
  probe_state: {
    // Quarantined fields — always empty in production, kept for shape compatibility
    probes_shown: Array<{ round: number; pairing_id: string; lane: string }>;
    pending: Record<string, string>;
    lane_alignment: Record<string, { wins: number; total: number; magnitude: number; cosine_sum: number }>;
    flips: Array<{ round: number; from: string; to: string; reason: string }>;
    // LIVE fields (Gap 4) — the skip signal is real and load-bearing
    skipped_pairing_ids?: string[];
    wants_wider_probe?: boolean;
  };
  used_pairing_ids: string[];
  // NOT a database column (Gap 5). Caller must derive this per round by
  // joining choices → songs and tallying the chosen artist.
  artist_frequency?: Record<string, number>;
};

// NOTE (Gap 10.4): MusicDNATerrainInput is defined once, in §1.2 below.
// It must carry recentDeltas + recentChoices, so the earlier stripped-down
// version that used to sit here has been removed.

export type MusicDNARegimeRecommendation = {
  regime: SearchRegime;
  confidence: number;
  terrain: TerrainProfile;
  rationale: string[];
  transition_candidate: SearchRegime | null;
  pairing_strategy: PairingStrategy;
};

export type PairingStrategy = {
  // Weights for pairing selection
  axis_need_weight: number;        // How much to favor uncertain dimensions
  hypothesis_challenge_weight: number; // How much to challenge strong axes
  artist_diversity_weight: number; // How much to penalize same-artist
  
  // Recognition mode (PRESERVED from existing logic)
  recognition_mode: "recognition_first" | "blended" | "diagnostic_first";
  recognition_boost: number;       // Boost for recognizable pairings (0-1)
  min_canon_floor: number;         // Minimum canon song threshold
  
  // Probe schedule (NOT hard-disabled — use decay)
  probe_weight: number;            // 0-1, decays over rounds, never fully off
  
  // Thresholds
  min_diagnostic_weight: number;
  max_pairings_per_dimension: number;
};
```

### 1.2 Terrain Mapper

**Location:** `src/cognitive-router/integrations/musicdna-terrain-mapper.ts` (Agent Brain)

```typescript
import type { TerrainProfile, ModePressure } from "../types.js";
import type { MusicDNASessionState, MusicDNATerrainInput, PairingStrategy } from "./musicdna-types.js";

const DEFAULT_DIMS = [
  "movement", "atmosphere", "immersion", "scale", "community",
  "perspective", "confidence", "tension", "texture", "transformation",
] as const;

const DEFAULT_CONFIG = {
  dims: DEFAULT_DIMS,
  confidence_thresholds: { low: 0.3, high: 0.7 },
  artist_bias_threshold: 3,
};

export function calculateSessionConfidence(
  session: MusicDNASessionState,
  dims: readonly string[] = DEFAULT_DIMS,
  axisThreshold = 30,
): { confidence: number; confident_axes: number; total_axes: number } {
  const confident_axes = dims.filter(
    (d) => Math.abs(session.vector[d] ?? 0) >= axisThreshold,
  ).length;
  return {
    confidence: confident_axes / dims.length,
    confident_axes,
    total_axes: dims.length,
  };
}

export function detectArtistBias(
  session: MusicDNASessionState,
  threshold = 3,
): { biased: boolean; top_artist: string | null; count: number } {
  const freq = session.artist_frequency ?? {};
  const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  if (!top || top[1] < threshold) {
    return { biased: false, top_artist: null, count: 0 };
  }
  return { biased: true, top_artist: top[0], count: top[1] };
}

export function inferModePressure(
  session: MusicDNASessionState,
  recentDeltas: Array<Record<string, number>> = [],
  recentChoices: Array<{ ms_to_decide: number | null }> = [],
  config = DEFAULT_CONFIG,
): ModePressure {
  const { confidence } = calculateSessionConfidence(session, config.dims);
  const artistBias = detectArtistBias(session, config.artist_bias_threshold);
  const volatility = detectVectorVolatility(recentDeltas);
  const hesitation = detectDecisionHesitation(recentChoices);
  const { low, high } = config.confidence_thresholds;
  
  // NOTE: No round gate here — that would be a tautology that guarantees
  // shadow mode shows "no difference" vs current hard-coded behavior.
  // Let confidence, artist bias, and ruggedness signals drive the regime.
  
  // FIXED (Gap 10.2): "escape" is a real ModePressure value. Stuck sessions
  // return it instead of relying on a bespoke branch bolted on at the call site.
  if (session.round >= ESCAPE_ROUND && confidence < low) return "escape";

  // Artist bias detected: force exploration to break out of local minimum
  if (artistBias.biased && artistBias.count >= 4) return "explore";
  
  // High volatility + low confidence: landscape is rugged, explore more
  if (volatility.volatile && confidence < high) return "explore";
  
  // FIXED (Gap 10.7): hesitation was computed but never read
  if (hesitation.hesitant && confidence < low) return "explore";
  
  // Low confidence: explore
  if (confidence < low) return "explore";
  
  // High confidence AND no warning signals: compound
  if (confidence > high && !artistBias.biased && !volatility.volatile) {
    return "compound";
  }
  
  // Medium confidence OR high confidence with warning signals: prune
  return "prune";
}

// NOTE: Cross-lane probes are QUARANTINED (experiments/cross-lane-probes.ts).
// probe_state.probes_shown and probe_state.flips will be empty in production.
// Use alternative ruggedness signals instead.

// Detect vector volatility — high variance in recent deltas suggests rugged taste
export function detectVectorVolatility(
  recentDeltas: Array<Record<string, number>>,
  threshold = 15,
): { volatile: boolean; avgMagnitude: number } {
  if (recentDeltas.length < 3) return { volatile: false, avgMagnitude: 0 };
  
  const magnitudes = recentDeltas.map(d => 
    Object.values(d).reduce((sum, v) => sum + Math.abs(v), 0)
  );
  const avgMagnitude = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  
  // Large swings between choices = rugged landscape
  return {
    volatile: avgMagnitude > threshold,
    avgMagnitude,
  };
}

// Detect decision hesitation — slow choices suggest uncertainty or engagement
export function detectDecisionHesitation(
  recentChoices: Array<{ ms_to_decide: number | null }>,
  slowThresholdMs = 8000,
): { hesitant: boolean; avgDecisionMs: number; slowCount: number } {
  const validChoices = recentChoices.filter(c => c.ms_to_decide != null);
  if (validChoices.length < 2) return { hesitant: false, avgDecisionMs: 0, slowCount: 0 };
  
  const times = validChoices.map(c => c.ms_to_decide!);
  const avgDecisionMs = times.reduce((a, b) => a + b, 0) / times.length;
  const slowCount = times.filter(t => t > slowThresholdMs).length;
  
  // Multiple slow decisions = engaged but uncertain (rugged landscape)
  return {
    hesitant: slowCount >= 2,
    avgDecisionMs,
    slowCount,
  };
}

// Extended input type to include choice history for ruggedness signals
export type MusicDNATerrainInput = {
  session: MusicDNASessionState;
  recentDeltas?: Array<Record<string, number>>; // From choice history
  recentChoices?: Array<{ ms_to_decide: number | null }>; // Decision times
  config?: typeof DEFAULT_CONFIG;
};

export function sessionToTerrain(input: MusicDNATerrainInput): TerrainProfile {
  const { session, recentDeltas = [], recentChoices = [], config = DEFAULT_CONFIG } = input;
  const { confidence } = calculateSessionConfidence(session, config.dims);
  const artistBias = detectArtistBias(session, config.artist_bias_threshold);
  const volatility = detectVectorVolatility(recentDeltas);
  const hesitation = detectDecisionHesitation(recentChoices);
  const { low, high } = config.confidence_thresholds;
  
  // Ruggedness signals (since probes are quarantined):
  // - High volatility = vector swinging wildly, taste landscape is complex
  // - Decision hesitation = user deliberating hard, choices are close/difficult
  const isRugged = volatility.volatile || hesitation.hesitant;
  
  return {
    // Always fast for A/B choices
    feedback_latency: "fast",
    
    // Can always show more pairings
    reversibility: "high",
    
    // Decreases as vector solidifies
    uncertainty: confidence < low ? "high" 
               : confidence < high ? "medium" 
               : "low",
    
    // Many songs available, many dimensions
    branching_factor: session.round < 5 ? "high" : "medium",
    
    // Single-user, no adversaries
    adversariality: "none",
    
    // Ruggedness from vector volatility or decision hesitation
    ruggedness: isRugged ? "high" : "medium",
    
    // Artist bias indicates risk of local minimum
    local_minima_risk: artistBias.biased ? "high" : "medium",
    
    // Each pairing is cheap to show
    information_cost: "low",
    
    // Single user, no coordination needed
    coordination_load: "low",
    
    // Taste is relatively stable within session
    environment_stability: "stable",
    
    // Iterative: multiple rounds
    time_horizon: "iterative",
    
    // Inferred from session state
    // FIXED (Gap 10.3): pass deltas/choices, not config, in positions 2 and 3
    mode_pressure: inferModePressure(session, recentDeltas, recentChoices, config),
  };
}

// Decay function for probe weight — never fully disables probes
// Probes are the only mechanism that recovers from wrong opening lane
function decayedProbeWeight(round: number, regime: SearchRegime): number {
  // Base probe weight by regime
  const baseWeight = regime === "explore" ? 1.0 
                   : regime === "prune" ? 0.7 
                   : 0.4; // compound — reduced but NOT zero
  
  // Decay over rounds, but floor at 0.2 (probes never fully off)
  const decay = Math.max(0.2, 1 - (round / 20));
  return baseWeight * decay;
}

export function regimeToPairingStrategy(
  regime: SearchRegime,
  session: MusicDNASessionState,
): PairingStrategy {
  // Base strategy preserves existing recognition mode logic
  const base: PairingStrategy = {
    axis_need_weight: 0.5,
    hypothesis_challenge_weight: 0.5,
    artist_diversity_weight: 0.3,
    
    // PRESERVED: Recognition mode from existing selectPairing
    // Bootstrap users need recognizable pairings regardless of regime
    recognition_mode: session.round < 3 ? "recognition_first" : "blended",
    recognition_boost: session.round < 5 ? 0.8 : 0.4,
    min_canon_floor: 0.3,
    
    // CHANGED: Decayed probe weight, never hard-disabled
    probe_weight: decayedProbeWeight(session.round, regime),
    
    min_diagnostic_weight: 30,
    max_pairings_per_dimension: 5,
  };
  
  switch (regime) {
    case "explore":
      return {
        ...base,
        axis_need_weight: 0.8,           // Favor uncertain dimensions
        hypothesis_challenge_weight: 0.2, // Don't challenge too hard yet
        artist_diversity_weight: 0.5,     // Encourage variety
        probe_weight: decayedProbeWeight(session.round, "explore"),
      };
    
    case "prune":
      return {
        ...base,
        axis_need_weight: 0.3,           // Focus on known dimensions
        hypothesis_challenge_weight: 0.9, // Challenge the hypothesis hard
        artist_diversity_weight: 0.4,
        probe_weight: decayedProbeWeight(session.round, "prune"),
      };
    
    case "compound":
      return {
        ...base,
        axis_need_weight: 0.2,           // Deepen existing signal
        hypothesis_challenge_weight: 0.3, // Light challenge
        artist_diversity_weight: 0.2,     // Allow some repeat artists
        // NOTE: probe_weight is reduced but NOT zero
        // Probes recover from wrong opening lane — don't lock users in
        probe_weight: decayedProbeWeight(session.round, "compound"),
      };
    
    case "coordinate":
      // Not applicable to Music DNA, fall back to explore
      return {
        ...base,
        axis_need_weight: 0.8,
        hypothesis_challenge_weight: 0.2,
        artist_diversity_weight: 0.5,
        probe_weight: decayedProbeWeight(session.round, "explore"),
      };
  }
}
```

### 1.3 Music DNA Regime Recommender

**Location:** `src/cognitive-router/integrations/musicdna-recommender.ts` (Agent Brain)

```typescript
import { scoreTerrain } from "../scoring.js";
import type { MusicDNATerrainInput, MusicDNARegimeRecommendation } from "./musicdna-types.js";
import { sessionToTerrain, regimeToPairingStrategy, calculateSessionConfidence } from "./musicdna-terrain-mapper.js";

export function recommendMusicDNARegime(
  input: MusicDNATerrainInput,
): MusicDNARegimeRecommendation {
  const terrain = sessionToTerrain(input);
  const recommendation = scoreTerrain(terrain);
  const { session } = input;
  const { confidence, confident_axes, total_axes } = calculateSessionConfidence(session);
  
  const rationale: string[] = [];
  
  // Build rationale
  rationale.push(`Round ${session.round}, confidence ${(confidence * 100).toFixed(0)}% (${confident_axes}/${total_axes} axes)`);
  
  if (terrain.uncertainty === "high") {
    rationale.push("Uncertainty is high — favoring exploration");
  } else if (terrain.uncertainty === "low") {
    rationale.push("Uncertainty is low — ready to compound");
  }
  
  if (terrain.local_minima_risk === "high") {
    rationale.push("Artist bias detected — adding exploration pressure");
  }
  
  // FIXED (Gap 10.5): ruggedness no longer comes from probes (quarantined)
  if (terrain.ruggedness === "high") {
    rationale.push("Vector volatility or decision hesitation — taste landscape is rugged");
  }
  
  // Add top scoring reasons
  const topReasons = recommendation.breakdown[0]?.reasons.slice(0, 3) ?? [];
  rationale.push(...topReasons);
  
  return {
    regime: recommendation.primary_regime,
    confidence: recommendation.confidence,
    terrain,
    rationale,
    transition_candidate: recommendation.transition_candidate,
    pairing_strategy: regimeToPairingStrategy(recommendation.primary_regime, session),
  };
}

// Convenience function for checking if regime should transition
export function shouldTransitionRegime(
  currentRegime: SearchRegime,
  input: MusicDNATerrainInput,
): { transition: boolean; to: SearchRegime | null; reason: string | null } {
  const rec = recommendMusicDNARegime(input);
  
  if (rec.transition_candidate && rec.transition_candidate !== currentRegime) {
    return {
      transition: true,
      to: rec.transition_candidate,
      reason: `Terrain suggests ${rec.transition_candidate}: ${rec.rationale.slice(-1)[0]}`,
    };
  }
  
  if (rec.regime !== currentRegime && rec.confidence > 0.7) {
    return {
      transition: true,
      to: rec.regime,
      reason: `High confidence recommendation: ${rec.regime} (${(rec.confidence * 100).toFixed(0)}%)`,
    };
  }
  
  return { transition: false, to: null, reason: null };
}
```

---

## Phase 2: Music DNA Integration (Estimated: 2-3 days)

### 2.1 Agent Brain Client in Music DNA

**Option A: Direct Import (if same monorepo or npm package)**

```typescript
// src/musicdna/engine/agent-brain-client.ts
import { 
  recommendMusicDNARegime, 
  shouldTransitionRegime,
  type MusicDNASessionState,
  type MusicDNARegimeRecommendation,
} from "@agent-brain/integrations/musicdna";

export { 
  recommendMusicDNARegime, 
  shouldTransitionRegime,
  type MusicDNASessionState,
  type MusicDNARegimeRecommendation,
};
```

**Option B: HTTP Client (if separate services)**

```typescript
// src/musicdna/adapters/agent-brain-client.ts
import type { MusicDNASessionState, MusicDNARegimeRecommendation } from "./agent-brain-types.js";

const AGENT_BRAIN_URL = process.env.AGENT_BRAIN_URL ?? "http://localhost:7399";
const AGENT_BRAIN_TOKEN = process.env.AGENT_BRAIN_BEARER_TOKEN;

export async function recommendMusicDNARegime(
  session: MusicDNASessionState,
): Promise<MusicDNARegimeRecommendation> {
  const res = await fetch(`${AGENT_BRAIN_URL}/v1/musicdna/recommend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(AGENT_BRAIN_TOKEN ? { Authorization: `Bearer ${AGENT_BRAIN_TOKEN}` } : {}),
    },
    body: JSON.stringify({ session }),
  });
  
  if (!res.ok) {
    throw new Error(`Agent Brain error: ${res.status}`);
  }
  
  return res.json();
}
```

### 2.2 Refactor Pairing Selection

> **Key principle:** Regime *composes with* existing logic, does not replace it. The existing `selectPairing` becomes the single implementation that takes `PairingStrategy` as input.

**Location:** `src/musicdna/engine/pairing.ts`

```typescript
// REFACTORED: selectPairing now takes optional PairingStrategy
// If no strategy provided, uses current hard-coded defaults (backward compatible)

import type { PairingStrategy } from "./agent-brain-types.js";

export type SelectPairingInput<P extends PairingCandidate> = {
  pool: P[];
  vector: Vector;
  used_ids: Set<string>;
  session_lane: Lane;
  dims: readonly string[];
  rng: Rng;
  round: number;
  // NEW: Optional strategy — if omitted, uses legacy defaults
  strategy?: PairingStrategy;
};

// Default strategy = current hard-coded behavior
function defaultStrategy(round: number): PairingStrategy {
  return {
    axis_need_weight: 0.5,
    hypothesis_challenge_weight: 1.5, // Current challengeBoost
    artist_diversity_weight: 0.3,
    recognition_mode: round < 3 ? "recognition_first" : "blended",
    recognition_boost: round < 5 ? 0.8 : 0.4,
    min_canon_floor: 0.3,
    probe_weight: 1.0, // Current: probes always enabled
    min_diagnostic_weight: 30,
    max_pairings_per_dimension: 5,
  };
}

export function selectPairing<P extends PairingCandidate>(
  input: SelectPairingInput<P>,
): SelectPairingResult<P> {
  const { pool, vector, used_ids, dims, rng, round } = input;
  const strategy = input.strategy ?? defaultStrategy(round);
  
  // 1. Filter used pairings
  let candidates = pool.filter((p) => !used_ids.has(p.id));
  if (!candidates.length) return { kind: "empty" };
  
  // 2. PRESERVED: Recognition mode logic (critical for bootstrap users)
  if (strategy.recognition_mode === "recognition_first") {
    const recognizable = candidates.filter(isRecognizable);
    if (recognizable.length > 0) candidates = recognizable;
  }
  
  // 3. Filter same-artist if strategy wants diversity
  if (strategy.artist_diversity_weight > 0.3) {
    const diverse = candidates.filter(differentArtist);
    if (diverse.length > 0) candidates = diverse;
  }
  
  // 4. Calculate axis need (favor uncertain dimensions)
  const need = (dim: string) => 1 / (1 + Math.abs(vector[dim] ?? 0));
  
  // 5. Find hypothesis-challenging axes
  const leaningAxes = new Set(
    dims
      .map((d) => ({ d, v: Math.abs(vector[d] ?? 0) }))
      .filter((x) => x.v >= 15)
      .sort((a, b) => b.v - a.v)
      .slice(0, 3)
      .map((x) => x.d),
  );
  
  // 6. Score each pairing using strategy weights
  const scored = candidates.map((p) => {
    const tests = (p.tests?.length ? p.tests : dims.slice()) as string[];
    
    // Axis need component
    const axisNeed = tests.reduce((s, d) => s + need(d), 0) / Math.max(1, tests.length);
    
    // Hypothesis challenge component
    const challengesHypothesis = leaningAxes.size > 0 && tests.some((t) => leaningAxes.has(t));
    const challengeScore = challengesHypothesis ? 1.0 : 0.0;
    
    // PRESERVED: Recognition boost for blended mode
    const recognitionScore = strategy.recognition_mode === "blended" && isRecognizable(p)
      ? strategy.recognition_boost
      : 0;
    
    // PRESERVED: Canon floor
    const canonScore = isCanonSong(p) ? strategy.min_canon_floor : 0;
    
    // Combined score using strategy weights
    const w = (
      strategy.axis_need_weight * axisNeed +
      strategy.hypothesis_challenge_weight * challengeScore +
      recognitionScore +
      canonScore
    ) * ((p.diagnostic_weight || 50) / 100);
    
    return { p, w };
  });
  
  // 7. Weighted random selection
  const total = scored.reduce((s, x) => s + x.w, 0);
  let r = rng.next() * total;
  const pick = scored.find((x) => (r -= x.w) <= 0) ?? scored[0];
  
  return { kind: "picked", pairing: pick.p };
}
```

**Migration path:**
1. Refactor existing `selectPairing` to take optional `strategy` param
2. Default strategy = current hard-coded values (behavior unchanged)
3. Add golden fixture test to confirm identical output
4. Only then wire terrain mapper as strategy source

### 2.3 Update Session Flow

**Location:** `src/lib/musicdna.functions.ts`

```typescript
// Add regime tracking to session

// In startSessionImpl:
export async function startSessionImpl(supabase: AuthedSupabase, userId: string) {
  // ... existing code ...
  
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      vector: seed.seed_vector,
      lane: seed.lane,
      lane_confidence: seed.lane_confidence,
      probe_candidate_lanes: seed.probe_candidate_lanes,
      probe_state: { probes_shown: [], pending: {}, lane_alignment: {}, flips: [] },
      // NEW: regime tracking
      current_regime: "explore",
      regime_log: [{ round: 0, regime: "explore", reason: "initial" }],
    })
    .select("id")
    .single();
  
  // ...
}

// In nextPairingImpl:
export async function nextPairingImpl(supabase: AuthedSupabase, data: { sessionId: string }) {
  // ... load session ...
  
  // NEW: Get regime recommendation
  const sessionState: MusicDNASessionState = {
    session_id: data.sessionId,
    round: usedRes.data?.length ?? 0,
    vector: sessionRes.data?.vector ?? {},
    lane: sessionLane,
    lane_confidence: sessionRes.data?.lane_confidence ?? 0,
    probe_state: probeState,
    used_pairing_ids: usedIds,
  };
  
  const regimeRec = recommendMusicDNARegime({ session: sessionState });
  const currentRegime = sessionRes.data?.current_regime ?? "explore";
  
  // Check for transition
  const transition = shouldTransitionRegime(currentRegime, { session: sessionState });
  const activeRegime = transition.transition ? transition.to! : currentRegime;
  
  if (transition.transition) {
    // Log transition
    await supabase.from("sessions").update({
      current_regime: activeRegime,
      regime_log: [...(sessionRes.data?.regime_log ?? []), {
        round: sessionState.round,
        regime: activeRegime,
        reason: transition.reason,
      }],
    }).eq("id", data.sessionId);
  }
  
  // Use regime-aware pairing selection
  const result = selectPairingWithStrategy({
    pool: pairingPool,
    vector: sessionState.vector,
    used_ids: new Set(usedIds),
    session_lane: sessionLane,
    dims: DIMS,
    rng: { next: Math.random },
    strategy: regimeRec.pairing_strategy,
  });
  
  // ... rest of function ...
}
```

### 2.4 Database Schema Updates

```sql
-- Add current regime to sessions (single value, not array)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS current_regime TEXT DEFAULT 'explore';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS routing_mode TEXT DEFAULT 'legacy';

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_sessions_regime ON sessions(current_regime);
CREATE INDEX IF NOT EXISTS idx_sessions_routing_mode ON sessions(routing_mode);

-- CHANGED: Use append-only table instead of JSONB array on sessions
-- Avoids lost-update races when nextPairing called in parallel (mobile + web tabs)
CREATE TABLE IF NOT EXISTS regime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  regime TEXT NOT NULL,
  previous_regime TEXT,
  trigger TEXT NOT NULL, -- 'initial' | 'confidence' | 'artist_bias' | 'probe_disagreement' | 'escape'
  terrain_snapshot JSONB, -- Optional: full terrain at transition time
  rationale TEXT[]
);

CREATE INDEX idx_regime_events_session ON regime_events(session_id);
CREATE INDEX idx_regime_events_created ON regime_events(created_at);
```

### 2.5 Edge Cases: Escape Transition and Round Cap

Per owner feedback, add safety valves for stuck users.

> **SUPERSEDED BY GAP 13.** The constants below assume a 12–18 round session. The shipped web product is **6 rounds** (`onboarding.tsx:35`), so `ESCAPE_ROUND = 15` and `MAX_ROUNDS = 18` are dead code — they are 2.5–3× the entire session. Re-scale these to the reconciled budget from Step −1 before implementing. For a 6-round session the escape valve belongs around round 4.

```typescript
// In nextPairingImpl, after regime recommendation
// NOTE: these values are placeholders pending the Gap 13 round-budget decision

const MAX_ROUNDS = 18;   // WRONG for a 6-round product
const ESCAPE_ROUND = 15; // WRONG for a 6-round product

// Hard cap: stop session at round 18
if (session.round >= MAX_ROUNDS) {
  return { kind: "force_complete", reason: "max_rounds_reached" };
}

// Escape transition: user stuck at low confidence past round 15
if (session.round >= ESCAPE_ROUND && confidence < 0.4) {
  // Force a probe from the strongest disagreeing lane
  const escapeRegime = "explore";
  const escapeLane = findStrongestDisagreeingLane(session);
  
  await recordRegimeEvent({
    session_id: session.id,
    round: session.round,
    regime: escapeRegime,
    previous_regime: currentRegime,
    trigger: "escape",
    rationale: [`Stuck at ${(confidence * 100).toFixed(0)}% confidence past round ${ESCAPE_ROUND}`],
  });
  
  // Force probe from escape lane
  return selectPairingFromLane(escapeLane, { ...input, strategy: exploreStrategy });
}
```

---

## Phase 2.5: Feature Flag Infrastructure (Critical for Safe Rollout)

Before enabling Agent Brain routing in production, Music DNA needs feature flag infrastructure to safely A/B test the integration without risking the existing working system.

### Why Feature Flags, Not Forking

| Approach | Pros | Cons |
|----------|------|------|
| **Fork/Branch** | Complete isolation | Merge conflicts, code drift, double maintenance, hard to compare |
| **Feature Flag** | Same codebase, real A/B testing, instant rollback, measurable | Slightly more code complexity |

**Recommendation: Use feature flags.** This keeps one codebase, allows true randomized A/B testing, and makes rollback trivial.

### 2.5.1 Routing Mode Configuration

**Location:** `src/musicdna/engine/config.ts` (Music DNA)

```typescript
export type RoutingMode = "legacy" | "agent-brain" | "shadow";

export type RoutingConfig = {
  mode: RoutingMode;
  rollout_percent: number;  // 0-100, for gradual rollout
  shadow_log_enabled: boolean;
};

// Environment-driven configuration
export function getRoutingConfig(): RoutingConfig {
  return {
    mode: (process.env.MUSICDNA_ROUTING_MODE as RoutingMode) ?? "legacy",
    rollout_percent: Number(process.env.AGENT_BRAIN_ROLLOUT_PERCENT ?? 0),
    shadow_log_enabled: process.env.AGENT_BRAIN_SHADOW_LOG === "true",
  };
}

// Deterministic assignment based on session ID (consistent across requests)
function hashSessionId(sessionId: string): number {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    const char = sessionId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}

export function getRoutingModeForSession(sessionId: string): RoutingMode {
  const config = getRoutingConfig();
  
  // Explicit mode override
  if (config.mode === "legacy" || config.mode === "shadow") {
    return config.mode;
  }
  
  // Percentage-based rollout for "agent-brain" mode
  if (config.mode === "agent-brain") {
    const bucket = hashSessionId(sessionId);
    if (bucket < config.rollout_percent) {
      return "agent-brain";
    }
    return "legacy";
  }
  
  return "legacy";
}
```

### 2.5.2 Routing Mode Branch Point

**Location:** `src/musicdna/engine/pairing.ts` (Music DNA)

Rename existing `selectPairing` to `selectPairingLegacy`, then create a router:

```typescript
import { selectPairingLegacy } from "./pairing-legacy.js";
import { selectPairingWithStrategy } from "./pairing-agent-brain.js";
import { recommendMusicDNARegime } from "./agent-brain-client.js";
import { getRoutingModeForSession, getRoutingConfig } from "./config.js";

export type SelectPairingResult<P> = 
  | { kind: "picked"; pairing: P; routing_mode: RoutingMode; regime?: SearchRegime }
  | { kind: "empty" };

export function selectPairing<P extends PairingCandidate>(
  input: SelectPairingInput<P>,
): SelectPairingResult<P> {
  const mode = getRoutingModeForSession(input.session_id);
  const config = getRoutingConfig();
  
  // LEGACY MODE: Use existing hard-coded logic
  if (mode === "legacy") {
    const result = selectPairingLegacy(input);
    if (result.kind === "empty") return result;
    
    // Shadow logging: compute what Agent Brain WOULD have done
    if (config.shadow_log_enabled) {
      try {
        const shadowRec = recommendMusicDNARegime({ session: input.session });
        logShadowComparison({
          session_id: input.session_id,
          round: input.session.round,
          legacy_pairing_id: result.pairing.id,
          shadow_regime: shadowRec.regime,
          shadow_strategy: shadowRec.pairing_strategy,
        });
      } catch (e) {
        // Shadow logging should never break the main flow
        console.warn("[shadow] Agent Brain recommendation failed:", e);
      }
    }
    
    return { ...result, routing_mode: "legacy" };
  }
  
  // SHADOW MODE: Use legacy but log both
  if (mode === "shadow") {
    const legacyResult = selectPairingLegacy(input);
    
    try {
      const regimeRec = recommendMusicDNARegime({ session: input.session });
      const agentBrainResult = selectPairingWithStrategy({
        ...input,
        strategy: regimeRec.pairing_strategy,
      });
      
      logShadowComparison({
        session_id: input.session_id,
        round: input.session.round,
        legacy_pairing_id: legacyResult.kind === "picked" ? legacyResult.pairing.id : null,
        agent_brain_pairing_id: agentBrainResult.kind === "picked" ? agentBrainResult.pairing.id : null,
        regime: regimeRec.regime,
        would_differ: legacyResult.kind === "picked" && agentBrainResult.kind === "picked" 
          && legacyResult.pairing.id !== agentBrainResult.pairing.id,
      });
    } catch (e) {
      console.warn("[shadow] Agent Brain comparison failed:", e);
    }
    
    // Always return legacy result in shadow mode
    if (legacyResult.kind === "empty") return legacyResult;
    return { ...legacyResult, routing_mode: "shadow" };
  }
  
  // AGENT-BRAIN MODE: Use Agent Brain routing
  try {
    const regimeRec = recommendMusicDNARegime({ session: input.session });
    const result = selectPairingWithStrategy({
      ...input,
      strategy: regimeRec.pairing_strategy,
    });
    
    if (result.kind === "empty") return result;
    return { 
      ...result, 
      routing_mode: "agent-brain",
      regime: regimeRec.regime,
    };
  } catch (e) {
    // Fallback to legacy if Agent Brain fails
    console.error("[agent-brain] Recommendation failed, falling back to legacy:", e);
    const fallback = selectPairingLegacy(input);
    if (fallback.kind === "empty") return fallback;
    return { ...fallback, routing_mode: "legacy" };
  }
}
```

### 2.5.3 Shadow Comparison Logging

**Location:** `src/musicdna/engine/shadow-logger.ts` (Music DNA)

```typescript
import type { SearchRegime } from "./agent-brain-types.js";
import type { PairingStrategy } from "./agent-brain-types.js";

export type ShadowComparisonLog = {
  timestamp: string;
  session_id: string;
  round: number;
  legacy_pairing_id: string | null;
  agent_brain_pairing_id?: string | null;
  shadow_regime?: SearchRegime;
  regime?: SearchRegime;
  shadow_strategy?: PairingStrategy;
  would_differ?: boolean;
};

export function logShadowComparison(log: Omit<ShadowComparisonLog, "timestamp">): void {
  const entry: ShadowComparisonLog = {
    ...log,
    timestamp: new Date().toISOString(),
  };
  
  // Option 1: Console log (for development)
  console.log("[shadow-comparison]", JSON.stringify(entry));
  
  // Option 2: Write to analytics table (for production)
  // This would be an async fire-and-forget call
  // supabase.from("shadow_comparisons").insert(entry).then(() => {}).catch(() => {});
}
```

### 2.5.4 Analytics Event Enhancement

Update existing analytics events to include routing mode:

```typescript
// In choice recording / pairing shown events
await logEvent("pairing_shown", {
  session_id: sessionId,
  pairing_id: pairing.id,
  round: round,
  // NEW FIELDS
  routing_mode: result.routing_mode,  // "legacy" | "agent-brain" | "shadow"
  regime: result.regime ?? null,       // "explore" | "prune" | "compound" | null
});

await logEvent("choice_made", {
  session_id: sessionId,
  pairing_id: pairingId,
  chosen_song_id: chosenId,
  ms_to_decide: decisionTimeMs,
  // NEW FIELDS
  routing_mode: sessionRoutingMode,
  regime: sessionCurrentRegime,
});

await logEvent("session_completed", {
  session_id: sessionId,
  archetype_id: archetypeId,
  archetype_confidence: confidence,
  rounds: totalRounds,
  // NEW FIELDS
  routing_mode: sessionRoutingMode,
  regime_sequence: regimeLog,  // Array of regime transitions
});
```

### 2.5.5 Database Schema for A/B Analytics

```sql
-- Shadow comparison logs (for shadow mode analysis)
CREATE TABLE IF NOT EXISTS shadow_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID REFERENCES sessions(id),
  round INTEGER NOT NULL,
  legacy_pairing_id UUID,
  agent_brain_pairing_id UUID,
  regime TEXT,
  would_differ BOOLEAN,
  strategy JSONB
);

CREATE INDEX idx_shadow_comparisons_session ON shadow_comparisons(session_id);
CREATE INDEX idx_shadow_comparisons_created ON shadow_comparisons(created_at);

-- Add routing tracking to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS routing_mode TEXT DEFAULT 'legacy';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS current_regime TEXT DEFAULT 'explore';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS regime_log JSONB DEFAULT '[]'::jsonb;

-- Index for A/B analysis
CREATE INDEX IF NOT EXISTS idx_sessions_routing_mode ON sessions(routing_mode);
```

### 2.5.6 Environment Variables

| Variable | Values | Default | Purpose |
|----------|--------|---------|---------|
| `MUSICDNA_ROUTING_MODE` | `legacy`, `shadow`, `agent-brain` | `legacy` | Master routing mode |
| `AGENT_BRAIN_ROLLOUT_PERCENT` | `0-100` | `0` | % of sessions using Agent Brain when mode is `agent-brain` |
| `AGENT_BRAIN_SHADOW_LOG` | `true`, `false` | `false` | Enable shadow logging in legacy mode |
| `AGENT_BRAIN_URL` | URL | `http://localhost:7399` | Agent Brain service URL (if using HTTP) |
| `AGENT_BRAIN_BEARER_TOKEN` | string | — | Auth token for Agent Brain API |

> **SSR Warning:** On this stack, env vars must be read **inside the handler**, not at module scope, or SSR prerender breaks. Same rule as `LOVABLE_API_KEY`.

```typescript
// WRONG — breaks SSR prerender
const AGENT_BRAIN_URL = process.env.AGENT_BRAIN_URL;

export async function recommendRegime(session) {
  const res = await fetch(AGENT_BRAIN_URL, ...); // URL is undefined during prerender
}

// CORRECT — read inside handler
export async function recommendRegime(session) {
  const url = process.env.AGENT_BRAIN_URL ?? "http://localhost:7399";
  const res = await fetch(url, ...);
}
```

---

## Phase 2.6: Rollout Strategy (Detailed)

### Stage 0: Pre-Integration Baseline (1 week)

**Before any code changes**, establish baseline metrics:

```sql
-- Capture baseline metrics
SELECT 
  COUNT(*) as total_sessions,
  AVG(archetype_confidence) as avg_confidence,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) * 100.0 / COUNT(*) as completion_rate,
  AVG(rounds) as avg_rounds
FROM sessions
WHERE started_at > NOW() - INTERVAL '7 days';
```

Document these numbers — they're your comparison baseline.

### Stage 1: Shadow Mode (1-2 weeks)

**Config:**
```bash
MUSICDNA_ROUTING_MODE=shadow
AGENT_BRAIN_SHADOW_LOG=true
```

**What happens:**
- All users get legacy behavior (no risk)
- Agent Brain recommendations are computed but not used
- Both paths are logged for comparison

**Analysis queries:**
```sql
-- How often would Agent Brain pick differently?
SELECT 
  DATE(created_at) as day,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE would_differ) as would_differ,
  ROUND(COUNT(*) FILTER (WHERE would_differ) * 100.0 / COUNT(*), 1) as differ_pct
FROM shadow_comparisons
GROUP BY DATE(created_at)
ORDER BY day;

-- Regime distribution in shadow mode
SELECT 
  regime,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as pct
FROM shadow_comparisons
WHERE regime IS NOT NULL
GROUP BY regime;
```

**Exit criteria:**
- [ ] No errors in Agent Brain recommendations
- [ ] Shadow logging working correctly
- [ ] Understand how often Agent Brain would differ (expect 20-40%)

### Stage 2: Canary (1 week)

**Config:**
```bash
MUSICDNA_ROUTING_MODE=agent-brain
AGENT_BRAIN_ROLLOUT_PERCENT=5
```

**What happens:**
- 5% of sessions use Agent Brain routing
- 95% use legacy
- Both are logged with `routing_mode` field

**Monitoring:**
```sql
-- Compare outcomes by routing mode
SELECT 
  routing_mode,
  COUNT(*) as sessions,
  AVG(archetype_confidence) as avg_confidence,
  AVG(rounds) as avg_rounds,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) * 100.0 / COUNT(*) as completion_rate
FROM sessions
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY routing_mode;
```

**Exit criteria:**
- [ ] No increase in errors
- [ ] No significant drop in completion rate
- [ ] Agent Brain sessions complete successfully

### Stage 3: A/B Test (2-3 weeks)

**Config:**
```bash
MUSICDNA_ROUTING_MODE=agent-brain
AGENT_BRAIN_ROLLOUT_PERCENT=50
```

**What happens:**
- 50/50 split between legacy and Agent Brain
- Enough volume for statistical significance

**Statistical analysis:**
```sql
-- Detailed A/B comparison
WITH session_metrics AS (
  SELECT 
    routing_mode,
    archetype_confidence,
    rounds,
    EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds,
    completed_at IS NOT NULL as completed
  FROM sessions
  WHERE started_at > NOW() - INTERVAL '14 days'
    AND routing_mode IN ('legacy', 'agent-brain')
)
SELECT 
  routing_mode,
  COUNT(*) as n,
  
  -- Confidence
  AVG(archetype_confidence) as avg_confidence,
  STDDEV(archetype_confidence) as stddev_confidence,
  
  -- Rounds
  AVG(rounds) as avg_rounds,
  STDDEV(rounds) as stddev_rounds,
  
  -- Completion
  AVG(completed::int) * 100 as completion_rate,
  
  -- Duration
  AVG(duration_seconds) as avg_duration
FROM session_metrics
GROUP BY routing_mode;
```

**Decision framework:**

| Metric | Legacy | Agent Brain | Winner | Action |
|--------|--------|-------------|--------|--------|
| Archetype confidence | X | X+10% | Agent Brain | Proceed |
| Completion rate | X | X-5% | Legacy | Investigate |
| Avg rounds | 14 | 12 | Agent Brain | Proceed |

**Exit criteria:**
- [ ] Statistical significance (p < 0.05) on primary metric
- [ ] No significant regressions on any metric
- [ ] At least 500 sessions per group

### Stage 4: Full Rollout

**Config:**
```bash
MUSICDNA_ROUTING_MODE=agent-brain
AGENT_BRAIN_ROLLOUT_PERCENT=100
```

**What happens:**
- All sessions use Agent Brain
- Legacy code path remains for emergency rollback

**Ongoing monitoring:**
- Daily dashboard comparing to baseline
- Alerting on metric regressions
- Keep shadow comparison data for debugging

### Emergency Rollback

If issues arise at any stage:

```bash
# Instant rollback - no deployment needed
MUSICDNA_ROUTING_MODE=legacy
AGENT_BRAIN_ROLLOUT_PERCENT=0
```

This immediately reverts all sessions to legacy behavior.

---

## Phase 3: Telemetry & Learning (Future)

### 3.1 Outcome Recording

After session completion, record outcome metrics:

```typescript
type SessionOutcome = {
  session_id: string;
  regime_sequence: Array<{ round: number; regime: string }>;
  
  // Quality metrics
  archetype_confidence: number;  // Cosine score of final archetype match
  rounds_to_completion: number;
  user_satisfaction?: number;    // If collected
  
  // Efficiency metrics
  probe_flip_count: number;
  wasted_pairings: number;       // Pairings where user was indifferent
  
  // Behavioral metrics
  avg_decision_time_ms: number;
  decision_time_trend: "faster" | "stable" | "slower";
};
```

### 3.2 Learning Loop (AB-6)

Long-term: use outcome data to improve regime selection:

1. Cluster sessions by outcome quality
2. Identify regime sequences that correlate with good outcomes
3. Adjust terrain weights based on what works

---

## Phase 4: Testing

### 4.1 Unit Tests

```typescript
// Test terrain mapper
describe("sessionToTerrain", () => {
  it("maps empty session to high uncertainty", () => {
    const session = createEmptySession();
    const terrain = sessionToTerrain({ session });
    expect(terrain.uncertainty).toBe("high");
  });
  
  it("maps confident session to low uncertainty", () => {
    const session = createConfidentSession();
    const terrain = sessionToTerrain({ session });
    expect(terrain.uncertainty).toBe("low");
  });
  
  it("detects artist bias", () => {
    const session = createSessionWithArtistBias("Radiohead", 5);
    const terrain = sessionToTerrain({ session });
    expect(terrain.local_minima_risk).toBe("high");
  });
});

// Test regime recommendations
describe("recommendMusicDNARegime", () => {
  it("recommends explore for early rounds", () => {
    const session = createSession({ round: 2 });
    const rec = recommendMusicDNARegime({ session });
    expect(rec.regime).toBe("explore");
  });
  
  it("recommends prune for medium confidence", () => {
    const session = createSession({ round: 8, confidence: 0.5 });
    const rec = recommendMusicDNARegime({ session });
    expect(rec.regime).toBe("prune");
  });
  
  it("recommends compound for high confidence", () => {
    const session = createSession({ round: 12, confidence: 0.8 });
    const rec = recommendMusicDNARegime({ session });
    expect(rec.regime).toBe("compound");
  });
});
```

### 4.2 Integration Tests

```typescript
describe("Full session flow with regime routing", () => {
  it("transitions explore → prune → compound", async () => {
    const session = await startSession(userId);
    
    // Early rounds: explore
    for (let i = 0; i < 4; i++) {
      const pairing = await nextPairing(session.id);
      expect(pairing.regime).toBe("explore");
      await recordChoice(session.id, pairing, /* choice */);
    }
    
    // Middle rounds: prune
    for (let i = 0; i < 4; i++) {
      const pairing = await nextPairing(session.id);
      expect(pairing.regime).toBe("prune");
      await recordChoice(session.id, pairing, /* choice */);
    }
    
    // Late rounds: compound
    for (let i = 0; i < 4; i++) {
      const pairing = await nextPairing(session.id);
      expect(pairing.regime).toBe("compound");
      await recordChoice(session.id, pairing, /* choice */);
    }
  });
});
```

---

## Recommended Priority Ordering (per Owner Feedback)

> **"The plan is currently ~30% too eager to replace working logic. Fold regime into the existing selector as a weight source, don't fork a parallel one."**

### Step 1: Ship Telemetry First (2 weeks)

Log terrain + confidence + regime **without changing the selector**.

```typescript
// In nextPairingImpl, BEFORE selectPairing call
const terrain = sessionToTerrain({ session });
const regimeRec = recommendMusicDNARegime({ session });

// Log for shadow analysis — does NOT affect pairing selection
await logShadowRecommendation({
  session_id: session.id,
  round: session.round,
  terrain,
  recommended_regime: regimeRec.regime,
  confidence: regimeRec.confidence,
});

// Continue with existing selectPairing (unchanged)
const pairing = selectPairing(input);
```

Two weeks of shadow data is worth more than any theoretical plan.

### Step 2: Refactor selectPairing to Take PairingStrategy

Wire current hard-coded values as the default strategy:

```typescript
// Before: magic numbers scattered
const challengeBoost = 1.5;
const axisConf = 30;

// After: strategy param with same defaults
const strategy = input.strategy ?? {
  hypothesis_challenge_weight: 1.5,
  // ... same values as before
};
```

**Confirm identical behavior** via golden fixture test before proceeding.

### Step 3: Only Then Wire Terrain Mapper as Strategy Source

Once Step 2 is validated:
- Shadow mode: compute strategy from terrain, log comparison
- Canary: 5% traffic uses terrain-derived strategy
- A/B: 50% traffic
- Full: 100% traffic

---

## Rollout Plan Summary

> **See Phase 2.5 and Phase 2.6 above for detailed implementation.**

| Stage | Duration | Config | Traffic |
|-------|----------|--------|---------|
| **0. Baseline** | 1 week | No changes | Measure current metrics |
| **1. Telemetry** | 2 weeks | Log terrain/regime, don't use | 0% behavior change |
| **2. Refactor** | 1 week | `selectPairing` takes strategy param | 0% behavior change (golden test) |
| **3. Shadow** | 1-2 weeks | `ROUTING_MODE=shadow` | 0% Agent Brain (log comparison) |
| **4. Canary** | 1 week | `ROLLOUT_PERCENT=5` | 5% Agent Brain |
| **5. A/B Test** | 2-3 weeks | `ROLLOUT_PERCENT=50` | 50% Agent Brain |
| **6. Full Rollout** | — | `ROLLOUT_PERCENT=100` | 100% Agent Brain |

**Key principle:** Legacy code path remains intact throughout. Rollback is instant via environment variable.

---

## Success Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| Archetype confidence (avg) | TBD | +10% |
| Rounds to completion (avg) | ~14 | ~12 |
| Session completion rate | TBD | +5% |
| Probe flip rate | TBD | Stable |

---

## Open Questions (Resolved per Owner Feedback)

1. **Should regime be visible to user?**  
   **Decision: No.** Keep it internal. The Rolling Stone voice already conveys the shift ("early read" → "you keep coming back to…" → verdict). Exposing "prune mode" breaks the critic illusion.

2. **How to handle edge cases?**  
   **Decision: Implemented.**
   - Escape transition for users stuck at low confidence past round 15 — force probe from strongest disagreeing lane
   - Hard cap at round 18
   - See Section 2.5 for implementation

3. **Per-lane regime weights?**  
   **Decision: Not now.** Ship one global weight table, learn from telemetry, split only if data justifies it. Premature optimization otherwise.

4. **LLM involvement?**  
   **Decision: No direct mention.** Same reason as (1) — breaks illusion. But: wire regime confidence into the hedge selector. The Critic's hedge tier should be a function of regime confidence, which is close to what `fit_tier` already does. This is a natural extension, not a new concept.

---

## Flutter / Mobile App Compatibility

The Music DNA Flutter app communicates with the backend via API. The feature flag approach is **entirely server-side**, meaning:

### No Flutter Changes Required

- Flutter app calls the same API endpoints
- Server decides which routing logic to use
- `routing_mode` and `regime` can be returned in API responses if the app wants to display them

### Optional: Surface Regime in UI

If you want to show the user what mode they're in (for transparency or UX enhancement):

```dart
// In pairing response
class PairingResponse {
  final String pairingId;
  final Song songA;
  final Song songB;
  final String? routingMode;  // "legacy" | "agent-brain"
  final String? regime;        // "explore" | "prune" | "compound"
}

// Could display subtle UI hints
if (response.regime == "prune") {
  showHint("Testing your hypothesis...");
} else if (response.regime == "compound") {
  showHint("Deepening your profile...");
}
```

This is optional and can be added later after the backend integration is validated.

---

## Architecture Decision: Where the Terrain Mapper Lives

### Decision: In Agent Brain (as an SDK/Integration)

The Music DNA terrain mapper will be built **inside Agent Brain** at `src/integrations/musicdna/`.

**Rationale:**

1. **Reference implementation** — Shows other projects how to integrate
2. **Co-versioned** — Mapper evolves with the scoring engine
3. **Testable** — Can run mapper + scorer tests together
4. **Reusable pattern** — Template for other integrations

### Implications for Future Projects

Every project that wants to use Agent Brain needs its own terrain mapper:

```
agent-brain/
├── src/
│   ├── cognitive-router/     # Core engine (universal)
│   └── integrations/
│       ├── musicdna/         # Music DNA mapper (this project)
│       ├── debugging/        # Already exists (eval harness)
│       └── template/         # Starter for new projects
```

The terrain mapper is the **integration contract** — it translates your domain into Agent Brain's universal terrain vocabulary.

---

## Document History

- **2026-07-25** — Initial integration plan drafted
- **2026-07-25** — Added Phase 2.5 (Feature Flag Infrastructure) and Phase 2.6 (Detailed Rollout Strategy)
- **2026-07-25** — Added Flutter compatibility notes and architecture decision on terrain mapper location
- **2026-07-25** — **Major revision per owner feedback:**
  - Fixed: Recognition mode preserved (not dropped)
  - Fixed: Round-based mode_pressure removed (was tautology)
  - Fixed: Probe flips → ruggedness inverted (disagreement = rugged, flip = reset)
  - Fixed: Compound doesn't hard-disable probes (uses decayed weight)
  - Fixed: regime_log uses append-only table (not JSONB array on hot row)
  - Fixed: env vars read inside handler (SSR prerender)
  - Added: Escape transition at round 15, hard cap at 18
  - Added: Recommended priority ordering (telemetry first)
  - Resolved: All open questions decided
- **2026-07-25** — **Pre-implementation gap analysis** against `music-dna@ef3d6b6` and `agent-brain/src/cognitive-router`:
  - Gap 1: `SelectionMode` too coarse — added `PairingKnobs` naming the seven real literals in `selectPairing`
  - Gap 2: hand-scored the weight table — constant terrain fields give explore a structural +8/+5/+5/0 baseline, and `mode_pressure` (+4) makes `scoreTerrain` a near pass-through
  - Gap 3: three of four transition rules proven unreachable, including the `compound → explore` safety valve
  - Gap 4: the Skip feature was missing entirely — added `detectSkipPressure`
  - Gap 5: `artist_frequency` and `delta_vector` don't exist in the database
  - Gap 6: all analytics SQL referenced non-existent columns; `archetype_score` is a cosine, not a probability
  - Gap 7: `event_log.experiment_key`/`variant` already exist — drop the bespoke A/B infrastructure
  - Gap 8: new tables were missing RLS, GRANTs, and an ownership path
  - Gap 9: §2.2's rewrite silently dropped six pieces of shipped behavior
  - Gap 10: seven type/correctness errors fixed inline, incl. `ModePressure` vs `SearchRegime` conflation
  - Gap 11: `shouldStop` interaction left unspecified
  - Gap 12: API contract docs, test harness, and bootstrap early-return not accounted for
  - Added: revised sequencing with a Step 0 data-plumbing phase
  - Added: four decisions still needed before coding
- **2026-07-25** — **Second review round (Lovable feedback + verification):**
  - Gap 13: found three conflicting round budgets — the shipped web product is **6 rounds** (`onboarding.tsx:35`), not 12. This makes compound unreachable, `ESCAPE_ROUND`/`MAX_ROUNDS` dead code, and `STABILITY_CHECKPOINTS {8,10,12,14}` never fire. Added as the top blocker (Step −1)
  - Gap 14: regime must shape selection, never evidence gating. Documented the real thresholds (`MIN_SUPPORT = 2`, `MIN_CONFIDENCE = 0.55` — the "≥3 supporting / 0 contradicting" rule is a different surface) and added `axis_coverage` / `empty_reveal_rate` as rollout guardrails, the latter a hard rollback trigger
  - Gap 15: corrected the Stage 1 gate — `session.test.ts` never calls `selectPairing`; the golden fixture is `index.test.ts`, with `pairing.test.ts` as the direct contract test. Probe cadence is moot because cross-lane probes are quarantined; `probe_weight` should be dropped from `PairingKnobs`
  - Gap 16: defined concrete shadow exit criteria so shadow mode cannot run indefinitely
  - Noted that `finalizeSession` already computes artist bias (n ≥ 3) and snap-decision rate (<2000ms), which the mapper should reuse rather than duplicate
