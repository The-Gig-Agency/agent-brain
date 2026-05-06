import { chooseBaselineAction, type RuntimeStateView } from "./baselines.js";
import { getHiddenEffect } from "./debugging-world.js";
import { ORCHESTRATION_V1 } from "./orchestration-transition-constants.js";
import {
  appendCounterRegimeNote,
  appendRecommendationSnapshot,
  ORCHESTRATION_TRACE_SCHEMA_ID,
  type OrchestrationTraceEventV1,
  type OrchestrationTransitionTriggerV1,
} from "./orchestration-trace-v1.js";
import {
  countHysteresis,
  countRepeatedFailedPaths,
  countRetriesBeforeSuccess,
  countTransitions,
  createEmptyTrace,
  detectFalseConvergence,
  measureDelayedTransitionRegret,
  measureDeadEndPersistence,
  measurePrematureTransitionRegret,
  measureRecoveryCostAfterWrongSwitch,
  measureUnnecessaryTransitionCost,
} from "./trace.js";
import { scoreTerrain } from "./scoring.js";
import type {
  BaselinePolicyId,
  DebugEvalCase,
  DebugRunOptions,
  DebugFamily,
  DebugRunResult,
  MemoryScoringContext,
  RouterTraceEvent,
  SearchRegime,
  TerrainMemoryAblation,
} from "./types.js";

type RuntimeState = {
  budgetRemaining: number;
  totalCost: number;
  observations: RouterTraceEvent[];
  /** Populated only for `routed_policy` runs — `orchestration_trace_v1` stream (AB-39). */
  orchestrationTrace: OrchestrationTraceEventV1[] | null;
  clueScores: Record<DebugFamily, number>;
  failedFamilies: Record<DebugFamily, number>;
  failedActions: Record<string, number>;
  executedActionIds: string[];
  success: boolean;
  step: number;
  activeRegime: SearchRegime;
  initialRecommendation: ReturnType<typeof scoreTerrain>;
};

function createFamilyRecord(): Record<DebugFamily, number> {
  return {
    dependency: 0,
    version: 0,
    test_flake: 0,
    regression: 0,
    env: 0,
    secret_scope: 0,
    cache: 0,
    logic: 0,
    validation: 0,
    downstream_api: 0,
    race: 0,
    stale_state: 0,
    retry_policy: 0,
    outage: 0,
    schema: 0,
    serialization: 0,
    permission: 0,
    artifact: 0,
    observability: 0,
  };
}

function getTopFamily(scores: Record<DebugFamily, number>): { family: DebugFamily | null; strongSignal: boolean } {
  const ranked = Object.entries(scores)
    .sort((left, right) => right[1] - left[1]) as Array<[DebugFamily, number]>;

  const top = ranked[0];
  const second = ranked[1];
  if (!top || top[1] <= 0) {
    return { family: null, strongSignal: false };
  }

  const margin = top[1] - (second?.[1] ?? 0);
  return {
    family: top[0],
    strongSignal: margin >= ORCHESTRATION_V1.STRONG_FAMILY_SIGNAL_MARGIN,
  };
}

function createRuntimeState(debugCase: DebugEvalCase): RuntimeState {
  const initialRecommendation = scoreTerrain(debugCase.input_context.terrain);
  return {
    budgetRemaining: debugCase.input_context.budget,
    totalCost: 0,
    observations: createEmptyTrace(),
    orchestrationTrace: null,
    clueScores: createFamilyRecord(),
    failedFamilies: createFamilyRecord(),
    failedActions: {},
    executedActionIds: [],
    success: false,
    step: 0,
    activeRegime: initialRecommendation.primary_regime,
    initialRecommendation,
  };
}

function appendTrace(trace: RouterTraceEvent[], event: RouterTraceEvent) {
  trace.push(event);
}

function runtimeView(debugCase: DebugEvalCase, state: RuntimeState): RuntimeStateView {
  const topFamily = getTopFamily(state.clueScores);
  return {
    availableActions: debugCase.input_context.available_actions,
    executedActionIds: state.executedActionIds,
    failedFamilyCounts: state.failedFamilies,
    inferredFamily: topFamily.family,
    strongSignal: topFamily.strongSignal,
  };
}

function chooseVisibleAction(
  state: RuntimeStateView,
  predicate: (action: RuntimeStateView["availableActions"][number]) => boolean,
) {
  return state.availableActions.find(predicate) ?? null;
}

