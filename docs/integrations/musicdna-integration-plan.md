# MusicDNA × Agent Brain Integration Plan

**Status:** design, not started. Four decisions are open; one is a hard blocker.
**Verified against:** `acedge123/music-dna@ef3d6b6` and `The-Gig-Agency/agent-brain` (`src/cognitive-router/`).
**Scope:** wire Agent Brain's regime selection into MusicDNA's pairing selection, without changing the evidence layer or the critic voice.

This document supersedes all earlier drafts. Earlier versions were written against `acedge123/idea-builder`, which is a materially different codebase; where those drafts disagree with this one, this one is correct. Appendix B lists what changed and why.

---

## Summary

The integration is smaller than it first appeared, and one product fact constrains the whole thing: **the shipped web session is 6 rounds**, not the 12–18 earlier drafts assumed. At 6 rounds the `compound` regime is mathematically unreachable, which reduces this to an explore-vs-prune integration until the round budget is revisited.

The useful version of this work is:

1. Regime drives the **scoring knobs inside `selectPairing`** — not the `SelectionMode`, which is effectively constant per session.
2. Regime shapes **selection only**. It never touches evidence gating, `shouldStop`, or the critic.
3. Telemetry ships first, through `event_log`, which already has the columns needed.

Everything else is sequencing and guardrails.

---

## Part 1 — What is actually true today

Facts verified in the current codebase. Several contradict earlier drafts.

### Pairing selection

`selectPairing` (`src/musicdna/engine/pairing.ts`) is a filter-then-weighted-sample pipeline. In order: drop used and same-artist pairings, apply a recognition floor, hard-filter to the "fork pool" of pairings testing the axes the vector already leans on, then score and sample.

Its behavior is governed by seven hard-coded literals:

| Knob | Current value | Where |
|---|---|---|
| Recognition blend | `0.6` / `0.4` / `0` | `recogBlend`, derived from `mode` |
| Canon floor | `0` / `45` / `55` | `RECOGNITION_FLOORS` (0–100 scale) |
| Challenge boost | `1.5` | `challengeBoost` |
| Leaning-axis threshold | `15` | `leaningAxes` filter |
| Leaning-axis count | top `3` | `.slice(0, 3)` |
| Axis-need blend | `0.4 + 0.6 * axisNeed` | weight formula |
| Fork filter | always on when any axis > 15 | `forkPool` |

It returns a `selection_reason` object with the full scoring rationale, already documented in `docs/musicdna/instrumentation.md` and already carried in `pairing_shown.props`.

### Selection mode

`SelectionMode` is chosen in `nextPairingImpl` (~line 579) from lane, not round:

```typescript
const mode: SelectionMode =
  sessionLane === "general"
    ? "recognition_first"
    : laneConfidence < 0.6
      ? "recognition_boost"
      : "diagnostic_first";
```

`lane_confidence` is written once at session start and never updated, because the only mechanism that changed it mid-session — cross-lane probes — is quarantined. **Mode is therefore constant for the life of a session.**

### Cross-lane probes are off

`src/musicdna/engine/experiments/cross-lane-probes.ts` is quarantined with documented reactivation criteria. `PROBE_ROUNDS = {4, 9, 14}` is `void`ed, and `nextPairingImpl` throws if `probe_state.pending` is non-empty. Consequences: `probe_state.probes_shown` and `probe_state.flips` are always empty, and there is no probe schedule to tune.

### Skip is a live signal

`skipPairingImpl` handles "I don't know either of these." It adds the pairing to `probe_state.skipped_pairing_ids`, sets `wants_wider_probe`, and emits `pairing_skipped`. Skipped pairings are folded into `usedIds`, so **a skip advances `round` without moving the vector**.

### Round budget — three conflicting numbers

| Location | Limit | Reality |
|---|---|---|
| `src/routes/onboarding.tsx:35` | `MAX_ROUNDS = 6` | **This is the shipped web experience** |
| `pairing.ts` `shouldStop` | `min_rounds = 12` | Unreachable from web; the UI finalizes first |
| `src/routes/api/v1/e2e.test.ts:33` | `MAX_ROUNDS = 12` | Test harness disagrees with the product |

Six is deliberate. From `finalizeSession`:

