import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { DEBUGGING_CORE_V01_CASES, DEBUGGING_CORE_V02_CASES, DEBUGGING_V1_CASES, DEBUGGING_V1_HOLDOUT_CASES } from "./debugging-world.js";
import { runDebugCase } from "./router-runner.js";
import { costBeforeFirstStrongSignal, firstThreeActions } from "./trace.js";
import type {
  BaselinePolicyId,
  DebugEvalCase,
  DebuggingCoreV01Report,
  DebuggingSuiteReport,
  DebugRunResult,
} from "./types.js";

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
    average_transition_count: average(results.map((result) => result.transition_count)),
    average_hysteresis_count: average(results.map((result) => result.hysteresis_count)),
    average_dead_end_persistence: average(results.map((result) => result.dead_end_persistence)),
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

export function runDebuggingCoreV01Suite(): DebuggingCoreV01Report {
  return runFocusedCoreSuite("debugging-core-v0.1", DEBUGGING_CORE_V01_CASES);
}

export function runDebuggingCoreV02Suite(): DebuggingCoreV01Report {
  return runFocusedCoreSuite("debugging-core-v0.2", DEBUGGING_CORE_V02_CASES);
}

function runFocusedCoreSuite(suiteId: string, cases: DebugEvalCase[]): DebuggingCoreV01Report {
  const routedRuns = cases.map((debugCase) => runDebugCase(debugCase, "routed_policy"));
  const comparedBaselines: Exclude<BaselinePolicyId, "routed_policy">[] = [
    "naive_retry",
    "always_compound",
    "fixed_heuristic",
  ];
  const baselineRuns = Object.fromEntries(
    comparedBaselines.map((baseline) => [baseline, cases.map((debugCase) => runDebugCase(debugCase, baseline))]),
  ) as Record<Exclude<BaselinePolicyId, "routed_policy">, DebugRunResult[]>;

  const routedSuccess = successRate(routedRuns);
  const fixedSuccess = successRate(baselineRuns.fixed_heuristic);
  const routedCost = average(routedRuns.map((result) => result.total_cost));
  const naiveCost = average(baselineRuns.naive_retry.map((result) => result.total_cost));
  const routedFailures = average(routedRuns.map((result) => result.repeated_failed_paths));
  const naiveFailures = average(baselineRuns.naive_retry.map((result) => result.repeated_failed_paths));
  const compoundFailures = average(baselineRuns.always_compound.map((result) => result.repeated_failed_paths));

  const criteria = {
    routed_not_worse_than_fixed_heuristic_on_success: routedSuccess >= fixedSuccess,
    routed_beats_naive_retry_on_failed_paths: routedFailures < naiveFailures,
    routed_beats_naive_retry_on_cost: routedCost < naiveCost,
    routed_beats_always_compound_on_failed_paths: routedFailures < compoundFailures,
  };

  return {
    suite_id: suiteId,
    generated_at: new Date().toISOString(),
    go_no_go: Object.values(criteria).every(Boolean),
    criteria,
    summary: {
      case_count: cases.length,
      routed_success_rate: routedSuccess,
      fixed_heuristic_success_rate: fixedSuccess,
      routed_average_cost: routedCost,
      naive_retry_average_cost: naiveCost,
      routed_average_repeated_failed_paths: routedFailures,
      naive_retry_average_repeated_failed_paths: naiveFailures,
      always_compound_average_repeated_failed_paths: compoundFailures,
      routed_average_hysteresis_count: average(routedRuns.map((result) => result.hysteresis_count)),
      routed_average_dead_end_persistence: average(routedRuns.map((result) => result.dead_end_persistence)),
    },
    per_policy: buildPerPolicy({
      routed_policy: routedRuns,
      naive_retry: baselineRuns.naive_retry,
      always_explore: [],
      always_prune: [],
      always_compound: baselineRuns.always_compound,
      fixed_heuristic: baselineRuns.fixed_heuristic,
    }).filter((entry) => ["routed_policy", "naive_retry", "always_compound", "fixed_heuristic"].includes(entry.policy_id)),
    cases: cases.map((debugCase, index) => {
      const routed = routedRuns[index];
      if (!routed) {
        throw new Error(`Missing routed run for focused case ${debugCase.case_id}`);
      }
      const fixedHeuristic = baselineRuns.fixed_heuristic[index];
      if (!fixedHeuristic) {
        throw new Error(`Missing fixed_heuristic run for focused case ${debugCase.case_id}`);
      }
      return {
        case_id: debugCase.case_id,
        routed,
        baselines: comparedBaselines.map((baseline) => {
          const result = baselineRuns[baseline][index];
          if (!result) {
            throw new Error(`Missing ${baseline} run for focused case ${debugCase.case_id}`);
          }
          return result;
        }),
        diagnostics: {
          routed_first_three_actions: firstThreeActions(routed.trace),
          fixed_heuristic_first_three_actions: firstThreeActions(fixedHeuristic.trace),
          routed_cost_before_first_strong_signal: costBeforeFirstStrongSignal(routed.trace),
          fixed_heuristic_cost_before_first_strong_signal: costBeforeFirstStrongSignal(fixedHeuristic.trace),
        },
      };
    }),
  };
}

export function writeSuiteReport(report: DebuggingSuiteReport | DebuggingCoreV01Report, outputDir = "reports/debugging-v1") {
  mkdirSync(outputDir, { recursive: true });
  const filePath = join(outputDir, `${report.suite_id}-${report.generated_at.replaceAll(":", "-")}.json`);
  writeFileSync(filePath, JSON.stringify(report, null, 2));
  return filePath;
}
