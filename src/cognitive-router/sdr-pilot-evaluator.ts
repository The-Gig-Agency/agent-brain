import { buildSdrPilotRecommendRequest, recommendSdrProspectingMode } from "./sdr-pilot.js";
import { SDR_PILOT_SCENARIOS_V0_1 } from "./sdr-pilot-scenarios.js";

export type SdrPilotEvalCaseResult = {
  case_id: string;
  title: string;
  expected_mode: string;
  actual_mode: string;
  expected_primary_regime: string;
  actual_primary_regime: string;
  mode_match: boolean;
  regime_match: boolean;
  mode_confidence: number;
  primary_algorithm: string;
  strategy_family: string;
  candidate_algorithms: string[];
  blockers: string[];
  recommend_v1_request_shape: {
    problem_summary: string;
    has_missing_information: boolean;
    mode_pressure: string;
  };
};

export type SdrPilotPromotionCriteria = {
  exact_mode_match: boolean;
  exact_regime_match: boolean;
  covers_all_primary_regimes: boolean;
  covers_minimum_mode_variety: boolean;
};

export type SdrPilotEvalReport = {
  suite_id: string;
  generated_at: string;
  overall_pass: boolean;
  recommendation: "promote_to_shadow_mode" | "keep_in_lab";
  criteria: SdrPilotPromotionCriteria;
  summary: {
    scenario_count: number;
    mode_match_rate: number;
    regime_match_rate: number;
    covered_modes: string[];
    covered_primary_regimes: string[];
    mismatch_ids: string[];
  };
  caveats: string[];
  cases: SdrPilotEvalCaseResult[];
};

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function runSdrPilotEvaluationV01(): SdrPilotEvalReport {
  const cases: SdrPilotEvalCaseResult[] = SDR_PILOT_SCENARIOS_V0_1.map((scenario) => {
    const request = buildSdrPilotRecommendRequest(scenario.input);
    const recommendation = recommendSdrProspectingMode(scenario.input);

    return {
      case_id: scenario.id,
      title: scenario.title,
      expected_mode: scenario.expected_mode,
      actual_mode: recommendation.recommended_mode,
      expected_primary_regime: scenario.expected_primary_regime,
      actual_primary_regime: recommendation.regime_alignment.primary_regime,
      mode_match: scenario.expected_mode === recommendation.recommended_mode,
      regime_match: scenario.expected_primary_regime === recommendation.regime_alignment.primary_regime,
      mode_confidence: recommendation.mode_confidence,
      primary_algorithm: recommendation.strategy_recommendation.primary_algorithm,
      strategy_family: recommendation.strategy_recommendation.strategy_family,
      candidate_algorithms: recommendation.candidate_algorithms,
      blockers: recommendation.blockers,
      recommend_v1_request_shape: {
        problem_summary: request.request.problem_summary,
        has_missing_information: Boolean(request.request.missing_information?.length),
        mode_pressure: request.request.terrain.mode_pressure,
      },
    };
  });

  const coveredModes = [...new Set(cases.map((result) => result.actual_mode))];
  const coveredPrimaryRegimes = [...new Set(cases.map((result) => result.actual_primary_regime))];
  const mismatchIds = cases.filter((result) => !result.mode_match || !result.regime_match).map((result) => result.case_id);
  const modeMatchRate = average(cases.map((result) => (result.mode_match ? 1 : 0)));
  const regimeMatchRate = average(cases.map((result) => (result.regime_match ? 1 : 0)));

  const criteria: SdrPilotPromotionCriteria = {
    exact_mode_match: modeMatchRate === 1,
    exact_regime_match: regimeMatchRate === 1,
    covers_all_primary_regimes: coveredPrimaryRegimes.length === 4,
    covers_minimum_mode_variety: coveredModes.length >= 6,
  };

  const overallPass = Object.values(criteria).every(Boolean);

  return {
    suite_id: "sdr-pilot-v0.1",
    generated_at: new Date().toISOString(),
    overall_pass: overallPass,
    recommendation: overallPass ? "promote_to_shadow_mode" : "keep_in_lab",
    criteria,
    summary: {
      scenario_count: cases.length,
      mode_match_rate: modeMatchRate,
      regime_match_rate: regimeMatchRate,
      covered_modes: coveredModes,
      covered_primary_regimes: coveredPrimaryRegimes,
      mismatch_ids: mismatchIds,
    },
    caveats: [
      "This is still a hand-authored scenario pack, not a live SDR outcome dataset.",
      "Promotion here means the pilot is healthy enough for shadow-mode recommendation logging, not autonomous execution.",
      "Operator acceptance and downstream business impact still need AB-23 follow-on evidence outside this lab report.",
    ],
    cases,
  };
}
