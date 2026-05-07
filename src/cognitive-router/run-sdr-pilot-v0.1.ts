import { buildSdrPilotRecommendRequest, recommendSdrProspectingMode } from "./sdr-pilot.js";
import { SDR_PILOT_SCENARIOS_V0_1 } from "./sdr-pilot-scenarios.js";

function main(): void {
  const sample = SDR_PILOT_SCENARIOS_V0_1[0];
  if (!sample) {
    throw new Error("Expected at least one SDR pilot scenario");
  }
  const request = buildSdrPilotRecommendRequest(sample.input);
  const recommendation = recommendSdrProspectingMode(sample.input);

  console.log(
    JSON.stringify(
      {
        scenario_id: sample.id,
        scenario_title: sample.title,
        input: {
          org_id: sample.input.org_id,
          seat_id: sample.input.seat_id,
          execution_scope: sample.input.execution_scope,
          surface: sample.input.surface,
        },
        recommend_v1_request: request.request,
        trace_summary: request.trace_summary,
        recommendation: {
          recommended_mode: recommendation.recommended_mode,
          mode_confidence: recommendation.mode_confidence,
          primary_regime: recommendation.regime_alignment.primary_regime,
          secondary_regime: recommendation.regime_alignment.secondary_regime,
          strategy_family: recommendation.strategy_recommendation.strategy_family,
          primary_algorithm: recommendation.strategy_recommendation.primary_algorithm,
          candidate_algorithms: recommendation.candidate_algorithms,
          blockers: recommendation.blockers,
          next_review_triggers: recommendation.next_review_triggers,
          rationale: recommendation.rationale,
        },
      },
      null,
      2,
    ),
  );
}

main();