> `// Tuned for 6-round adaptive test: 2 supporting choices on an axis is enough to call a tendency ... 0.55 keeps out pure noise without demanding 12 rounds.`

Knock-on effects, all verified:

- **`compound` is unreachable.** It requires `confidence > 0.7` — 7 of 10 axes at `|value| >= 30`. Each pairing moves only the axes in its `tests` array. Six rounds cannot get there.
- **`STABILITY_CHECKPOINTS = {8, 10, 12, 14}` never fire**, so the `archetype_ranking_snapshot` event described in `instrumentation.md` is never written for web sessions.
- Any escape valve at round 15 with a cap at 18 is dead code — 2.5–3× the whole session.

### Evidence gating

`finalizeSession` gates every user-visible claim:

```typescript
const MIN_SUPPORT = 2;       // supporting choices on an axis
const MIN_CONFIDENCE = 0.55;
```

When nothing clears the bar, the reveal falls back to *"Nothing cleared the evidence threshold this round."* With 6 rounds the ledger has very little slack — roughly three axes clear it in a good session.

`finalizeSession` also already derives two signals this integration would otherwise duplicate: artist bias (`n >= 3` winning songs by one artist) and snap-decision rate (`ms_to_decide < 2000`, flagged at ≥60% of choices).

> The "≥3 supporting, 0 contradicting" rule is a **different surface** — it governs `ShippedClaim` in the decade/subculture flow, not the main reveal.

### Agent Brain's scoring

`scoreTerrain` (`src/cognitive-router/scoring.ts`) sums a weight table over 12 terrain fields. Two properties matter here.

**`mode_pressure` is the heaviest single weight (+4).** A mapper that computes `mode_pressure` itself is therefore largely deciding the outcome before scoring runs.

**Nine of the twelve fields would be hard-coded constants for MusicDNA**, and those constants alone produce a fixed baseline before any session data is read:

| Constant field | explore | prune | compound | coordinate |
|---|---|---|---|---|
| `feedback_latency: fast` | +2 | +1 | | |
| `reversibility: high` | +2 | +1 | | |
| `adversariality: none` | | +1 | +1 | |
| `information_cost: low` | +2 | +1 | | |
| `coordination_load: low` | | +1 | +1 | |
| `environment_stability: stable` | | +1 | +2 | |
| `time_horizon: iterative` | +2 | | +1 | |
| **Baseline** | **+8** | **+5** | **+5** | **0** |

Explore starts +3 ahead. In practice `explore` can reach a margin of 13 (confidence clamps to 1.0) while `prune` and `compound` top out near margin 2 (confidence ≈ 0.56), so any confidence-gated logic is biased toward explore.

**Three of four transition rules cannot fire** with this terrain:

| Rule | Blocked by |
|---|---|
| `explore → prune` | needs `branching_factor: "high"`, which only holds for `round < 5` |
| `prune → compound` | works |
| `compound → explore` | needs `local_minima_risk: "high"`, but compound is only selected when artist bias is *absent* — mutually exclusive |
| `→ coordinate` | needs adversariality or coordination load, both constant at `none`/`low` |

The unreachable `compound → explore` rule is the safety valve for a user locked into compounding.

---

## Part 2 — Decisions to settle before writing code

### D1. The round budget (blocker)

Reconcile `onboarding.tsx` (6), `shouldStop` (12), and `e2e.test.ts` (12) to a single number, then re-scale every regime threshold to it.

If the answer is 6, say plainly that this is an **explore-vs-prune integration** and drop the three-regime lifecycle framing. If the intent is a longer session, that is a product change that must land before the mapper, not after.

Prefer expressing thresholds as fractions of the session budget so they survive a future change.

### D2. Is Agent Brain deciding, or confirming?

Given the `mode_pressure` weight and the constant-field baseline, `scoreTerrain` will largely echo whatever the mapper puts in `mode_pressure`. Either:

- **(a)** de-weight `mode_pressure` and let `uncertainty` / `ruggedness` / `local_minima_risk` carry the decision, or
- **(b)** stop hard-coding the nine constants and derive at least `information_cost`, `environment_stability`, and `branching_factor` from real session data.

Recommend both. Whichever is chosen, record the **predicted regime distribution** before shipping so shadow data can be checked against it.

### D3. May regime influence `shouldStop`?

