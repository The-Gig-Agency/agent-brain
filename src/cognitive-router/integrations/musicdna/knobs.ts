// PairingKnobs — the seven hard-coded literals inside MusicDNA selectPairing.
//
// legacyKnobsForMode MUST preserve today's behavior: recog_blend and canon_floor
// are mode-derived in the shipped code. A single constant default would silently
// convert recognition_first / recognition_boost sessions into diagnostic_first.

import type { SearchRegime } from "../../types.js";
import { RECOGNITION_FLOORS, type PairingKnobs, type SelectionMode } from "./types.js";

/**
 * Behavior-preserving defaults for a given SelectionMode.
 * Golden tests must cover all three modes.
 */
export function legacyKnobsForMode(mode: SelectionMode): PairingKnobs {
  return {
    mode,
    recog_blend: mode === "recognition_first" ? 0.6 : mode === "recognition_boost" ? 0.4 : 0,
    canon_floor: RECOGNITION_FLOORS[mode],
    challenge_boost: 1.5,
    leaning_axis_threshold: 15,
    leaning_axis_count: 3,
    axis_need_floor: 0.4,
    axis_need_span: 0.6,
    fork_filter: "hard",
  };
}

/**
 * Mode stays lane-driven. Regime only gets a say once the lane is settled.
 * Mirrors nextPairingImpl (~line 579) with a regime override at the top confidence band.
 */
export function regimeToSelectionMode(
  regime: SearchRegime,
  sessionLane: string,
  laneConfidence: number,
): SelectionMode {
  if (sessionLane === "general") return "recognition_first";
  if (laneConfidence < 0.6) return "recognition_boost";
  return regime === "explore" ? "recognition_boost" : "diagnostic_first";
}

/**
 * Regime-shaped knobs. Starts from legacyKnobsForMode so recognition behavior
 * is preserved, then overlays regime-specific scoring levers.
 *
 * coordinate falls back to explore — not applicable to single-user MusicDNA.
 */
export function regimeToPairingKnobs(
  regime: SearchRegime,
  sessionLane: string,
  laneConfidence: number,
): PairingKnobs {
  const effective: SearchRegime = regime === "coordinate" ? "explore" : regime;
  const mode = regimeToSelectionMode(effective, sessionLane, laneConfidence);
  const base = legacyKnobsForMode(mode);

  switch (effective) {
    case "explore":
      return {
        ...base,
        // Soften the fork hard-filter — the highest-value explore lever.
        fork_filter: "soft",
        challenge_boost: 1.2,
        axis_need_floor: 0.3,
        axis_need_span: 0.7,
        leaning_axis_count: 2,
      };
    case "prune":
      return {
        ...base,
        fork_filter: "hard",
        challenge_boost: 1.8,
        axis_need_floor: 0.4,
        axis_need_span: 0.6,
        leaning_axis_count: 3,
      };
    case "compound":
      return {
        ...base,
        fork_filter: "hard",
        challenge_boost: 1.3,
        axis_need_floor: 0.5,
        axis_need_span: 0.5,
        leaning_axis_count: 2,
        leaning_axis_threshold: 20,
      };
  }
}
