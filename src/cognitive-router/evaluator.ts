import { BENCHMARK_CASES } from "./benchmarks.js";
import { scoreTerrain } from "./scoring.js";
import type { BenchmarkCase, SearchRegime } from "./types.js";

export type BenchmarkResult = {
  benchmark: BenchmarkCase;
  actual_primary: SearchRegime;
  matched_expected: boolean;
  matched_acceptable: boolean;
  confidence: number;
  transition_candidate: SearchRegime | null;
};

export type BenchmarkSummary = {
  total: number;
  expected_matches: number;
  acceptable_matches: number;
  exact_match_rate: number;
  acceptable_match_rate: number;
  results: BenchmarkResult[];
};

export function evaluateBenchmarkCase(benchmark: BenchmarkCase): BenchmarkResult {
  const recommendation = scoreTerrain(benchmark.terrain);
  const actualPrimary = recommendation.primary_regime;

  return {
    benchmark,
    actual_primary: actualPrimary,
    matched_expected: actualPrimary === benchmark.expected_primary,
    matched_acceptable: benchmark.acceptable_regimes.includes(actualPrimary),
    confidence: recommendation.confidence,
    transition_candidate: recommendation.transition_candidate,
  };
}

export function evaluateBenchmarks(cases: BenchmarkCase[] = BENCHMARK_CASES): BenchmarkSummary {
  const results = cases.map(evaluateBenchmarkCase);
  const expectedMatches = results.filter((result) => result.matched_expected).length;
  const acceptableMatches = results.filter((result) => result.matched_acceptable).length;
  const total = results.length;

  return {
    total,
    expected_matches: expectedMatches,
    acceptable_matches: acceptableMatches,
    exact_match_rate: total === 0 ? 0 : expectedMatches / total,
    acceptable_match_rate: total === 0 ? 0 : acceptableMatches / total,
    results,
  };
}
