import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  createPermutedCase,
  DEBUGGING_CORE_V01_CASES,
  DEBUGGING_CORE_V02_CASES,
  DEBUGGING_CORE_V03_REVERSAL_CASES,
  DEBUGGING_CORE_V04_TRAP_CASES,
  DEBUGGING_V1_CASES,
  DEBUGGING_V1_HOLDOUT_CASES,
  generateDebuggingV04HoldoutCases,
} from "./debugging-world.js";
import { runDebugCase } from "./router-runner.js";
import {
  costBeforeFamilySignal,
  costBeforeFirstStrongSignal,
  failedFixAttemptsBeforeFamilySignal,
  firstThreeActions,
} from "./trace.js";
import type {
  AdversarialSuiteReport,
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
  "score_threshold",
];

const V04_HOLDOUT_CASES = generateDebuggingV04HoldoutCases();

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

export function runDebuggingCoreV03Suite(): AdversarialSuiteReport {
  const tests = [
    runLabelPermutationTest(),
    runRegimeAblationTest(),
    runMisleadingEvidenceReversalTest(),
  ];

  return {
    suite_id: "debugging-core-v0.3",
    generated_at: new Date().toISOString(),
    overall_pass: tests.every((test) => test.pass),
    tests,
  };
}

export function runDebuggingCoreV04Suite(): AdversarialSuiteReport {
  const tests = [
    runExpandedPermutationTest(),
    runAntiBroadeningTrapTest(),
    runStrongerBaselineChallengeTest(),
    runGeneratedHiddenHoldoutTest(),
  ];

  return {
    suite_id: "debugging-core-v0.4",
    generated_at: new Date().toISOString(),
    overall_pass: tests.every((test) => test.pass),
    tests,
  };
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
      score_threshold: [],
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

function runLabelPermutationTest() {
  const baseReport = runFocusedCoreSuite("debugging-core-v0.2-base", DEBUGGING_CORE_V02_CASES);
  const permutedCases = DEBUGGING_CORE_V02_CASES.map((debugCase) => createPermutedCase(debugCase));
  const permutedReport = runFocusedCoreSuite("debugging-core-v0.2-permuted", permutedCases);

  const routedSuccessDelta =
    permutedReport.summary.routed_success_rate - baseReport.summary.routed_success_rate;
  const routedCostDelta =
    permutedReport.summary.routed_average_cost - baseReport.summary.routed_average_cost;
  const fixedSuccessDelta =
    permutedReport.summary.fixed_heuristic_success_rate - baseReport.summary.fixed_heuristic_success_rate;

  const pass =
    permutedReport.go_no_go &&
    permutedReport.summary.routed_success_rate >= permutedReport.summary.fixed_heuristic_success_rate &&
    Math.abs(routedSuccessDelta) <= 0.001 &&
    Math.abs(routedCostDelta) <= 0.5 &&
    Math.abs(fixedSuccessDelta) <= 0.25;

  return {
    test_id: "label-permutation",
    title: "Label permutation invariance",
    pass,
    summary: {
      base_go_no_go: baseReport.go_no_go,
      permuted_go_no_go: permutedReport.go_no_go,
      routed_success_delta: Number(routedSuccessDelta.toFixed(3)),
      routed_cost_delta: Number(routedCostDelta.toFixed(3)),
      fixed_success_delta: Number(fixedSuccessDelta.toFixed(3)),
    },
    notes: [
      "This test shuffles family identities and action ordering to check for surface-pattern leakage.",
      "It fails if the routed win disappears after permutation.",
    ],
  };
}

function runExpandedPermutationTest() {
  const baseCases = [...DEBUGGING_CORE_V02_CASES, ...DEBUGGING_CORE_V03_REVERSAL_CASES];
  const offsets = [1, 2];
  const results = offsets.map((offset) => {
    const permutedCases = baseCases.map((debugCase) => createPermutedCase(debugCase, offset));
    const report = runFocusedCoreSuite(`debugging-core-v0.4-permuted-${offset}`, permutedCases);
    return {
      offset,
      report,
    };
  });

  const pass = results.every(
    ({ report }) =>
      report.go_no_go &&
      report.summary.routed_success_rate >= report.summary.fixed_heuristic_success_rate,
  );

  return {
    test_id: "expanded-permutation-invariance",
    title: "Expanded permutation invariance",
    pass,
    summary: {
      offset_1_go_no_go: results[0]?.report.go_no_go ?? false,
      offset_2_go_no_go: results[1]?.report.go_no_go ?? false,
      offset_1_routed_success: results[0]?.report.summary.routed_success_rate ?? null,
      offset_2_routed_success: results[1]?.report.summary.routed_success_rate ?? null,
    },
    notes: [
      "This extends the permutation check across more than one remapping offset.",
      "It fails if routed policy stops beating fixed_heuristic after simple renaming and reorderings.",
    ],
  };
}

function runRegimeAblationTest() {
  const cases = DEBUGGING_CORE_V03_REVERSAL_CASES;
  const fullRuns = cases.map((debugCase) => runDebugCase(debugCase, "routed_policy"));
  const ablatedRuns = cases.map((debugCase) =>
    runDebugCase(debugCase, "routed_policy", { disable_transitions: true }),
  );

  const fullScore = policyScore(fullRuns);
  const ablatedScore = policyScore(ablatedRuns);
  const fullFailedPaths = average(fullRuns.map((result) => result.repeated_failed_paths));
  const ablatedFailedPaths = average(ablatedRuns.map((result) => result.repeated_failed_paths));
  const fullTransitions = average(fullRuns.map((result) => result.transition_count));
  const ablatedTransitions = average(ablatedRuns.map((result) => result.transition_count));

  const pass = fullScore > ablatedScore + 0.5 || fullFailedPaths < ablatedFailedPaths;

  return {
    test_id: "regime-ablation",
    title: "Transitions materially change outcomes",
    pass,
    summary: {
      full_score: Number(fullScore.toFixed(3)),
      ablated_score: Number(ablatedScore.toFixed(3)),
      score_delta: Number((fullScore - ablatedScore).toFixed(3)),
      full_failed_paths: Number(fullFailedPaths.toFixed(3)),
      ablated_failed_paths: Number(ablatedFailedPaths.toFixed(3)),
      full_transition_count: Number(fullTransitions.toFixed(3)),
      ablated_transition_count: Number(ablatedTransitions.toFixed(3)),
    },
    notes: [
      "This test disables runtime transitions after the initial regime choice.",
      "It fails if the ablated router performs nearly identically to the full routed policy.",
    ],
  };
}

function runMisleadingEvidenceReversalTest() {
  const cases = DEBUGGING_CORE_V03_REVERSAL_CASES;
  const comparisons = cases.map((debugCase) => {
    const routed = runDebugCase(debugCase, "routed_policy");
    const fixed = runDebugCase(debugCase, "fixed_heuristic");
    const routedFailedFixes = failedFixAttemptsBeforeFamilySignal(
      routed.trace,
      debugCase.hidden_truth.root_cause,
      3,
    );
    const fixedFailedFixes = failedFixAttemptsBeforeFamilySignal(
      fixed.trace,
      debugCase.hidden_truth.root_cause,
      3,
    );
    const routedCostToRoot = costBeforeFamilySignal(routed.trace, debugCase.hidden_truth.root_cause, 3);
    const fixedCostToRoot = costBeforeFamilySignal(fixed.trace, debugCase.hidden_truth.root_cause, 3);

    return {
      case_id: debugCase.case_id,
      routed,
      fixed,
      routedFailedFixes,
      fixedFailedFixes,
      routedCostToRoot,
      fixedCostToRoot,
      pass:
        routedFailedFixes < fixedFailedFixes ||
        (routedFailedFixes === fixedFailedFixes &&
          (routedCostToRoot ?? Number.POSITIVE_INFINITY) < (fixedCostToRoot ?? Number.POSITIVE_INFINITY)),
    };
  });

  const pass = comparisons.every((comparison) => comparison.pass);

  return {
    test_id: "misleading-evidence-reversal",
    title: "Recover from early wrong evidence faster than fixed heuristic",
    pass,
    summary: {
      case_count: comparisons.length,
      passed_case_count: comparisons.filter((comparison) => comparison.pass).length,
      routed_average_failed_fixes_before_root_signal: Number(
        average(comparisons.map((comparison) => comparison.routedFailedFixes)).toFixed(3),
      ),
      fixed_average_failed_fixes_before_root_signal: Number(
        average(comparisons.map((comparison) => comparison.fixedFailedFixes)).toFixed(3),
      ),
      routed_average_cost_before_root_signal: Number(
        average(
          comparisons.map((comparison) => comparison.routedCostToRoot ?? comparison.routed.total_cost),
        ).toFixed(3),
      ),
      fixed_average_cost_before_root_signal: Number(
        average(
          comparisons.map((comparison) => comparison.fixedCostToRoot ?? comparison.fixed.total_cost),
        ).toFixed(3),
      ),
    },
    notes: comparisons.map(
      (comparison) =>
        `${comparison.case_id}: routed failed fixes before reversal=${comparison.routedFailedFixes}, fixed=${comparison.fixedFailedFixes}`,
    ),
  };
}

function runAntiBroadeningTrapTest() {
  const routedRuns = DEBUGGING_CORE_V04_TRAP_CASES.map((debugCase) => runDebugCase(debugCase, "routed_policy"));
  const fixedRuns = DEBUGGING_CORE_V04_TRAP_CASES.map((debugCase) => runDebugCase(debugCase, "fixed_heuristic"));
  const strongerRuns = DEBUGGING_CORE_V04_TRAP_CASES.map((debugCase) => runDebugCase(debugCase, "score_threshold"));

  const routedSuccess = successRate(routedRuns);
  const fixedSuccess = successRate(fixedRuns);
  const strongerSuccess = successRate(strongerRuns);
  const routedCost = average(routedRuns.map((result) => result.total_cost));
  const fixedCost = average(fixedRuns.map((result) => result.total_cost));
  const strongerCost = average(strongerRuns.map((result) => result.total_cost));
  const routedTransitions = average(routedRuns.map((result) => result.transition_count));

  const pass =
    routedSuccess >= fixedSuccess &&
    routedSuccess >= strongerSuccess &&
    routedCost <= fixedCost + 1 &&
    routedCost <= strongerCost + 1;

  return {
    test_id: "anti-broadening-traps",
    title: "Do not lose when simple narrowing is the right move",
    pass,
    summary: {
      case_count: DEBUGGING_CORE_V04_TRAP_CASES.length,
      routed_success_rate: Number(routedSuccess.toFixed(3)),
      fixed_success_rate: Number(fixedSuccess.toFixed(3)),
      stronger_success_rate: Number(strongerSuccess.toFixed(3)),
      routed_average_cost: Number(routedCost.toFixed(3)),
      fixed_average_cost: Number(fixedCost.toFixed(3)),
      stronger_average_cost: Number(strongerCost.toFixed(3)),
      routed_average_transition_count: Number(routedTransitions.toFixed(3)),
    },
    notes: [
      "These cases are designed so that simple pruning should be enough.",
      "It fails if routed policy needs adaptive drama where restraint should win.",
    ],
  };
}

function runStrongerBaselineChallengeTest() {
  const challengeCases = [
    ...DEBUGGING_CORE_V02_CASES,
    ...DEBUGGING_CORE_V03_REVERSAL_CASES,
    ...DEBUGGING_CORE_V04_TRAP_CASES,
  ];

  const routedRuns = challengeCases.map((debugCase) => runDebugCase(debugCase, "routed_policy"));
  const strongerRuns = challengeCases.map((debugCase) => runDebugCase(debugCase, "score_threshold"));

  const routedScore = policyScore(routedRuns);
  const strongerScore = policyScore(strongerRuns);
  const routedSuccess = successRate(routedRuns);
  const strongerSuccess = successRate(strongerRuns);
  const routedFailures = average(routedRuns.map((result) => result.repeated_failed_paths));
  const strongerFailures = average(strongerRuns.map((result) => result.repeated_failed_paths));

  const pass =
    routedScore > strongerScore &&
    routedSuccess >= strongerSuccess &&
    routedFailures <= strongerFailures;

  return {
    test_id: "stronger-baseline-challenge",
    title: "Beat one stronger non-trivial baseline",
    pass,
    summary: {
      case_count: challengeCases.length,
      routed_score: Number(routedScore.toFixed(3)),
      stronger_score: Number(strongerScore.toFixed(3)),
      routed_success_rate: Number(routedSuccess.toFixed(3)),
      stronger_success_rate: Number(strongerSuccess.toFixed(3)),
      routed_average_failed_paths: Number(routedFailures.toFixed(3)),
      stronger_average_failed_paths: Number(strongerFailures.toFixed(3)),
    },
    notes: [
      "The stronger baseline requires stronger evidence before fixing but does not use routed transitions.",
      "It fails if routed policy only beats weaker baselines.",
    ],
  };
}

function runGeneratedHiddenHoldoutTest() {
  const routedRuns = V04_HOLDOUT_CASES.map((debugCase) => runDebugCase(debugCase, "routed_policy"));
  const fixedRuns = V04_HOLDOUT_CASES.map((debugCase) => runDebugCase(debugCase, "fixed_heuristic"));
  const strongerRuns = V04_HOLDOUT_CASES.map((debugCase) => runDebugCase(debugCase, "score_threshold"));

  const routedScore = policyScore(routedRuns);
  const strongerScore = policyScore(strongerRuns);
  const routedSuccess = successRate(routedRuns);
  const fixedSuccess = successRate(fixedRuns);
  const strongerSuccess = successRate(strongerRuns);
  const routedDeadEnd = average(routedRuns.map((result) => result.dead_end_persistence));
  const strongerDeadEnd = average(strongerRuns.map((result) => result.dead_end_persistence));

  const pass =
    routedScore > strongerScore &&
    routedSuccess >= fixedSuccess &&
    routedSuccess >= strongerSuccess &&
    routedDeadEnd <= strongerDeadEnd;

  return {
    test_id: "generated-hidden-holdout",
    title: "Generated hidden holdout resilience",
    pass,
    summary: {
      case_count: V04_HOLDOUT_CASES.length,
      routed_score: Number(routedScore.toFixed(3)),
      stronger_score: Number(strongerScore.toFixed(3)),
      routed_success_rate: Number(routedSuccess.toFixed(3)),
      fixed_success_rate: Number(fixedSuccess.toFixed(3)),
      stronger_success_rate: Number(strongerSuccess.toFixed(3)),
      routed_average_dead_end_persistence: Number(routedDeadEnd.toFixed(3)),
      stronger_average_dead_end_persistence: Number(strongerDeadEnd.toFixed(3)),
    },
    notes: [
      "These holdout cases are generated from unseen seeds rather than copied from the development set.",
      "It fails if routed advantage collapses outside the hand-authored cases.",
    ],
  };
}

export function writeSuiteReport(
  report: DebuggingSuiteReport | DebuggingCoreV01Report | AdversarialSuiteReport,
  outputDir = "reports/debugging-v1",
) {
  mkdirSync(outputDir, { recursive: true });
  const filePath = join(outputDir, `${report.suite_id}-${report.generated_at.replaceAll(":", "-")}.json`);
  writeFileSync(filePath, JSON.stringify(report, null, 2));
  return filePath;
}
