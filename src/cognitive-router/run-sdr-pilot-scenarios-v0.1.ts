import { buildSdrPilotRecommendRequest, recommendSdrProspectingMode } from "./sdr-pilot.js";
import { SDR_PILOT_SCENARIOS_V0_1 } from "./sdr-pilot-scenarios.js";

function main(): void {
  const results = SDR_PILOT_SCENARIOS_V0_1.map((scenario) => {
    const request = buildSdrPilotRecommendRequest(scenario.input);
    const recommendation = recommendSdrProspectingMode(scenario.input);

    return {
      id: scenario.id,
      title: scenario.title,
      expected_mode: scenario.expected_mode,
      actual_mode: recommendation.recommended_mode,
      expected_primary_regime: scenario.expected_primary_regime,
      actual_primary_regime: recommendation.regime_alignment.primary_regime,
      mode_match: scenario.expected_mode === recommendation.recommended_mode,
      regime_match: scenario.expected_primary_regime === recommendation.regime_alignment.primary_regime,
      recommend_v1_request: request.request,
      recommendation: {
        mode_confidence: recommendation.mode_confidence,
        strategy_family: recommendation.strategy_recommendation.strategy_family,
        primary_algorithm: recommendation.strategy_recommendation.primary_algorithm,
        candidate_algorithms: recommendation.candidate_algorithms,
        blockers: recommendation.blockers,
        rationale: recommendation.rationale,
      },
    };
  });

  console.log(
    JSON.stringify(
      {
        scenario_count: results.length,
        mode_match_rate: results.filter((result) => result.mode_match).length / results.length,
        regime_match_rate: results.filter((result) => result.regime_match).length / results.length,
        scenarios: results,
      },
      null,
      2,
    ),
  );
}

main();
