# Music DNA × Agent Brain Integration Plan

**Date:** 2026-07-25  
**Status:** Draft  
**Goal:** Integrate Agent Brain's cognitive routing into Music DNA's preference inference engine

---

## Overview

This plan outlines the technical work required to integrate Agent Brain's regime selection into Music DNA's session flow. The integration will make Music DNA's adaptive behavior explicit, tunable, and measurable.

---

## Phase 1: Foundation (Estimated: 1-2 days of focused work)

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
    probes_shown: Array<{ round: number; pairing_id: string; lane: string }>;
    pending: Record<string, string>;
    lane_alignment: Record<string, { wins: number; total: number; magnitude: number; cosine_sum: number }>;
    flips: Array<{ round: number; from: string; to: string; reason: string }>;
  };
  used_pairing_ids: string[];
  artist_frequency?: Record<string, number>;
};

export type MusicDNATerrainInput = {
  session: MusicDNASessionState;
  config?: {
    dims?: readonly string[];
    confidence_thresholds?: {
      low: number;   // default 0.3
      high: number;  // default 0.7
    };
    artist_bias_threshold?: number; // default 3
  };
};

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
  probe_enabled: boolean;          // Whether to include probe lanes
  artist_diversity_weight: number; // How much to penalize same-artist
  
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
  config = DEFAULT_CONFIG,
): ModePressure {
  const { confidence } = calculateSessionConfidence(session, config.dims);
  const { low, high } = config.confidence_thresholds;
  
  // Early rounds: always explore
  if (session.round < 4) return "explore";
  
  // Low confidence: explore
  if (confidence < low) return "explore";
  
  // High confidence: compound
  if (confidence > high) return "compound";
  
  // Medium confidence: prune (challenge hypothesis)
  return "prune";
}

export function sessionToTerrain(input: MusicDNATerrainInput): TerrainProfile {
  const { session, config = DEFAULT_CONFIG } = input;
  const { confidence } = calculateSessionConfidence(session, config.dims);
  const artistBias = detectArtistBias(session, config.artist_bias_threshold);
  const hasProbeFlips = (session.probe_state?.flips?.length ?? 0) > 0;
  const { low, high } = config.confidence_thresholds;
  
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
    
    // Probe flips indicate rugged taste landscape
    ruggedness: hasProbeFlips ? "high" : "medium",
    
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
    mode_pressure: inferModePressure(session, config),
  };
}

