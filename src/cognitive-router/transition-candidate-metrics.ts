import { countDriftDetected } from "./trace.js";
import { failedFixAttemptsBeforeFamilySignal } from "./trace.js";
import type { DebugEvalCase, DebuggingSuiteReport, TransitionCycleMeasurementSummary } from "./types.js";

function trapFamilyFromCaseId(caseId: string): string {
  const prefix = "candidate-tf01-";
  if (caseId.startsWith(prefix)) {
    return caseId.slice(prefix.length);
  }
  return "unknown";
}

export function computeTransitionCycleMetrics(
  cases: DebugEvalCase[],
  reportCases: DebuggingSuiteReport["cases"],
): TransitionCycleMeasurementSummary {
  if (cases.length !== reportCases.length) {
    throw new Error("computeTransitionCycleMetrics: cases and reportCases length mismatch");
  }

  const per_case = reportCases.map((row, index) => {
    const debugCase = cases[index];
    if (!debugCase) {
      throw new Error(`computeTransitionCycleMetrics: missing case at index ${index}`);
    }
    const routed = row.routed;
    const drift_events = countDriftDetected(routed.trace);
    const transition_regret =
      routed.premature_transition_regret + routed.delayed_transition_regret + routed.unnecessary_transition_cost;
    const root = debugCase.hidden_truth.root_cause;
    const failed_before_root = failedFixAttemptsBeforeFamilySignal(routed.trace, root, 2);
    const partial_resolution_handling = 1 / (1 + failed_before_root);
    const calibration_penalty = routed.repeated_failed_paths + routed.dead_end_persistence;
    const confidence_collapse_quality = 1 / (1 + routed.hysteresis_count + (routed.false_convergence ? 2 : 0));
    const premature_convergence_proxy =
      routed.false_convergence || routed.premature_transition_regret > 0;

    return {
      case_id: routed.case_id,
      trap_family: trapFamilyFromCaseId(routed.case_id),
      transition_regret,
      premature_convergence_proxy,
      drift_recovery_cost: routed.recovery_cost_after_wrong_switch,
      drift_events,
      confidence_collapse_quality,
      partial_resolution_handling,
      calibration_penalty,
    };
  });

  const case_count = per_case.length;
  const average = (pick: (row: (typeof per_case)[number]) => number) =>
    per_case.reduce((total, row) => total + pick(row), 0) / case_count;

  return {
    case_count,
    transition_regret_avg: average((row) => row.transition_regret),
    premature_convergence_proxy_rate: average((row) => (row.premature_convergence_proxy ? 1 : 0)),
    drift_recovery_cost_avg: average((row) => row.drift_recovery_cost),
    drift_events_avg: average((row) => row.drift_events),
    confidence_collapse_quality_avg: average((row) => row.confidence_collapse_quality),
    partial_resolution_handling_avg: average((row) => row.partial_resolution_handling),
    calibration_penalty_avg: average((row) => row.calibration_penalty),
    per_case,
  };
}
