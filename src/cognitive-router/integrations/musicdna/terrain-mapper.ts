// MusicDNA session state → Agent Brain TerrainProfile.
//
// Constants per D2:
//   reversibility: "medium"  (fixed 6-round budget — cannot un-ask)
//   information_cost: "medium" baseline, "high" under skip pressure
//
// mode_pressure is a terrain INPUT. scoreMusicDNATerrain produces the regime
// OUTPUT. Do not conflate the two.

import type { ModePressure, TerrainProfile } from "../../types.js";
import {
  DEFAULT_ARTIST_BIAS_THRESHOLD,
  DEFAULT_AXIS_CONFIDENCE_THRESHOLD,
  DEFAULT_SNAP_RATE_THRESHOLD,
  DEFAULT_SNAP_THRESHOLD_MS,
  DEFAULT_VOLATILITY_THRESHOLD,
  detectArtistBias,
  detectSkipPressure,
  detectSnapPicks,
  detectVectorVolatility,
  sessionConfidence,
} from "./signals.js";
import type { MapperConfig, MusicDNATerrainInput } from "./types.js";

export const DEFAULT_MAPPER_CONFIG = {
  round_budget: 6,
  confidence_thresholds: { low: 0.3, high: 0.7 },
  artist_bias_threshold: DEFAULT_ARTIST_BIAS_THRESHOLD,
  axis_confidence_threshold: DEFAULT_AXIS_CONFIDENCE_THRESHOLD,
  volatility_threshold: DEFAULT_VOLATILITY_THRESHOLD,
  snap_threshold_ms: DEFAULT_SNAP_THRESHOLD_MS,
  snap_rate_threshold: DEFAULT_SNAP_RATE_THRESHOLD,
} as const satisfies Required<MapperConfig>;

function resolveConfig(config?: MapperConfig): Required<MapperConfig> {
  return {
    round_budget: config?.round_budget ?? DEFAULT_MAPPER_CONFIG.round_budget,
    confidence_thresholds: {
      low: config?.confidence_thresholds?.low ?? DEFAULT_MAPPER_CONFIG.confidence_thresholds.low,
      high: config?.confidence_thresholds?.high ?? DEFAULT_MAPPER_CONFIG.confidence_thresholds.high,
    },
    artist_bias_threshold: config?.artist_bias_threshold ?? DEFAULT_MAPPER_CONFIG.artist_bias_threshold,
    axis_confidence_threshold:
      config?.axis_confidence_threshold ?? DEFAULT_MAPPER_CONFIG.axis_confidence_threshold,
    volatility_threshold: config?.volatility_threshold ?? DEFAULT_MAPPER_CONFIG.volatility_threshold,
    snap_threshold_ms: config?.snap_threshold_ms ?? DEFAULT_MAPPER_CONFIG.snap_threshold_ms,
    snap_rate_threshold: config?.snap_rate_threshold ?? DEFAULT_MAPPER_CONFIG.snap_rate_threshold,
  };
}

export function inferModePressure(input: MusicDNATerrainInput): ModePressure {
  const cfg = resolveConfig(input.config);
  const { session, recentDeltas, recentChoices } = input;
  const { confidence } = sessionConfidence(session.vector, cfg.axis_confidence_threshold);
  const bias = detectArtistBias(session.artist_frequency, cfg.artist_bias_threshold);
  const volatility = detectVectorVolatility(recentDeltas, cfg.volatility_threshold);
  const snap = detectSnapPicks(recentChoices, cfg.snap_threshold_ms, cfg.snap_rate_threshold);
  const skips = detectSkipPressure(session.skipped_pairing_ids, session.rounds_shown);
  const { low, high } = cfg.confidence_thresholds;

  // Escape is a first-class ModePressure. Threshold is a fraction of budget
  // so it survives a change to the round count (D1).
  const escapeAt = Math.floor(cfg.round_budget * 0.7);
  if (session.rounds_shown >= escapeAt && confidence < low) return "escape";

  if (skips.recognition_failing) return "explore";
  // Extreme artist bias (≥4) forces explore. Moderate bias (3) elevates
  // local_minima_risk in sessionToTerrain but still allows compound
  // mode_pressure — that pairing is what makes compound→explore reachable.
  if (bias.biased && bias.count >= 4) return "explore";
  // Only assert volatility when known — missing deltas are unknown, not calm.
  if (volatility.known && volatility.volatile && confidence < high) return "explore";
  if (snap.snapping && confidence < low) return "explore";
  if (confidence < low) return "explore";
  // >= high: 7/10 axes at threshold is exactly 0.7, which is the compound bar.
  if (confidence >= high && bias.count < 4 && !(volatility.known && volatility.volatile)) {
    return "compound";
  }
  return "prune";
}