function chooseCheapestAction(
  state: RuntimeStateView,
  predicate: (action: RuntimeStateView["availableActions"][number]) => boolean,
) {
  return (
    state.availableActions
      .filter(predicate)
      .sort((left, right) => left.cost - right.cost)[0] ?? null
  );
}

function deriveMemoryContext(state: RuntimeState): MemoryScoringContext {
  const repeatedFailedPathCount = Object.values(state.failedFamilies).filter((count) => count > 1).length;
  const disprovenFamilyCount = Object.values(state.clueScores).filter((score) => score < 0).length;
  const strongSignalFamilyCount = Object.values(state.clueScores).filter((score) => score >= 3).length;
  return {
    repeated_failed_path_count: repeatedFailedPathCount,
    disproven_family_count: disprovenFamilyCount,
    strong_signal_family_count: strongSignalFamilyCount,
  };
}

function augmentMemoryContextForAblation(state: RuntimeState, options: DebugRunOptions): MemoryScoringContext {
  const base = deriveMemoryContext(state);
  const ctx: MemoryScoringContext = { ...base };
  if (options.disable_failed_path_memory) {
    ctx.repeated_failed_path_count = 0;
  }
  if (options.disable_confidence_gating) {
    ctx.strong_signal_family_count = 0;
  }
  return ctx;
}

function hasTargetedInspectEvidence(state: RuntimeState, family: DebugFamily | null): boolean {
  if (!family) {
    return false;
  }

  return state.executedActionIds.includes(`inspect:${family}`);
}

function maybeTransition(debugCase: DebugEvalCase, state: RuntimeState, options: DebugRunOptions = {}) {
  const memoryContext = augmentMemoryContextForAblation(state, options);
  const memoryAblation: TerrainMemoryAblation | undefined =
    options.disable_failed_path_memory || options.disable_confidence_gating
      ? {
          skip_failed_path_memory: Boolean(options.disable_failed_path_memory),
          skip_strong_signal_memory: Boolean(options.disable_confidence_gating),
          skip_disproven_memory: Boolean(options.disable_confidence_gating),
        }
      : undefined;
  const recommendation = scoreTerrain(debugCase.input_context.terrain, memoryContext, memoryAblation);
  const orch = state.orchestrationTrace;

  if (orch) {
    appendRecommendationSnapshot(orch, state.step, recommendation);
    appendCounterRegimeNote(
      orch,
      state.step,
      state.activeRegime,
      recommendation.opposing_regime,
      `Active ${state.activeRegime}; scored primary ${recommendation.primary_regime}; counter-regime lens ${recommendation.opposing_regime}.`,
    );
  }

  const { family, strongSignal } = getTopFamily(state.clueScores);

  let nextRegime = state.activeRegime;
  let reason = "";
  let transitionTrigger: OrchestrationTransitionTriggerV1 = "other";

  if (state.activeRegime === "explore" && strongSignal && family) {
    nextRegime = "prune";
    reason = `Strong signal emerged for ${family}.`;
    transitionTrigger = "strong_family_signal";
  } else if (
    state.activeRegime === "prune" &&
    strongSignal &&
    family &&
    (options.disable_inspection_before_compound || hasTargetedInspectEvidence(state, family))
  ) {
    nextRegime = "compound";
    reason = `Search narrowed to ${family} after targeted inspection.`;
    transitionTrigger = "targeted_inspect_compound";
  } else if (
    !options.disable_drift_recovery &&
    state.activeRegime === "compound" &&
    state.failedFamilies[family ?? debugCase.hidden_truth.root_cause] > 0
  ) {
    nextRegime = "explore";
    reason = "Current compounded path failed and needs new evidence.";
    transitionTrigger = "compound_drift_recovery";
  } else if (
    !options.disable_confidence_gating &&
    recommendation.primary_regime !== state.activeRegime &&
    recommendation.confidence >= ORCHESTRATION_V1.MIN_PRIMARY_CONFIDENCE_FOR_REGIME_SWITCH
  ) {
    nextRegime = recommendation.primary_regime;
    reason = `Dynamic scoring favors ${recommendation.primary_regime}.`;
    transitionTrigger = "scoring_confidence_gate";
  }

  if (nextRegime !== state.activeRegime) {
    appendTrace(state.observations, {
      type: "transition",
      step: state.step,
      from: state.activeRegime,
      to: nextRegime,
      reason,
    });
    if (orch) {
      orch.push({
        type: "transition_applied",
        step: state.step,
        from: state.activeRegime,
        to: nextRegime,
        trigger: transitionTrigger,
        detail: reason,
      });
    }
    state.activeRegime = nextRegime;
  } else if (!options.disable_drift_recovery && state.activeRegime === "compound" && !strongSignal) {
    const driftReason = "Compound regime active without strong current evidence.";
    appendTrace(state.observations, {
      type: "drift_detected",
      step: state.step,
      regime: state.activeRegime,
      reason: driftReason,
    });
    if (orch) {
      orch.push({
        type: "drift_signal",
        step: state.step,
        regime: state.activeRegime,
        detail: driftReason,
      });
    }
  }
}