Currently unspecified. If yes, "average rounds" stops being a clean rollout metric, because regime would be changing the very thing being measured. Recommend **no** for the first pass.

### D4. How to obtain `delta_vector`

`applyChoice` computes it but nothing persists it. Either add a `delta_vector JSONB` column to `choices` (cheap, recommended) or recompute per round by re-joining `song_axes` (expensive).

---

## Part 3 — The design

### Principle

> **Regime is a weight source for the existing selector. It shapes selection only — never evidence gating, never `shouldStop`, never the critic voice.**

This mirrors the framing already used in `instrumentation.md`: the engine's math is untouched.

### Regime → knobs

Regime drives the seven literals from Part 1, with defaults that are exactly today's values:

```typescript
export type PairingKnobs = {
  mode: SelectionMode;              // existing lever, preserved
  recog_blend: number;              // 0..1
  canon_floor: number;              // 0..100 — same scale as RECOGNITION_FLOORS
  challenge_boost: number;          // default 1.5
  leaning_axis_threshold: number;   // default 15
  leaning_axis_count: number;       // default 3
  axis_need_floor: number;          // default 0.4
  axis_need_span: number;           // default 0.6
  fork_filter: "hard" | "soft" | "off";
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

`fork_filter: "soft"` — weighting the fork pool instead of hard-filtering to it — is the highest-value explore lever, because the current hard filter collapses the pool as soon as any axis exceeds 15.

There is deliberately **no `probe_weight`**. Cross-lane probes are quarantined; a knob controlling a switched-off mechanism is noise.

### Selection mode mapping

Mode stays lane-driven. Regime only gets a say once the lane is settled:

```typescript
function regimeToSelectionMode(
  regime: SearchRegime,
  sessionLane: Lane,
  laneConfidence: number,
): SelectionMode {
  // Preserved: general-lane users need songs they recognize
  if (sessionLane === "general") return "recognition_first";
  if (laneConfidence < 0.6) return "recognition_boost";
  return regime === "explore" ? "recognition_boost" : "diagnostic_first";
}
```

### Terrain mapper

Lives in Agent Brain at `src/cognitive-router/integrations/musicdna/`, so it stays co-versioned with the scoring engine and serves as the reference implementation for future integrations.

```typescript
const DIMS = [
  "movement", "atmosphere", "immersion", "scale", "community",
  "perspective", "confidence", "tension", "texture", "transformation",
] as const;

export type MusicDNASessionState = {
  session_id: string;
  round: number;                    // = usedIds.size (choices + skips)
  vector: Record<string, number>;
  lane: string;
  lane_confidence: number;
  skipped_pairing_ids: string[];
  artist_frequency: Record<string, number>;  // derived, not a column
};

export type MusicDNATerrainInput = {
  session: MusicDNASessionState;
  recentDeltas?: Array<Record<string, number>>;
  recentChoices?: Array<{ ms_to_decide: number | null }>;
  config?: MapperConfig;
};
```

Signals. Thresholds marked *(shared)* must reuse the definitions already in `finalizeSession` rather than redeclaring them.

```typescript
// Axis confidence — mirrors shouldStop's axis_confidence_threshold of 30
export function sessionConfidence(vector: Record<string, number>) {
  const confident = DIMS.filter((d) => Math.abs(vector[d] ?? 0) >= 30).length;
  return { confidence: confident / DIMS.length, confident_axes: confident };
}

// (shared) finalizeSession flags artist bias at n >= 3
export function detectArtistBias(freq: Record<string, number>, threshold = 3) {
  const [top] = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  return top && top[1] >= threshold
    ? { biased: true, top_artist: top[0], count: top[1] }
    : { biased: false, top_artist: null, count: 0 };
}

// Ruggedness proxy — probes are quarantined, so use vector volatility
export function detectVectorVolatility(deltas: Array<Record<string, number>>, threshold = 15) {
  if (deltas.length < 3) return { volatile: false, avgMagnitude: 0 };
  const mags = deltas.map((d) => Object.values(d).reduce((s, v) => s + Math.abs(v), 0));
  const avgMagnitude = mags.reduce((a, b) => a + b, 0) / mags.length;
  return { volatile: avgMagnitude > threshold, avgMagnitude };
}

