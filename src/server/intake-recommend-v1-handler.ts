import { ingestProblem } from "../cognitive-router/problem-ingestion.js";
import { recommendRegime } from "../cognitive-router/scoring.js";

import { ROUTER_RECOMMEND_API_VERSION } from "./constants.js";
import { parseIntakeRecommendV1Request } from "./intake-recommend-v1-mapper.js";
import type { IntakeRecommendV1ResponseWire } from "./intake-recommend-v1-types.js";
import { RECOMMEND_V1_MAX_REASONS_PER_REGIME } from "./recommend-v1-mapper.js";
import type { RecommendV1ErrorWire } from "./recommend-v1-types.js";

/**
 * Parse JSON → ingest messy problem text → regime recommendation. No HTTP / I/O.
 */
export function intakeRecommendV1FromJsonBody(
  traceId: string,
  parsed: unknown,
): { ok: true; body: IntakeRecommendV1ResponseWire } | { ok: false; status: number; body: RecommendV1ErrorWire } {
  const parsedRequest = parseIntakeRecommendV1Request(parsed);
  if (!parsedRequest.ok) {
    return { ok: false, status: 400, body: parsedRequest.error };
  }

  const ingestion = ingestProblem(parsedRequest.request);
  const rec = recommendRegime(ingestion.assessment);

  const body: IntakeRecommendV1ResponseWire = {
    api_version: ROUTER_RECOMMEND_API_VERSION,
    trace_id: traceId,
    ingestion: {
      terrain_profile: ingestion.assessment.terrain_profile,
      field_confidence: ingestion.assessment.field_confidence ?? {},
      missing_information: ingestion.assessment.missing_information ?? [],
      clarification_questions: ingestion.clarification_questions,
      regime_hint: ingestion.regime_hint,
      field_evidence: ingestion.field_evidence,
    },
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

  return { ok: true, body };
}