function chooseRoutedAction(debugCase: DebugEvalCase, state: RuntimeState) {
  const view = runtimeView(debugCase, state);
  const logsAction = chooseVisibleAction(
    view,
    (action) => action.id === "inspect:logs" && !view.executedActionIds.includes(action.id),
  );

  if (state.activeRegime === "explore") {
    if (logsAction) {
      return logsAction;
    }

    if (view.inferredFamily && !view.strongSignal) {
      const alternativeInspect = chooseCheapestAction(
        view,
        (action) =>
          action.kind === "inspect" &&
          action.family !== view.inferredFamily &&
          !view.executedActionIds.includes(action.id),
      );
      if (alternativeInspect) {
        return alternativeInspect;
      }
    }

    if (view.inferredFamily) {
      const targetedInspect = chooseCheapestAction(
        view,
        (action) =>
          action.kind === "inspect" &&
          action.family === view.inferredFamily &&
          !view.executedActionIds.includes(action.id),
      );
      if (targetedInspect) {
        return targetedInspect;
      }
    }

    const nextInspect = chooseCheapestAction(
      view,
      (action) => action.kind === "inspect" && !view.executedActionIds.includes(action.id),
    );
    if (nextInspect) {
      return nextInspect;
    }
  }

  if (state.activeRegime === "prune") {
    if (view.strongSignal && view.inferredFamily) {
      const fix = chooseCheapestAction(
        view,
        (action) => action.kind === "fix" && action.family === view.inferredFamily,
      );
      if (fix) {
        return fix;
      }
    }

    if (view.inferredFamily) {
      const inspect = chooseCheapestAction(
        view,
        (action) =>
          action.kind === "inspect" &&
          action.family === view.inferredFamily &&
          !view.executedActionIds.includes(action.id),
      );
      if (inspect) {
        return inspect;
      }
    }
  }

  if (state.activeRegime === "compound" && view.inferredFamily) {
    const fix = chooseCheapestAction(view, (action) => action.kind === "fix" && action.family === view.inferredFamily);
    if (fix) {
      return fix;
    }
  }

  if (state.activeRegime === "coordinate" && logsAction) {
    return logsAction;
  }

  const fallback = chooseBaselineAction("fixed_heuristic", view);
  if (!fallback) {
    throw new Error(`No available routed action for regime ${state.activeRegime} on ${debugCase.case_id}`);
  }
  return fallback;
}

function chooseActionForPolicy(
  policyId: BaselinePolicyId,
  debugCase: DebugEvalCase,
  state: RuntimeState,
) {
  if (policyId === "routed_policy") {
    return chooseRoutedAction(debugCase, state);
  }

  const action = chooseBaselineAction(policyId, runtimeView(debugCase, state));
  if (!action) {
    throw new Error(`No available action for baseline ${policyId} on ${debugCase.case_id}`);
  }
  return action;
}