// (shared) finalizeSession treats < 2000ms as a snap decision
export function detectSnapPicks(choices: Array<{ ms_to_decide: number | null }>) {
  const valid = choices.filter((c) => c.ms_to_decide != null);
  if (!valid.length) return { snap_rate: 0, snapping: false };
  const snap = valid.filter((c) => c.ms_to_decide! < 2000).length;
  const snap_rate = snap / valid.length;
  return { snap_rate, snapping: snap_rate >= 0.6 };
}

// Recognition failure — the strongest signal the product has
export function detectSkipPressure(skipped: string[], round: number) {
  const skip_count = skipped.length;
  const skip_rate = round > 0 ? skip_count / round : 0;
  return { skip_count, skip_rate, recognition_failing: skip_count >= 2 || skip_rate > 0.25 };
}
```

Terrain construction. Note that skip pressure is what makes the `compound → explore` transition reachable, by driving `environment_stability`:

```typescript
export function sessionToTerrain(input: MusicDNATerrainInput): TerrainProfile {
  const { session, recentDeltas = [], recentChoices = [] } = input;
  const { confidence } = sessionConfidence(session.vector);
  const bias = detectArtistBias(session.artist_frequency);
  const volatility = detectVectorVolatility(recentDeltas);
  const skips = detectSkipPressure(session.skipped_pairing_ids, session.round);

  return {
    feedback_latency: "fast",
    reversibility: "high",
    adversariality: "none",
    coordination_load: "low",
    time_horizon: "iterative",

    uncertainty: confidence < 0.3 ? "high" : confidence < 0.7 ? "medium" : "low",
    branching_factor: session.round < 5 ? "high" : "medium",
    ruggedness: volatility.volatile ? "high" : "medium",
    local_minima_risk: bias.biased ? "high" : "medium",

    // Pairings the user can't engage with are expensive
    information_cost: skips.recognition_failing ? "high" : "low",

    // Unblocks the compound → explore transition
    environment_stability: skips.recognition_failing ? "shifting" : "stable",

    mode_pressure: inferModePressure(input),
  };
}
```

`mode_pressure` is a terrain **input** (`explore | prune | compound | escape | coordinate | create`); `scoreTerrain` returns a `SearchRegime` **output** (`prune | explore | compound | coordinate`). They are different types and must not be conflated. `escape` is a first-class value and is the right way to express a stuck session — no bespoke branch needed.

```typescript
export function inferModePressure(input: MusicDNATerrainInput): ModePressure {
  const { session, recentDeltas = [], recentChoices = [] } = input;
  const { confidence } = sessionConfidence(session.vector);
  const bias = detectArtistBias(session.artist_frequency);
  const volatility = detectVectorVolatility(recentDeltas);
  const snap = detectSnapPicks(recentChoices);
  const skips = detectSkipPressure(session.skipped_pairing_ids, session.round);

  // Thresholds below are placeholders pending D1. They are written as
  // fractions of the session budget so they survive a change to it.
  const budget = input.config?.round_budget ?? 6;
  const escapeAt = Math.floor(budget * 0.7);

  if (session.round >= escapeAt && confidence < 0.3) return "escape";
  if (skips.recognition_failing) return "explore";
  if (bias.biased && bias.count >= 4) return "explore";
  if (volatility.volatile && confidence < 0.7) return "explore";
  if (snap.snapping && confidence < 0.3) return "explore";
  if (confidence < 0.3) return "explore";
  if (confidence > 0.7 && !bias.biased && !volatility.volatile) return "compound";
  return "prune";
}
```

> With `budget = 6`, the `compound` branch is unreachable — see D1. This is not a bug in the mapper; it is the product constraint surfacing.

### What does *not* change

`applyChoice`, `assignArchetype`, `shouldStop`, the `MIN_SUPPORT` / `MIN_CONFIDENCE` evidence gate, `assertWithinLane`, the bootstrap phase, and the critic prompt are all untouched. The bootstrap branch in `nextPairingImpl` returns before `selectPairing` is reached, so regime routing does not apply to bootstrap rounds.

Regime is **not** surfaced to the user. The critic voice already conveys the shift from early read to verdict; naming the regime would break that.

---

## Part 4 — Data plumbing

Three of the mapper's inputs do not currently exist at the call site.

| Input | Status | Work |
|---|---|---|
| `artist_frequency` | No column, no computation | Derive per round by joining `choices → songs` and tallying `chosen.artist` |
| `recentDeltas` | `applyChoice` computes `delta_vector`, nothing persists it | Add `delta_vector JSONB` to `choices` (D4) |
| `ms_to_decide` | Column exists | `nextPairingImpl` currently selects only `pairing_id` — widen the query |
| `round` | `usedIds.size`, includes skips | Pass explicitly; do not recompute differently in the mapper |

```typescript
// nextPairingImpl — current
supabase.from("choices").select("pairing_id").eq("session_id", id)

