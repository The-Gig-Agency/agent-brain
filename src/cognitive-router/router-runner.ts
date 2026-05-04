import { chooseBaselineAction, type RuntimeStateView } from "./baselines.js";
import { getHiddenEffect } from "./debugging-world.js";
import {
  countHysteresis,
  countRepeatedFailedPaths,
  countRetriesBeforeSuccess,
  countTransitions,
  createEmptyTrace,
  detectFalseConvergence,
  measureDeadEndPersistence,
} from "./trace.js";
import { scoreTerrain } from "./scoring.js";
import type {
  BaselinePolicyId,
  DebugEvalCase,
  DebugFamily,
  DebugRunResult,
  MemoryScoringContext,
  RouterTraceEvent,
  SearchRegime,
} from "./types.js";

type RuntimeState = {
  budgetRemaining: number;
  totalCost: number;
  observations: RouterTraceEvent[];
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
    strongSignal: margin >= 2,
  };
}

function createRuntimeState(debugCase: DebugEvalCase): RuntimeState {
  const initialRecommendation = scoreTerrain(debugCase.input_context.terrain);
  return {
    budgetRemaining: debugCase.input_context.budget,
    totalCost: 0,
    observations: createEmptyTrace(),
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

function maybeTransition(debugCase: DebugEvalCase, state: RuntimeState) {
  const memoryContext = deriveMemoryContext(state);
  const recommendation = scoreTerrain(debugCase.input_context.terrain, memoryContext);
  const { family, strongSignal } = getTopFamily(state.clueScores);

  let nextRegime = state.activeRegime;
  let reason = "";

  if (state.activeRegime === "explore" && strongSignal && family) {
    nextRegime = "prune";
    reason = `Strong signal emerged for ${family}.`;
  } else if (state.activeRegime === "prune" && strongSignal && family) {
    nextRegime = "compound";
    reason = `Search narrowed to ${family}.`;
  } else if (state.activeRegime === "compound" && state.failedFamilies[family ?? debugCase.hidden_truth.root_cause] > 0) {
    nextRegime = "explore";
    reason = "Current compounded path failed and needs new evidence.";
  } else if (recommendation.primary_regime !== state.activeRegime && recommendation.confidence >= 0.45) {
    nextRegime = recommendation.primary_regime;
    reason = `Dynamic scoring favors ${recommendation.primary_regime}.`;
  }

  if (nextRegime !== state.activeRegime) {
    appendTrace(state.observations, {
      type: "transition",
      step: state.step,
      from: state.activeRegime,
      to: nextRegime,
      reason,
    });
    state.activeRegime = nextRegime;
  } else if (state.activeRegime === "compound" && !strongSignal) {
    appendTrace(state.observations, {
      type: "drift_detected",
      step: state.step,
      regime: state.activeRegime,
      reason: "Compound regime active without strong current evidence.",
    });
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

  if (policyId === "routed_policy") {
    maybeTransition(debugCase, state);
  }
}

export function runDebugCase(debugCase: DebugEvalCase, policyId: BaselinePolicyId): DebugRunResult {
  const state = createRuntimeState(debugCase);
  appendTrace(state.observations, {
    type: "regime_selected",
    step: 0,
    regime: state.initialRecommendation.primary_regime,
    confidence: state.initialRecommendation.confidence,
    reasons: state.initialRecommendation.breakdown[0]?.reasons ?? [],
  });

  while (!state.success && state.budgetRemaining > 0 && state.step < 12) {
    executeAction(debugCase, state, policyId);
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
    false_convergence: false,
    action_count: state.executedActionIds.length,
    trace: state.observations,
  };

  result.false_convergence = detectFalseConvergence(result);
  return result;
}
