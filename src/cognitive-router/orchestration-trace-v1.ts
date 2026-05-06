import type { RegimeRecommendation, SearchRegime } from "./types.js";

/**
 * Orchestration-summary events (not a duplicate action log).
 * Full `action` / `observation` rows stay on `DebugRunResult.trace`; correlate by `step`.
 * See docs/cognitive-router/spec/orchestration-contract.md §3.3.
 */

/** Stable schema id for orchestration JSONL / report consumers (AB-39). */
export const ORCHESTRATION_TRACE_SCHEMA_ID = "orchestration_trace_v1" as const;

export type OrchestrationVerticalSliceId = "debugging_world_v1";

export type OrchestrationTransitionTriggerV1 =
  | "strong_family_signal"
  | "targeted_inspect_compound"
  | "compound_drift_recovery"
  | "scoring_confidence_gate"
  | "other";

export type OrchestrationTraceEventV1 =
  | {
      type: "run_start";
      schema_id: typeof ORCHESTRATION_TRACE_SCHEMA_ID;
      case_id: string;
      vertical_slice_id: OrchestrationVerticalSliceId;
      policy_id: string;
    }
  | {
      type: "recommendation";
      step: number;
      primary_regime: SearchRegime;
      secondary_regime: SearchRegime | null;
      opposing_regime: SearchRegime;
      confidence: number;
      transition_candidate: SearchRegime | null;
    }
  | {
      type: "counter_regime_note";
      step: number;
      active_regime: SearchRegime;
      opposing_regime: SearchRegime;
      note: string;
    }
  | {
      type: "transition_applied";
      step: number;
      from: SearchRegime;
      to: SearchRegime;
      trigger: OrchestrationTransitionTriggerV1;
      detail: string;
    }
  | {
      type: "drift_signal";
      step: number;
      regime: SearchRegime;
      detail: string;
    }
  | {
      type: "run_end";
      success: boolean;
      final_regime: SearchRegime;
      total_steps: number;
      total_cost: number;
    };

export function appendRecommendationSnapshot(
  trace: OrchestrationTraceEventV1[],
  step: number,
  recommendation: RegimeRecommendation,
): void {
  trace.push({
    type: "recommendation",
    step,
    primary_regime: recommendation.primary_regime,
    secondary_regime: recommendation.secondary_regime,
    opposing_regime: recommendation.opposing_regime,
    confidence: recommendation.confidence,
    transition_candidate: recommendation.transition_candidate,
  });
}

export function appendCounterRegimeNote(
  trace: OrchestrationTraceEventV1[],
  step: number,
  activeRegime: SearchRegime,
  opposingRegime: SearchRegime,
  note: string,
): void {
  trace.push({
    type: "counter_regime_note",
    step,
    active_regime: activeRegime,
    opposing_regime: opposingRegime,
    note,
  });
}
