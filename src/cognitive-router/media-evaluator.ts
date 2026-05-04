import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { recommendMediaAction } from "./media-decision.js";
import type { MediaDecisionInput, MediaDecisionRunOptions, MediaRecommendedAction } from "./types.js";

type ConfidenceBand = "low" | "medium" | "high";

type MediaEvalCase = {
  id: string;
  title: string;
  expected_action: MediaRecommendedAction;
  acceptable_actions: MediaRecommendedAction[];
  expected_confidence_band: ConfidenceBand;
  minimum_rationale_points: number;
  input: MediaDecisionInput;
  expected_operator_recommendations: {
    keep: string[];
    cut: string[];
    test_next: string[];
  };
};

type MediaEvalDataset = {
  dataset_name: string;
  purpose: string;
  cases: MediaEvalCase[];
};

type MediaEvalCaseResult = {
  case_id: string;
  expected_action: MediaRecommendedAction;
  recommended_action: MediaRecommendedAction;
  action_match: boolean;
  acceptable_match: boolean;
  expected_confidence_band: ConfidenceBand;
  actual_confidence: number;
  confidence_band_match: boolean;
  rationale_count: number;
  rationale_quality_pass: boolean;
  operator_recommendations: {
    keep: string[];
    cut: string[];
    test_next: string[];
  };
};

export type MediaEvalReport = {
  suite_id: string;
  generated_at: string;
  dataset_name: string;
  overall_pass: boolean;
  summary: {
    case_count: number;
    exact_action_match_rate: number;
    acceptable_action_match_rate: number;
    confidence_band_match_rate: number;
    rationale_quality_pass_rate: number;
  };
  caveats: string[];
  cases: MediaEvalCaseResult[];
};

const FIXTURE_DIR = resolve(process.cwd(), "fixtures/echelon");

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function confidenceToBand(value: number): ConfidenceBand {
  if (value >= 0.72) {
    return "high";
  }
  if (value >= 0.45) {
    return "medium";
  }
  return "low";
}

function loadMediaEvalDataset(fileName = "media-decision-v0.1.json"): MediaEvalDataset {
  const filePath = resolve(FIXTURE_DIR, fileName);
  return JSON.parse(readFileSync(filePath, "utf8")) as MediaEvalDataset;
}

export function runMediaEvaluationSuite(
  fileName = "media-decision-v0.1.json",
  recommendOptions: MediaDecisionRunOptions = {},
): MediaEvalReport {
  const dataset = loadMediaEvalDataset(fileName);

  const caseResults = dataset.cases.map((mediaCase) => {
    const recommendation = recommendMediaAction(mediaCase.input, recommendOptions);
    const confidenceBand = confidenceToBand(recommendation.action_confidence);

    return {
      case_id: mediaCase.id,
      expected_action: mediaCase.expected_action,
      recommended_action: recommendation.recommended_action,
      action_match: recommendation.recommended_action === mediaCase.expected_action,
      acceptable_match: mediaCase.acceptable_actions.includes(recommendation.recommended_action),
      expected_confidence_band: mediaCase.expected_confidence_band,
      actual_confidence: recommendation.action_confidence,
      confidence_band_match: confidenceBand === mediaCase.expected_confidence_band,
      rationale_count: recommendation.rationale.length,
      rationale_quality_pass: recommendation.rationale.length >= mediaCase.minimum_rationale_points,
      operator_recommendations: mediaCase.expected_operator_recommendations,
    } as MediaEvalCaseResult;
  });

  const exactMatchRate = average(caseResults.map((result) => (result.action_match ? 1 : 0)));
  const acceptableMatchRate = average(caseResults.map((result) => (result.acceptable_match ? 1 : 0)));
  const confidenceBandMatchRate = average(caseResults.map((result) => (result.confidence_band_match ? 1 : 0)));
  const rationalePassRate = average(caseResults.map((result) => (result.rationale_quality_pass ? 1 : 0)));

  return {
    suite_id: "media-decision-v0.1",
    generated_at: new Date().toISOString(),
    dataset_name: dataset.dataset_name,
    overall_pass: acceptableMatchRate >= 0.83 && confidenceBandMatchRate >= 0.66 && rationalePassRate >= 1,
    summary: {
      case_count: caseResults.length,
      exact_action_match_rate: exactMatchRate,
      acceptable_action_match_rate: acceptableMatchRate,
      confidence_band_match_rate: confidenceBandMatchRate,
      rationale_quality_pass_rate: rationalePassRate,
    },
    caveats: [
      "This evaluation measures action-selection quality and confidence calibration, not live budget impact.",
      "Operator recommendations are template guidance and should be paired with account constraints and guardrails.",
      "The initial pack is intentionally small and should be expanded before automation claims.",
    ],
    cases: caseResults,
  };
}
