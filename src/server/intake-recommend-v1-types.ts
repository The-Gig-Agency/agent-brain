import type {
  FieldConfidence,
  SearchRegime,
  TerrainProfile,
} from "../cognitive-router/types.js";
import type { TerrainClarificationQuestion, TerrainFieldEvidence } from "../cognitive-router/problem-ingestion.js";

import type { RouterRecommendApiVersion } from "./constants.js";
import type { RecommendV1BreakdownWire } from "./recommend-v1-types.js";

/**
 * Wire request for POST /v1/intake-recommend (messy text → ingestion + recommendation).
 */
export type IntakeRecommendV1RequestWire = {
  problem_summary: string;
  context?: string;
  signals?: string[];
};

export type IntakeRecommendV1ResponseWire = {
  api_version: RouterRecommendApiVersion;
  /** Same id as `X-Trace-Id` when provided; otherwise server-generated (also on logs). */
  trace_id: string;
  ingestion: {
    terrain_profile: TerrainProfile;
    field_confidence: FieldConfidence;
    missing_information: string[];
    clarification_questions: TerrainClarificationQuestion[];
    regime_hint: SearchRegime;
    field_evidence: TerrainFieldEvidence[];
  };
  recommendation: {
    primary_regime: SearchRegime;
    secondary_regime: SearchRegime | null;
    opposing_regime: SearchRegime;
    confidence: number;
    transition_candidate: SearchRegime | null;
    breakdown: RecommendV1BreakdownWire[];
  };
};