export function regimeToPairingStrategy(
  regime: SearchRegime,
  session: MusicDNASessionState,
): PairingStrategy {
  const base: PairingStrategy = {
    axis_need_weight: 0.5,
    hypothesis_challenge_weight: 0.5,
    probe_enabled: true,
    artist_diversity_weight: 0.3,
    min_diagnostic_weight: 30,
    max_pairings_per_dimension: 5,
  };
  
  switch (regime) {
    case "explore":
      return {
        ...base,
        axis_need_weight: 0.8,           // Favor uncertain dimensions
        hypothesis_challenge_weight: 0.2, // Don't challenge too hard yet
        probe_enabled: true,              // Try other lanes
        artist_diversity_weight: 0.5,     // Encourage variety
      };
    
    case "prune":
      return {
        ...base,
        axis_need_weight: 0.3,           // Focus on known dimensions
        hypothesis_challenge_weight: 0.9, // Challenge the hypothesis hard
        probe_enabled: session.round < 10, // Still probe early
        artist_diversity_weight: 0.4,
      };
    
    case "compound":
      return {
        ...base,
        axis_need_weight: 0.2,           // Deepen existing signal
        hypothesis_challenge_weight: 0.3, // Light challenge
        probe_enabled: false,             // Stop probing
        artist_diversity_weight: 0.2,     // Allow some repeat artists
      };
    
    case "coordinate":
      // Not applicable, fall back to explore
      return {
        ...base,
        axis_need_weight: 0.8,
        hypothesis_challenge_weight: 0.2,
        probe_enabled: true,
        artist_diversity_weight: 0.5,
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
  
  if (terrain.ruggedness === "high") {
    rationale.push("Probe flips occurred — taste landscape is rugged");
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

**Location:** `src/musicdna/engine/pairing.ts`

```typescript
// Add new regime-aware selection function

import type { PairingStrategy } from "./agent-brain-types.js";

export type SelectPairingWithStrategyInput<P extends PairingCandidate> = 
  SelectPairingInput<P> & {
    strategy: PairingStrategy;
  };

export function selectPairingWithStrategy<P extends PairingCandidate>(
  input: SelectPairingWithStrategyInput<P>,
): SelectPairingResult<P> {
  const { pool, vector, used_ids, dims, rng, strategy } = input;
  
  // 1. Filter used pairings
  let candidates = pool.filter((p) => !used_ids.has(p.id));
  if (!candidates.length) return { kind: "empty" };
  
  // 2. Filter same-artist if strategy wants diversity
  if (strategy.artist_diversity_weight > 0.3) {
    const diverse = candidates.filter(differentArtist);
    if (diverse.length > 0) candidates = diverse;
  }
  
  // 3. Calculate axis need (favor uncertain dimensions)
  const need = (dim: string) => 1 / (1 + Math.abs(vector[dim] ?? 0));
  
  // 4. Find hypothesis-challenging axes
  const leaningAxes = new Set(
    dims
      .map((d) => ({ d, v: Math.abs(vector[d] ?? 0) }))
      .filter((x) => x.v >= 15)
      .sort((a, b) => b.v - a.v)
      .slice(0, 3)
      .map((x) => x.d),
  );
  
  // 5. Score each pairing using strategy weights
  const scored = candidates.map((p) => {
    const tests = (p.tests?.length ? p.tests : dims.slice()) as string[];
    
    // Axis need component
    const axisNeed = tests.reduce((s, d) => s + need(d), 0) / Math.max(1, tests.length);
    
    // Hypothesis challenge component
    const challengesHypothesis = leaningAxes.size > 0 && tests.some((t) => leaningAxes.has(t));
    const challengeScore = challengesHypothesis ? 1.0 : 0.0;
    
    // Combined score using strategy weights
    const w = (
      strategy.axis_need_weight * axisNeed +
      strategy.hypothesis_challenge_weight * challengeScore
    ) * ((p.diagnostic_weight || 50) / 100);
    
    return { p, w };
  });
  
  // 6. Weighted random selection
  const total = scored.reduce((s, x) => s + x.w, 0);
  let r = rng.next() * total;
  const pick = scored.find((x) => (r -= x.w) <= 0) ?? scored[0];
  
  return { kind: "picked", pairing: pick.p };
}
```

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
-- Add columns to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS current_regime TEXT DEFAULT 'explore';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS regime_log JSONB DEFAULT '[]'::jsonb;

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_sessions_regime ON sessions(current_regime);
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

## Rollout Plan Summary

> **See Phase 2.5 and Phase 2.6 above for detailed implementation.**

| Stage | Duration | Config | Traffic |
|-------|----------|--------|---------|
| **0. Baseline** | 1 week | No changes | Measure current metrics |
| **1. Shadow** | 1-2 weeks | `ROUTING_MODE=shadow` | 0% Agent Brain (log only) |
| **2. Canary** | 1 week | `ROLLOUT_PERCENT=5` | 5% Agent Brain |
| **3. A/B Test** | 2-3 weeks | `ROLLOUT_PERCENT=50` | 50% Agent Brain |
| **4. Full Rollout** | — | `ROLLOUT_PERCENT=100` | 100% Agent Brain |

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

## Open Questions

1. **Should regime be visible to user?** Could show "Challenging your hypothesis..." vs "Deepening your profile..."

2. **How to handle edge cases?** User who never converges, user who converges too fast

3. **Per-lane regime weights?** Maybe hip_hop needs more exploration than alternative?

4. **LLM involvement?** Should the micro-reaction commentary mention regime? "I'm testing whether you really mean that..."

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
