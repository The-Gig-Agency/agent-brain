import type { FieldConfidence, SearchRegime, TerrainProfile } from "../cognitive-router/types.js";

import type { RouterRecommendApiVersion } from "./constants.js";

/**
 * Wire request for POST /v1/recommend (slim DTO — not `TerrainAssessment` verbatim).
 * All `terrain` dimensions are required on the wire for v1 predictability.
 */
export type RecommendV1RequestWire = {
  problem_summary: string;
  terrain: {
    feedback_latency: TerrainProfile["feedback_latency"];
    reversibility: TerrainProfile["reversibility"];
    uncertainty: TerrainProfile["uncertainty"];
    branching_factor: TerrainProfile["branching_factor"];
    adversariality: TerrainProfile["adversariality"];
    ruggedness: TerrainProfile["ruggedness"];
    local_minima_risk: TerrainProfile["local_minima_risk"];
    information_cost: TerrainProfile["information_cost"];
    coordination_load: TerrainProfile["coordination_load"];
    environment_stability: TerrainProfile["environment_stability"];
    time_horizon: TerrainProfile["time_horizon"];
    mode_pressure: TerrainProfile["mode_pressure"];
  };
  field_confidence?: FieldConfidence;
  missing_information?: string[];
};

export type RecommendV1BreakdownWire = {
  regime: SearchRegime;
  score: number;
  /** Capped server-side to bound payload size (see mapper). */
  reasons: string[];
};

export type RecommendV1ResponseWire = {
  api_version: RouterRecommendApiVersion;
  recommendation: {
    primary_regime: SearchRegime;
    secondary_regime: SearchRegime | null;
    opposing_regime: SearchRegime;
    confidence: number;
    transition_candidate: SearchRegime | null;
    breakdown: RecommendV1BreakdownWire[];
  };
};

export type RecommendV1ErrorWire = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
