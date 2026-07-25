// MusicDNA regime recommender — the public entry point for the integration.

import type { SearchRegime } from "../../types.js";
import { regimeToPairingKnobs, regimeToSelectionMode } from "./knobs.js";
import { scoreMusicDNATerrain, scoringAgrees } from "./scoring-musicdna.js";
import { sessionConfidence } from "./signals.js";
import { sessionToTerrain } from "./terrain-mapper.js";
import type { MusicDNARegimeRecommendation, MusicDNATerrainInput } from "./types.js";

export function recommendMusicDNARegime(input: MusicDNATerrainInput): MusicDNARegimeRecommendation {
  const terrain = sessionToTerrain(input);
  const scoring = scoreMusicDNATerrain(terrain);
  const { session } = input;
  const { confidence, confident_axes, total_axes } = sessionConfidence(session.vector);
  const mode_pressure_in = terrain.mode_pressure;
  const regime = scoring.primary_regime;
  const selection_mode = regimeToSelectionMode(regime, session.lane, session.lane_confidence);
  const pairing_knobs = regimeToPairingKnobs(regime, session.lane, session.lane_confidence);

  const rationale: string[] = [];
  rationale.push(
    `Round ${session.rounds_shown} (${session.rounds_answered} answered / ${session.rounds_skipped} skipped), ` +
      `confidence ${(confidence * 100).toFixed(0)}% (${confident_axes}/${total_axes} axes)`,
  );

  if (terrain.uncertainty === "high") {
    rationale.push("Uncertainty is high — favoring exploration");
  } else if (terrain.uncertainty === "low") {
    rationale.push("Uncertainty is low — ready to compound");
  }

  if (terrain.local_minima_risk === "high") {
    rationale.push("Artist bias detected — local-minima risk elevated");
  }

  if (terrain.ruggedness === "high") {
    rationale.push("Vector volatility — taste landscape is rugged");
  }

  if (terrain.environment_stability === "shifting") {
    rationale.push("Skip pressure — environment treated as shifting");
  }

  if (mode_pressure_in === "escape") {
    rationale.push("Escape pressure — stuck at low confidence late in the budget");
  }

  const topReasons = scoring.breakdown[0]?.reasons.slice(0, 3) ?? [];
  rationale.push(...topReasons);

  return {
    regime,
    confidence: scoring.confidence,
    terrain,
    mode_pressure_in,
    scoring_agrees: scoringAgrees(mode_pressure_in, regime),
    rationale,
    transition_candidate: scoring.transition_candidate,
    selection_mode,
    pairing_knobs,
    scoring,
  };
}

export function shouldTransitionRegime(
  currentRegime: SearchRegime,
  input: MusicDNATerrainInput,
): { transition: boolean; to: SearchRegime | null; reason: string | null } {
  const rec = recommendMusicDNARegime(input);

  if (rec.transition_candidate && rec.transition_candidate !== currentRegime) {
    return {
      transition: true,
      to: rec.transition_candidate,
      reason: `Terrain suggests ${rec.transition_candidate}: ${rec.rationale.slice(-1)[0] ?? ""}`,
    };
  }

  // Confidence gate: prune/compound rarely exceed ~0.56 under the weight table,
  // so keep this modest. Explore can still clear it.
  if (rec.regime !== currentRegime && rec.confidence > 0.55) {
    return {
      transition: true,
      to: rec.regime,
      reason: `High-confidence recommendation: ${rec.regime} (${(rec.confidence * 100).toFixed(0)}%)`,
    };
  }

  return { transition: false, to: null, reason: null };
}