export function sessionToTerrain(input: MusicDNATerrainInput): TerrainProfile {
  const cfg = resolveConfig(input.config);
  const { session, recentDeltas } = input;
  const { confidence } = sessionConfidence(session.vector, cfg.axis_confidence_threshold);
  const bias = detectArtistBias(session.artist_frequency, cfg.artist_bias_threshold);
  const volatility = detectVectorVolatility(recentDeltas, cfg.volatility_threshold);
  const skips = detectSkipPressure(session.skipped_pairing_ids, session.rounds_shown);
  const { low, high } = cfg.confidence_thresholds;

  return {
    feedback_latency: "fast",
    adversariality: "none",
    coordination_load: "low",
    time_horizon: "iterative",

    // D2: medium, not high — fixed budget, cannot un-ask.
    reversibility: "medium",

    uncertainty: confidence < low ? "high" : confidence < high ? "medium" : "low",
    // Budget-relative so a future round-count change does not hard-code "5".
    branching_factor: session.rounds_shown < Math.ceil(cfg.round_budget * 0.85) ? "high" : "medium",
    // Unknown deltas → medium (do not claim calm from missing data).
    ruggedness: volatility.known && volatility.volatile ? "high" : "medium",
    local_minima_risk: bias.biased ? "high" : "medium",

    // D2: medium baseline; high under recognition failure.
    information_cost: skips.recognition_failing ? "high" : "medium",

    // Skip pressure unblocks the compound → explore transition rule.
    environment_stability: skips.recognition_failing ? "shifting" : "stable",

    mode_pressure: inferModePressure(input),
  };
}

/** Enumerate a representative set of terrains the mapper can emit (for reachability tests). */
export function enumerateMusicDNATerrains(): TerrainProfile[] {
  const terrains: TerrainProfile[] = [];
  const vectors = [
    {}, // low confidence
    { movement: 40, atmosphere: 40, immersion: 40 }, // medium
    {
      movement: 40,
      atmosphere: 40,
      immersion: 40,
      scale: 40,
      community: 40,
      perspective: 40,
      confidence: 40,
    }, // high (7 axes)
  ];
  // Include count=3 (biased → local_minima high, still allows compound mode_pressure)
  // and count=5 (forces explore mode_pressure).
  const artistFreqs = [{}, { Radiohead: 2 }, { Radiohead: 3 }, { Radiohead: 5 }];
  const skipSets = [[], ["a"], ["a", "b", "c"]];
  const deltaSets: Array<Array<Record<string, number>> | undefined> = [
    undefined,
    [{ movement: 5 }, { movement: 5 }, { movement: 5 }],
    [{ movement: 40, atmosphere: 40 }, { movement: 40 }, { immersion: 50 }],
  ];
  const choiceSets = [
    [],
    [{ ms_to_decide: 500 }, { ms_to_decide: 600 }, { ms_to_decide: 700 }],
    [{ ms_to_decide: 9000 }, { ms_to_decide: 10000 }],
  ];
  // Include rounds_shown >= budget so branching_factor can be "medium"
  // (compound is penalized under branching_factor=high).
  const roundsShown = [0, 2, 4, 5, 6];

  for (const vector of vectors) {
    for (const artist_frequency of artistFreqs) {
      for (const skipped_pairing_ids of skipSets) {
        for (const recentDeltas of deltaSets) {
          for (const recentChoices of choiceSets) {
            for (const rounds_shown of roundsShown) {
              const rounds_skipped = skipped_pairing_ids.length;
              const rounds_answered = Math.max(0, rounds_shown - rounds_skipped);
              const mappedInput: MusicDNATerrainInput = {
                session: {
                  session_id: "enum",
                  rounds_answered,
                  rounds_skipped,
                  rounds_shown,
                  vector,
                  lane: "alternative",
                  lane_confidence: 0.8,
                  skipped_pairing_ids,
                  artist_frequency,
                },
                recentChoices,
              };
              if (recentDeltas !== undefined) {
                mappedInput.recentDeltas = recentDeltas;
              }
              terrains.push(sessionToTerrain(mappedInput));
            }
          }
        }
      }
    }
  }
  return terrains;
}