function executeAction(
  debugCase: DebugEvalCase,
  state: RuntimeState,
  policyId: BaselinePolicyId,
  options: DebugRunOptions,
  actionIdOverride?: string,
) {
  const action =
    debugCase.input_context.available_actions.find((candidate) => candidate.id === actionIdOverride) ??
    chooseActionForPolicy(policyId, debugCase, state);

  state.step += 1;
  const repeated = state.executedActionIds.includes(action.id);
  state.executedActionIds.push(action.id);
  state.budgetRemaining -= action.cost;
  state.totalCost += action.cost;

  appendTrace(state.observations, {
    type: "action",
    step: state.step,
    action_id: action.id,
    label: action.label,
    family: action.family,
    kind: action.kind,
    repeated,
    cost: action.cost,
  });

  const effect = getHiddenEffect(debugCase, action.id);
  const signalBeforeAction = state.clueScores[action.family] ?? 0;
  const emittedObservations = effect.success
    ? signalBeforeAction >= (effect.signal_threshold ?? 0)
      ? effect.observations
      : [
          {
            id: `${debugCase.case_id}:${action.family}:premature-fix`,
            family: action.family,
            polarity: "negative" as const,
            strength: 2 as const,
            text: `The ${action.family.replaceAll("_", " ")} fix was attempted before enough evidence existed.`,
          },
        ]
    : effect.observations;

  for (const observation of emittedObservations) {
    appendTrace(state.observations, {
      type: "observation",
      step: state.step,
      observation,
    });
    const delta = observation.polarity === "positive" ? observation.strength : -observation.strength;
    state.clueScores[observation.family] += delta;
  }

  if (effect.success && signalBeforeAction >= (effect.signal_threshold ?? 0)) {
    state.success = true;
  } else if (action.kind === "fix") {
    state.failedFamilies[action.family] += 1;
    state.failedActions[action.id] = (state.failedActions[action.id] ?? 0) + 1;
    appendTrace(state.observations, {
      type: "failed_path",
      step: state.step,
      action_id: action.id,
      family: action.family,
      reason: repeated ? "budget_burn" : "failed_fix",
      count: state.failedFamilies[action.family],
    });
  }

  if (policyId === "routed_policy" && !options.disable_transitions && !state.success) {
    maybeTransition(debugCase, state, options);
  }
}

export function runDebugCase(
  debugCase: DebugEvalCase,
  policyId: BaselinePolicyId,
  options: DebugRunOptions = {},
): DebugRunResult {
  const state = createRuntimeState(debugCase);
  const orchestrationEnabled = policyId === "routed_policy";
  if (orchestrationEnabled) {
    state.orchestrationTrace = [
      {
        type: "run_start",
        schema_id: ORCHESTRATION_TRACE_SCHEMA_ID,
        case_id: debugCase.case_id,
        vertical_slice_id: "debugging_world_v1",
        policy_id: policyId,
      },
    ];
  }

  appendTrace(state.observations, {
    type: "regime_selected",
    step: 0,
    regime: state.initialRecommendation.primary_regime,
    confidence: state.initialRecommendation.confidence,
    reasons: state.initialRecommendation.breakdown[0]?.reasons ?? [],
  });

  while (
    !state.success &&
    state.budgetRemaining > 0 &&
    state.step < ORCHESTRATION_V1.MAX_STEPS_PER_RUN
  ) {
    executeAction(debugCase, state, policyId, options);
  }

  if (state.orchestrationTrace) {
    state.orchestrationTrace.push({
      type: "run_end",
      success: state.success,
      final_regime: state.activeRegime,
      total_steps: state.step,
      total_cost: state.totalCost,
    });
  }

  const result: DebugRunResult = {
    case_id: debugCase.case_id,
    title: debugCase.title,
    policy_id: policyId,
    predicted_regime: state.initialRecommendation.primary_regime,
    final_regime: state.activeRegime,
    confidence: state.initialRecommendation.confidence,
    transition_recommendation: state.initialRecommendation.transition_candidate,
    success: state.success,
    total_cost: state.totalCost,
    repeated_failed_paths: countRepeatedFailedPaths(state.observations),
    retries_before_success: countRetriesBeforeSuccess(state.observations),
    transition_count: countTransitions(state.observations),
    hysteresis_count: countHysteresis(state.observations),
    dead_end_persistence: measureDeadEndPersistence(state.observations),
    premature_transition_regret: measurePrematureTransitionRegret(state.observations),
    delayed_transition_regret: measureDelayedTransitionRegret(state.observations),
    unnecessary_transition_cost: measureUnnecessaryTransitionCost(state.observations),
    recovery_cost_after_wrong_switch: measureRecoveryCostAfterWrongSwitch(state.observations),
    false_convergence: false,
    action_count: state.executedActionIds.length,
    trace: state.observations,
    ...(state.orchestrationTrace ? { orchestration_trace: state.orchestrationTrace } : {}),
  };

  result.false_convergence = detectFalseConvergence(result);
  return result;
}