// nextPairingImpl — required
supabase.from("choices")
  .select("pairing_id, chosen_song_id, ms_to_decide, delta_vector, created_at")
  .eq("session_id", id)
  .order("created_at", { ascending: true })
```

**Skips distort confidence.** A skip advances `round` without moving the vector, so a skip-heavy session looks "stuck at low confidence" as an artifact. Any confidence-versus-round threshold should use choice count, not `round`.

---

## Part 5 — Telemetry

**Use `event_log`. Do not add tables.** This follows the precedent in `instrumentation.md` ("Everything lands in `public.event_log.props`. No new tables.") and it already has the columns needed: `experiment_key`, `variant`, `session_id`, `pairing_id`, `choice_id`, `response_time_ms`, `props`, `client`.

```typescript
await recordEvent({
  event_type: "pairing_shown",
  session_id,
  pairing_id,
  experiment_key: "agent_brain_routing",
  variant: routingMode,           // "legacy" | "shadow" | "agent-brain"
  props: {
    terrain,
    mode_pressure_in,             // ModePressure — mapper's input
    regime_out,                   // SearchRegime — scoreTerrain's output
    scoring_agrees: regime_out === mode_pressure_in,
    knobs,
    selection_reason,             // already carried on this event today
  },
});
```

Two notes:

- `EVENT_TYPES` in `musicdna.functions.ts` is a `z.enum` allow-list. Reusing `pairing_shown` avoids touching it. Any genuinely new event type must be added there or `recordEvent` throws.
- Persist the arm on the session (`sessions.routing_mode`) at creation. Do **not** recompute it per request from a hash, or sessions will flip arms mid-run when the rollout percentage changes.

`scoring_agrees` is the metric that answers D2. If it is true ~100% of the time, Agent Brain is confirming the mapper's decision rather than making one.

### Analytics queries

Earlier drafts used `sessions.archetype_confidence` and `sessions.rounds`. **Neither column exists.** The real columns are `archetype_score`, `archetype_margin`, `archetype_flagged`, `archetype_top3`; round count comes from `choices`.

```sql
SELECT
  s.routing_mode,
  COUNT(*)                                                 AS sessions,
  AVG(s.archetype_margin)                                  AS avg_margin,
  AVG(s.archetype_score)                                   AS avg_score,
  AVG(c.n)                                                 AS avg_rounds,
  AVG((s.completed_at IS NOT NULL)::int) * 100             AS completion_rate,
  AVG(EXTRACT(EPOCH FROM (s.completed_at - s.started_at))) AS avg_duration_seconds
FROM sessions s
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS n FROM choices WHERE session_id = s.id
) c ON TRUE
WHERE s.started_at > NOW() - INTERVAL '14 days'
GROUP BY s.routing_mode;
```

`archetype_score` is a cosine similarity, not a probability, so "+10% confidence" is not a well-defined target. **Use `archetype_margin`** (winner minus runner-up) as the primary quality metric — it is what actually indicates a decisive read — and track `archetype_flagged` rate as a guardrail.

### If a table is added anyway

Every table in this project follows the same pattern: `GRANT` → `ENABLE ROW LEVEL SECURITY` → explicit policies. New tables must match it or they will be unreadable by `authenticated` and will trip the Supabase security linter. `regime_events` would need its own `user_id`, since it has no other ownership path:

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

### SSR

Read environment variables **inside the handler**, never at module scope, or SSR prerender breaks. Same rule as `LOVABLE_API_KEY`.

```typescript
// Wrong — undefined during prerender
const AGENT_BRAIN_URL = process.env.AGENT_BRAIN_URL;

