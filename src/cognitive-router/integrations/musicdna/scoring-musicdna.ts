// MusicDNA-specific scoring wrapper.
//
// Global DIMENSION_WEIGHTS give mode_pressure +4. Per D2, MusicDNA wants +2
// after correcting reversibility/information_cost constants in the mapper.
// We must not change the global table (debugging / media lanes depend on it),
// so this wrapper undoes the extra +2 for the single-regime mode_pressure
// values (explore / prune / compound / coordinate) and re-ranks.

import { scoreTerrain } from "../../scoring.js";
import type { ModePressure, RegimeRecommendation, SearchRegime, TerrainProfile } from "../../types.js";
import { SEARCH_REGIMES } from "../../types.js";

const SINGLE_REGIME_MODE_PRESSURES: ReadonlySet<ModePressure> = new Set([
  "explore",
  "prune",
  "compound",
  "coordinate",
]);

/** Global table contributes +4; MusicDNA wants +2 → subtract 2. */
const MODE_PRESSURE_OVERWEIGHT = 2;

function isSearchRegime(value: ModePressure): value is SearchRegime {
  return (SEARCH_REGIMES as readonly string[]).includes(value);
}

/**
 * scoreTerrain with MusicDNA's agreed mode_pressure weight (+2, not +4).
 * escape / create keep their multi-regime contributions unchanged.
 */
export function scoreMusicDNATerrain(profile: TerrainProfile): RegimeRecommendation {
  const base = scoreTerrain(profile);
  const mp = profile.mode_pressure;

  if (!SINGLE_REGIME_MODE_PRESSURES.has(mp) || !isSearchRegime(mp)) {
    return base;
  }

  const adjustedScores: Record<SearchRegime, number> = {
    prune: 0,
    explore: 0,
    compound: 0,
    coordinate: 0,
  };
  const adjustedReasons: Record<SearchRegime, string[]> = {
    prune: [],
    explore: [],
    compound: [],
    coordinate: [],
  };

  for (const row of base.breakdown) {
    let score = row.score;
    let reasons = [...row.reasons];
    if (row.regime === mp) {
      score -= MODE_PRESSURE_OVERWEIGHT;
      reasons = [
        ...reasons,
        `musicdna: mode_pressure weight adjusted +4→+2 (−${MODE_PRESSURE_OVERWEIGHT})`,
      ];
    }
    adjustedScores[row.regime] = score;
    adjustedReasons[row.regime] = reasons;
  }

  const breakdown = SEARCH_REGIMES.map((regime) => ({
    regime,
    score: adjustedScores[regime],
    reasons: adjustedReasons[regime],
  })).sort((left, right) => right.score - left.score);

  const primary = breakdown[0]?.regime ?? "explore";
  const secondary = breakdown[1]?.regime ?? null;
  const topScore = breakdown[0]?.score ?? 0;
  const secondScore = breakdown[1]?.score ?? 0;
  const margin = topScore - secondScore;
  const confidence = Math.max(0, Math.min(1, 0.4 + Math.max(0, margin) * 0.08));

  const OPPOSING: Record<SearchRegime, SearchRegime> = {
    prune: "explore",
    explore: "compound",
    compound: "explore",
    coordinate: "explore",
  };

  return {
    primary_regime: primary,
    secondary_regime: secondary,
    opposing_regime: OPPOSING[primary],
    confidence,
    breakdown,
    transition_candidate: transitionCandidateFor(profile, primary),
  };
}

/** Mirrors TRANSITION_RULES in scoring.ts, keyed on an explicit top regime. */
function transitionCandidateFor(
  profile: TerrainProfile,
  topRegime: SearchRegime,
): SearchRegime | null {
  if (
    topRegime === "explore" &&
    profile.uncertainty !== "high" &&
    profile.branching_factor === "high"
  ) {
    return "prune";
  }
  if (
    topRegime === "prune" &&
    profile.uncertainty === "low" &&
    profile.environment_stability === "stable"
  ) {
    return "compound";
  }
  if (
    topRegime === "compound" &&
    (profile.environment_stability === "shifting" || profile.local_minima_risk === "high")
  ) {
    return "explore";
  }
  if (
    topRegime !== "coordinate" &&
    (profile.adversariality === "high" || profile.coordination_load === "high")
  ) {
    return "coordinate";
  }
  return null;
}

/**
 * Does mode_pressure_in "agree" with the scored regime?
 * escape/create are not SearchRegimes — they never "agree" as an equality,
 * which is correct: scoring_agrees measures whether scoreTerrain is echoing
 * a single-regime mode_pressure.
 */
export function scoringAgrees(modePressureIn: ModePressure, regimeOut: SearchRegime): boolean {
  return modePressureIn === regimeOut;
}
