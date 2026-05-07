import { buildSdrPilotRecommendRequest, recommendSdrProspectingMode, type SdrPilotInput } from "./sdr-pilot.js";

const sampleInput: SdrPilotInput = {
  org_id: "demo-org",
  seat_id: "seat-west-1",
  execution_scope: "seat",
  surface: "list_building",
  icp_completeness: "medium",
  recent_prospect_yield: "low",
  fit_quality: "high",
  contact_coverage: "low",
  territory_saturation: "medium",
  downstream_capacity: "available",
  active_pipeline_inventory: "low",
  operator_note: "Good-fit accounts exist, but coverage is thin and the seat feels stuck.",
  missing_information: ["title coverage by segment", "regional whitespace outside current list"],
};

function main(): void {
  const request = buildSdrPilotRecommendRequest(sampleInput);
  const recommendation = recommendSdrProspectingMode(sampleInput);

  console.log(
    JSON.stringify(
      {
        input: {
          org_id: sampleInput.org_id,
          seat_id: sampleInput.seat_id,
          execution_scope: sampleInput.execution_scope,
          surface: sampleInput.surface,
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