// Right
export async function recommendRegime(session) {
  const url = process.env.AGENT_BRAIN_URL ?? "http://localhost:7399";
}
```

---

## Part 6 — Sequencing

| Step | Scope | Gate |
|---|---|---|
| **−1. Round budget** | Resolve D1. Reconcile the three constants; re-scale thresholds | Blocks everything |
| **0. Data plumbing** | `delta_vector` column; widen the `choices` select; artist frequency; `sessions.routing_mode` | — |
| **1. Telemetry** | Log terrain, `mode_pressure_in`, `regime_out`, `scoring_agrees`, knobs via `event_log`. Baseline `axis_coverage` and `empty_reveal_rate` | Step 0 |
| **2. Fix mapper** | Resolve D2. Real signals for the constant fields; reachable transitions; skip pressure | Steps −1, 1 |
| **3. Knobs refactor** | Replace the seven literals with `PairingKnobs`, defaults = today's values | Step 2 |
| **4. Shadow** | Compute knobs from terrain, log divergence, keep serving legacy | Step 3 gate green |
| **5. Canary 5% → A/B 50% → 100%** | Staged rollout | Part 7 exit criteria |

### Step 3 gate

The refactor is strictly "replace seven literals with `knobs.*`" — no restructuring. It must be proven behavior-neutral by:

- `src/musicdna/engine/pairing.test.ts` — the direct `selectPairing` contract, including `drops same-artist pairings`
- `src/musicdna/engine/index.test.ts` — the golden fixture, self-described as catching pairing-selection changes
- **a new assertion** on byte-identical `selection_reason` across a seeded-RNG corpus

`session.test.ts` is **not** the right gate — it only exercises `buildStartSessionSeed` and never calls `selectPairing`. The existing tests compare picked ids and would let a scoring shift through, which is why the `selection_reason` assertion is needed.

### Rollback

Instant, no deploy: set `MUSICDNA_ROUTING_MODE=legacy` and `AGENT_BRAIN_ROLLOUT_PERCENT=0`. The legacy path stays intact through full rollout.

---

## Part 7 — Guardrails and exit criteria

### Shadow exit criteria

Defined up front so shadow mode cannot run indefinitely. Proceed only when **all** hold:

| Criterion | Threshold | Why |
|---|---|---|
| Errors in the recommendation path | `0` | Any exception means it is not production-ready |
| `mode_differs` rate | `15%–60%` | Below 15% regime adds nothing; above 60% the mapper is miscalibrated |
| `scoring_agrees` | `< 95%` | At ~100%, Agent Brain is confirming, not deciding (D2) |
| Regime distribution | every reachable regime ≥ 5% | If compound is 0%, D1 is the blocker |
| Divergences hand-reviewed | `≥ 30` cases | Someone must confirm different is *better* |
| Sessions in window | `≥ 200` | Below this the rates are noise |

**Abort and re-specify if** `mode_differs > 60%`, or hand review finds the divergent pick worse in most sampled cases.

### Evidence guardrails

Narrowing selection concentrates the axes being tested, which can starve the evidence ledger. With 6 rounds and `MIN_SUPPORT = 2` there is almost no slack, and the failure is user-visible.

| Metric | Definition | Action |
|---|---|---|
| `axis_coverage` | distinct axes with `supporting_choices >= MIN_SUPPORT` | Track per session; alert on regression |
| `allowed_claims_count` | `allowed_claims.length` | Track per session |
| `empty_reveal_rate` | share of sessions with `allowed_claims.length === 0` | **Hard rollback trigger** |

`empty_reveal_rate` is not a metric to review later. Any increase means regime routing has starved the ledger and the reveal is degrading to *"Nothing cleared the evidence threshold this round."*

### Success metrics

| Metric | Baseline | Target |
|---|---|---|
| `archetype_margin` (avg) | TBD | Improve — primary quality metric |
| `axis_coverage` (avg) | TBD | No regression — guardrail |
| `empty_reveal_rate` | TBD | No regression — hard trigger |
| Completion rate | TBD | No regression |
| `archetype_flagged` rate | TBD | No regression |

Baseline all five before Step 4.

---

## Part 8 — Surfaces that will drift

| Surface | Impact |
|---|---|
| `docs/musicdna/api-v1.md` | Adding `routing_mode` / `regime` to the pairing response is a contract change |
| `docs/musicdna/mobile_flutter_api_contract.md` | Same; confirm the Flutter client tolerates unknown fields |
| `docs/musicdna/instrumentation.md` | Should document the `experiment_key` / `variant` convention |
| `src/routes/api/public/test/$action.ts` | Agent test harness calls `*Impl` directly with a service-role client; new required args break it |
| `src/routes/api/v1/e2e.test.ts` | Needs a pinned `routing_mode` to stay deterministic |

No Flutter changes are required — the feature flag is entirely server-side.

---

## Appendix A — Findings log

Condensed record of what the review turned up, with locations, so the reasoning is auditable.

| # | Finding | Location |
|---|---|---|
| 1 | `SelectionMode` is constant per session; too coarse to carry the integration | `musicdna.functions.ts:~579` |
| 2 | `mode_pressure` (+4) plus a +8/+5/+5/0 constant baseline makes `scoreTerrain` a near pass-through | `cognitive-router/scoring.ts` |
| 3 | Three of four transition rules unreachable, incl. the `compound → explore` safety valve | `cognitive-router/scoring.ts` |
| 4 | Skip is a live, load-bearing signal that was absent from earlier drafts | `musicdna.functions.ts:1312` |
| 5 | `artist_frequency` and `delta_vector` do not exist at the call site | `choices` schema |
| 6 | Analytics SQL referenced non-existent columns; `archetype_score` is a cosine | `sessions` schema |
| 7 | `event_log` already provides `experiment_key` / `variant`; `EVENT_TYPES` is an allow-list | `musicdna.functions.ts:1893` |
| 8 | New tables need RLS, GRANTs, and an ownership path | `supabase/migrations/*` |
| 9 | Earlier draft's `selectPairing` rewrite silently dropped six shipped behaviors | `engine/pairing.ts` |
| 10 | `ModePressure` and `SearchRegime` were conflated; `escape` already exists | `cognitive-router/types.ts` |
| 11 | `shouldStop` interaction unspecified though it controls the rounds metric | `engine/pairing.ts:80` |
| 12 | API docs, test harness, e2e test, bootstrap early-return unaccounted for | various |
| 13 | **Three conflicting round budgets; the product is 6 rounds, making compound unreachable** | `onboarding.tsx:35` |
| 14 | Regime can starve the evidence ledger; real gate is `2` / `0.55` | `musicdna.functions.ts:1643` |
| 15 | Golden fixture is `index.test.ts`, not `session.test.ts`; probe cadence is moot | `engine/*.test.ts` |
| 16 | Shadow exit criteria were undefined | — |

## Appendix B — What changed from earlier drafts

Earlier drafts were written against `acedge123/idea-builder` and carry errors that should not be copied forward.

| Earlier draft said | Correct |
|---|---|
| Sessions run 12–18 rounds; escape at 15, cap at 18 | Web ships **6 rounds**; those constants are dead code |
| Compound fires late in the session | Compound is **unreachable** at 6 rounds |
| Probe flips indicate rugged terrain | Probes are **quarantined**; `flips` is always empty |
| Decay the probe schedule rather than disabling it | There is **no live probe schedule**; `probe_weight` removed |
| Recognition mode is implicit and would be dropped | It is a first-class `SelectionMode`, preserved |
| `min_canon_floor: 0.3` | Wrong scale — `RECOGNITION_FLOORS` are `0`/`45`/`55` on 0–100 |
| Regime maps to `SelectionMode` | Too coarse; regime maps to `PairingKnobs` |
| Gate the refactor on `session.test.ts` | That file never calls `selectPairing`; use `pairing.test.ts` + `index.test.ts` |
| Add `shadow_comparisons` and `regime_log` tables | Use `event_log` with `experiment_key` / `variant` |
| Track `archetype_confidence` and `rounds` | Neither column exists; use `archetype_margin` and a `choices` count |
| Evidence rule is "≥3 supporting, 0 contradicting" | That governs `ShippedClaim`; the reveal uses `2` / `0.55` |
| Bucket sessions per-request by hashing the id | Persist the arm on `sessions.routing_mode` at creation |

### Resolved product questions

- **Is the regime shown to the user?** No. It would break the critic illusion.
- **Per-lane regime weights?** Not initially. Ship one global table and learn from telemetry.
- **Does the LLM know the regime?** No. Regime confidence may feed the hedge selector, which is close to what `fit_tier` already does.
