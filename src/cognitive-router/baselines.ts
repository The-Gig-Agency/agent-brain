import type {
  BaselinePolicyId,
  DebugFamily,
  SearchRegime,
  VisibleDebugAction,
} from "./types.js";

export type RuntimeStateView = {
  availableActions: VisibleDebugAction[];
  executedActionIds: string[];
  failedFamilyCounts: Record<DebugFamily, number>;
  inferredFamily: DebugFamily | null;
  strongSignal: boolean;
};

function isUntried(action: VisibleDebugAction, state: RuntimeStateView): boolean {
  return !state.executedActionIds.includes(action.id);
}

function firstMatching<T>(items: T[], predicate: (item: T) => boolean): T | null {
  return items.find(predicate) ?? null;
}

function chooseInspectAction(state: RuntimeStateView, family?: DebugFamily): VisibleDebugAction | null {
  const candidates = state.availableActions.filter(
    (action) => action.kind === "inspect" && isUntried(action, state) && (!family || action.family === family),
  );
  return candidates.sort((left, right) => left.cost - right.cost)[0] ?? null;
}

function chooseFixAction(state: RuntimeStateView, family?: DebugFamily): VisibleDebugAction | null {
  const candidates = state.availableActions.filter(
    (action) => action.kind === "fix" && (!family || action.family === family),
  );
  return candidates.sort((left, right) => left.cost - right.cost)[0] ?? null;
}

function chooseAlternativeInspectAction(state: RuntimeStateView, excludedFamily: DebugFamily): VisibleDebugAction | null {
  const candidates = state.availableActions.filter(
    (action) => action.kind === "inspect" && action.family !== excludedFamily && isUntried(action, state),
  );
  return candidates.sort((left, right) => left.cost - right.cost)[0] ?? null;
}

function chooseLeastFailedFamily(state: RuntimeStateView): DebugFamily | null {
  const inspectFamilies = state.availableActions
    .filter((action) => action.kind === "inspect")
    .map((action) => action.family)
    .filter((family, index, all) => all.indexOf(family) === index);

  const sorted = inspectFamilies.sort(
    (left, right) => (state.failedFamilyCounts[left] ?? 0) - (state.failedFamilyCounts[right] ?? 0),
  );
  return sorted[0] ?? null;
}

export function chooseBaselineAction(policyId: Exclude<BaselinePolicyId, "routed_policy">, state: RuntimeStateView) {
  if (policyId === "naive_retry") {
    const firstFix = state.availableActions.find((action) => action.kind === "fix") ?? null;
    if (!firstFix) {
      return chooseInspectAction(state);
    }
    return firstFix;
  }

  if (policyId === "always_explore") {
    return chooseInspectAction(state) ?? chooseFixAction(state, state.inferredFamily ?? undefined);
  }

  if (policyId === "always_prune") {
    const family = chooseLeastFailedFamily(state);
    return chooseInspectAction(state, family ?? undefined) ?? chooseFixAction(state, state.inferredFamily ?? family ?? undefined);
  }

  if (policyId === "always_compound") {
    const family = state.inferredFamily ?? chooseLeastFailedFamily(state);
    return chooseFixAction(state, family ?? undefined) ?? chooseInspectAction(state, family ?? undefined);
  }

  if (policyId === "score_threshold") {
    const logInspect = firstMatching(
      state.availableActions,
      (action) => action.kind === "inspect" && action.id === "inspect:logs" && isUntried(action, state),
    );
    if (logInspect) {
      return logInspect;
    }

    if (state.strongSignal && state.inferredFamily) {
      return chooseFixAction(state, state.inferredFamily);
    }

    if (state.inferredFamily) {
      const targetedInspect = chooseInspectAction(state, state.inferredFamily);
      if (targetedInspect) {
        return targetedInspect;
      }

      const alternativeInspect = chooseAlternativeInspectAction(state, state.inferredFamily);
      if (alternativeInspect) {
        return alternativeInspect;
      }
    }

    return (
      chooseInspectAction(state, chooseLeastFailedFamily(state) ?? undefined) ??
      chooseInspectAction(state) ??
      chooseFixAction(state, state.inferredFamily ?? chooseLeastFailedFamily(state) ?? undefined)
    );
  }

  const logInspect = firstMatching(
    state.availableActions,
    (action) => action.kind === "inspect" && action.id === "inspect:logs" && isUntried(action, state),
  );
  if (logInspect) {
    return logInspect;
  }

  if (state.strongSignal && state.inferredFamily) {
    return chooseFixAction(state, state.inferredFamily);
  }

  return (
    chooseInspectAction(state, state.inferredFamily ?? chooseLeastFailedFamily(state) ?? undefined) ??
    chooseInspectAction(state) ??
    chooseFixAction(state, state.inferredFamily ?? chooseLeastFailedFamily(state) ?? undefined)
  );
}

export function regimeToBaseline(regime: SearchRegime): Exclude<BaselinePolicyId, "routed_policy"> {
  switch (regime) {
    case "prune":
      return "always_prune";
    case "explore":
      return "always_explore";
    case "compound":
      return "always_compound";
    case "coordinate":
      return "fixed_heuristic";
  }
}
