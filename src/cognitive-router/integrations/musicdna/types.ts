// MusicDNA × Agent Brain integration types.
//
// Domain shapes the terrain mapper consumes. Kept free of I/O so MusicDNA
// (or any caller) can build them from session + choice history and pass them in.
//
// Spec: docs/integrations/musicdna-integration-plan.md (Part 3).

import type { ModePressure, RegimeRecommendation, SearchRegime, TerrainProfile } from "../../types.js";

export const MUSICDNA_DIMS = [
  "movement",
  "atmosphere",
  "immersion",
  "scale",
  "community",
  "perspective",
  "confidence",
  "tension",
  "texture",
  "transformation",
] as const;

export type MusicDNADim = (typeof MUSICDNA_DIMS)[number];

/** Mirrors MusicDNA `SelectionMode` in `src/musicdna/engine/pairing.ts`. */
export type SelectionMode = "diagnostic_first" | "recognition_boost" | "recognition_first";

/** Mirrors MusicDNA `RECOGNITION_FLOORS` — 0..100 scale. */
export const RECOGNITION_FLOORS: Record<SelectionMode, number> = {
  diagnostic_first: 0,
  recognition_boost: 45,
  recognition_first: 55,
};

/**
 * Round counters must stay separated. Today's MusicDNA `round` conflates
 * answered + skipped; confidence and evidence only move on answered rounds.
 */
export type MusicDNASessionState = {
  session_id: string;
  /** Choices recorded — the only rounds that move the vector. */
  rounds_answered: number;
  /** `probe_state.skipped_pairing_ids.length`. */
  rounds_skipped: number;
  /** answered + skipped — today's `round` / budget accounting. */
  rounds_shown: number;
  vector: Record<string, number>;
  lane: string;
  lane_confidence: number;
  skipped_pairing_ids: string[];
  /** Derived per round by joining choices → songs; not a DB column. */
  artist_frequency: Record<string, number>;
};

export type MapperConfig = {
  /** Session budget. Default 6 (shipped web). Thresholds scale as fractions of this. */
  round_budget?: number;
  confidence_thresholds?: {
    low: number;
    high: number;
  };
  artist_bias_threshold?: number;
  axis_confidence_threshold?: number;
  volatility_threshold?: number;
  snap_threshold_ms?: number;
  snap_rate_threshold?: number;
};

export type MusicDNATerrainInput = {
  session: MusicDNASessionState;
  /**
   * Recent choice deltas (`event_log.props.raw_delta` / `applyChoice.delta_vector`).
   * Omit or pass fewer than 3 when unknown — mapper will not treat that as
   * "not volatile" (control-grade unknown handling).
   */
  recentDeltas?: Array<Record<string, number>>;
  recentChoices?: Array<{ ms_to_decide: number | null }>;
  config?: MapperConfig;
};

/**
 * The seven hard-coded literals inside MusicDNA `selectPairing`, made explicit.
 * Defaults from `legacyKnobsForMode` must preserve today's behavior.
 */
export type PairingKnobs = {
  mode: SelectionMode;
  /** 0..1 — mirrors `recogBlend` in selectPairing. */
  recog_blend: number;
  /** 0..100 — same scale as `RECOGNITION_FLOORS`. */
  canon_floor: number;
  challenge_boost: number;
  leaning_axis_threshold: number;
  leaning_axis_count: number;
  axis_need_floor: number;
  axis_need_span: number;
  fork_filter: "hard" | "soft" | "off";
};

export type MusicDNARegimeRecommendation = {
  regime: SearchRegime;
  confidence: number;
  terrain: TerrainProfile;
  /** Terrain input — distinct from `regime` (scoring output). */
  mode_pressure_in: ModePressure;
  /** True when `regime` equals the regime-like value of `mode_pressure_in`. */
  scoring_agrees: boolean;
  rationale: string[];
  transition_candidate: SearchRegime | null;
  selection_mode: SelectionMode;
  pairing_knobs: PairingKnobs;
  /** Full Agent Brain breakdown for shadow logging. */
  scoring: RegimeRecommendation;
};

export type SessionConfidence = {
  confidence: number;
  confident_axes: number;
  total_axes: number;
};

export type ArtistBias = {
  biased: boolean;
  top_artist: string | null;
  count: number;
};

/**
 * `volatile: null` means unknown (insufficient / missing deltas).
 * Callers must not treat unknown as `false`.
 */
export type VectorVolatility = {
  known: boolean;
  volatile: boolean | null;
  avgMagnitude: number;
};

export type SnapPicks = {
  snap_rate: number;
  snapping: boolean;
  valid_count: number;
};

export type SkipPressure = {
  skip_count: number;
  skip_rate: number;
  recognition_failing: boolean;
};
