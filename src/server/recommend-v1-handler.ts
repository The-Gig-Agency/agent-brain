import { recommendRegime } from "../cognitive-router/scoring.js";
import type { TerrainAssessment } from "../cognitive-router/types.js";

import { ROUTER_RECOMMEND_API_VERSION } from "./constants.js";
import { parseRecommendV1Request, RECOMMEND_V1_MAX_REASONS_PER_REGIME } from "./recommend-v1-mapper.js";
import type { RecommendV1RequestWire, RecommendV1ResponseWire } from "./recommend-v1-types.js";

function toAssessment(request: RecommendV1RequestWire): TerrainAssessment {
  return {
    problem_summary: request.problem_summary,
    terrain_profile: request.terrain,
    ...(request.field_confidence ? { field_confidence: request.field_confidence } : {}),
    ...(request.missing_information ? { missing_information: request.missing_information } : {}),
  };
}

/**
 * Pure v1 handler: validated wire request → wire response. No HTTP / I/O.
 */
export function recommendV1FromWireRequest(request: RecommendV1RequestWire): RecommendV1ResponseWire {
  const rec = recommendRegime(toAssessment(request));
  return {
    api_version: ROUTER_RECOMMEND_API_VERSION,
    recommendation: {
      primary_regime: rec.primary_regime,
      secondary_regime: rec.secondary_regime,
      opposing_regime: rec.opposing_regime,
      confidence: rec.confidence,
      transition_candidate: rec.transition_candidate,
      breakdown: rec.breakdown.map((row) => ({
        regime: row.regime,
        score: row.score,
        reasons: row.reasons.slice(0, RECOMMEND_V1_MAX_REASONS_PER_REGIME),
      })),
    },
  };
}

/**
 * Parse JSON value then run recommendation. Returns either a success payload or validation error wire.
 */
export function recommendV1FromJsonBody(parsed: unknown): { ok: true; body: RecommendV1ResponseWire } | { ok: false; status: number; body: import("./recommend-v1-types.js").RecommendV1ErrorWire } {
  const parsedRequest = parseRecommendV1Request(parsed);
  if (!parsedRequest.ok) {
    return { ok: false, status: 400, body: parsedRequest.error };
  }
  return { ok: true, body: recommendV1FromWireRequest(parsedRequest.request) };
}
