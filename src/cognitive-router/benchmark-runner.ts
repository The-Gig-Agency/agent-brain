import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { DEBUGGING_V1_CASES, DEBUGGING_V1_HOLDOUT_CASES } from "./debugging-world.js";
import { runDebugCase } from "./router-runner.js";
import type { BaselinePolicyId, DebugEvalCase, DebuggingSuiteReport, DebugRunResult } from "./types.js";

const BASELINES: Exclude<BaselinePolicyId, "routed_policy">[] = [
  "naive_retry",
  "always_explore",
  "always_prune",
  "always_compound",
  "fixed_heuristic",
];

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function successRate(results: DebugRunResult[]): number {
  return average(results.map((result) => (result.success ? 1 : 0)));
}

function policyScore(results: DebugRunResult[]): number {
  return successRate(results) * 100 - average(results.map((result) => result.total_cost));
}

function strongestBaseline(allBaselineRuns: Record<string, DebugRunResult[]>): {
  id: Exclude<BaselinePolicyId, "routed_policy"> | null;
  successRate: number;
  score: number;
} {
  const ranked = Object.entries(allBaselineRuns)
    .map(([policyId, results]) => ({
      id: policyId as Exclude<BaselinePolicyId, "routed_policy">,
      successRate: successRate(results),
      score: policyScore(results),
    }))
    .sort((left, right) => right.score - left.score);

  return ranked[0] ?? { id: null, successRate: 0, score: 0 };
}

function buildPerPolicy(resultsByPolicy: Record<BaselinePolicyId, DebugRunResult[]>) {
  return Object.entries(resultsByPolicy).map(([policyId, results]) => ({
    policy_id: policyId as BaselinePolicyId,
    success_rate: successRate(results),
    average_cost: average(results.map((result) => result.total_cost)),
    average_repeated_failed_paths: average(results.map((result) => result.repeated_failed_paths)),
    average_retries_before_success: average(results.map((result) => result.retries_before_success)),
  }));
}

export function runDebuggingV1Suite(cases: DebugEvalCase[] = DEBUGGING_V1_CASES): DebuggingSuiteReport {
  const routedRuns = cases.map((debugCase) => runDebugCase(debugCase, "routed_policy"));
  const baselineRuns = Object.fromEntries(
    BASELINES.map((baseline) => [baseline, cases.map((debugCase) => runDebugCase(debugCase, baseline))]),
  ) as Record<Exclude<BaselinePolicyId, "routed_policy">, DebugRunResult[]>;

  const strongest = strongestBaseline(baselineRuns);
  const casesWithComparison = cases.map((debugCase, index) => {
    const routed = routedRuns[index];
    if (!routed) {
      throw new Error(`Missing routed run for case ${debugCase.case_id}`);
    }

    const baselines = BASELINES.map((baseline) => {
      const result = baselineRuns[baseline][index];
      if (!result) {
        throw new Error(`Missing baseline ${baseline} run for case ${debugCase.case_id}`);
      }
      return result;
    });

    const bestBaselineSuccess = baselines.some((baseline) => baseline.success);
    const bestBaselineCost = Math.min(...baselines.map((baseline) => baseline.total_cost));
    const pass = routed.success && (!bestBaselineSuccess || routed.total_cost <= bestBaselineCost);
    return {
      case_id: debugCase.case_id,
      routed,
      baselines,
      pass,
    };
  });

  return {
    suite_id: "debugging-v1",
    generated_at: new Date().toISOString(),
    summary: {
      case_count: cases.length,
      routed_success_rate: successRate(routedRuns),
      strongest_baseline_id: strongest.id,
      strongest_baseline_success_rate: strongest.successRate,
      routed_beats_strongest_baseline: policyScore(routedRuns) > strongest.score,
    },
    per_policy: buildPerPolicy({
      routed_policy: routedRuns,
      ...baselineRuns,
    }),
    cases: casesWithComparison,
  };
}

export function runDebuggingHoldoutSuite(): DebuggingSuiteReport {
  return runDebuggingV1Suite(DEBUGGING_V1_HOLDOUT_CASES);
}

export function writeSuiteReport(report: DebuggingSuiteReport, outputDir = "reports/debugging-v1") {
  mkdirSync(outputDir, { recursive: true });
  const filePath = join(outputDir, `${report.suite_id}-${report.generated_at.replaceAll(":", "-")}.json`);
  writeFileSync(filePath, JSON.stringify(report, null, 2));
  return filePath;
}
