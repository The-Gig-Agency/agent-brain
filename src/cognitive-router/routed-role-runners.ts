/**
 * AB-17 — Regime-scoped **role runners** for `routed_policy` action selection.
 * Each runner returns a concrete visible action or `null` to defer to the shared
 * `fixed_heuristic` fallback in `router-runner.ts`.
 *
 * Mapping (v1 debugging world):
 * - **explorer** — `explore` regime: observability-first, then targeted / broad inspect.
 * - **optimizer** — `prune` regime: strong-signal fix, else narrow inspect.
 * - **constraint** — `compound` regime: cheapest fix on inferred family.
 * - **adversarial** — opposing-hypothesis inspect inside explore; **coordinate** regime uses the coordinate adversarial runner (logs-first).
 */
import type { RuntimeStateView } from "./baselines.js";
import type { SearchRegime, VisibleDebugAction } from "./types.js";

export const ROUTED_ROLE_IDS = ["explorer", "optimizer", "constraint", "adversarial"] as const;

export type RoutedRoleId = (typeof ROUTED_ROLE_IDS)[number];

function chooseVisibleAction(
  state: RuntimeStateView,
  predicate: (action: RuntimeStateView["availableActions"][number]) => boolean,
): VisibleDebugAction | null {
  return state.availableActions.find(predicate) ?? null;
}

function chooseCheapestAction(
  state: RuntimeStateView,
  predicate: (action: RuntimeStateView["availableActions"][number]) => boolean,
): VisibleDebugAction | null {
  return (
    state.availableActions
      .filter(predicate)
      .sort((left, right) => left.cost - right.cost)[0] ?? null
  );
}

/** Which AB-17 role owns action policy for the active search regime (v1). */
export function routedRoleIdForRegime(regime: SearchRegime): RoutedRoleId {
  switch (regime) {
    case "explore":
      return "explorer";
    case "prune":
      return "optimizer";
    case "compound":
      return "constraint";
    case "coordinate":
      return "adversarial";
    default: {
      const _exhaustive: never = regime;
      return _exhaustive;
    }
  }
}

/**
 * Adversarial role — challenge the current top hypothesis before doubling down.
 * Used inside the explorer regime when an inferred family exists but the signal is not yet strong.
 */
export function chooseAdversarialOppositionInspect(view: RuntimeStateView): VisibleDebugAction | null {
  if (!view.inferredFamily || view.strongSignal) {
    return null;
  }
  return chooseCheapestAction(
    view,
    (action) =>
      action.kind === "inspect" &&
      action.family !== view.inferredFamily &&
      !view.executedActionIds.includes(action.id),
  );
}

/** Explorer role — broaden evidence (logs → adversarial probe → targeted → any inspect). */
export function chooseExplorerRoleAction(view: RuntimeStateView): VisibleDebugAction | null {
  const logsAction = chooseVisibleAction(
    view,
    (action) => action.id === "inspect:logs" && !view.executedActionIds.includes(action.id),
  );
  if (logsAction) {
    return logsAction;
  }

  const adversarial = chooseAdversarialOppositionInspect(view);
  if (adversarial) {
    return adversarial;
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

  return chooseCheapestAction(
    view,
    (action) => action.kind === "inspect" && !view.executedActionIds.includes(action.id),
  );
}

/** Optimizer role — narrow and act when the signal supports it (prune regime). */
export function chooseOptimizerRoleAction(view: RuntimeStateView): VisibleDebugAction | null {
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

  return null;
}

/** Constraint role — commit to a fix path under compound pressure. */
export function chooseConstraintRoleAction(view: RuntimeStateView): VisibleDebugAction | null {
  if (!view.inferredFamily) {
    return null;
  }
  return chooseCheapestAction(view, (action) => action.kind === "fix" && action.family === view.inferredFamily);
}

/** Adversarial role for coordinate regime — systems / cross-boundary lens (logs-first in v1). */
export function chooseAdversarialCoordinateAction(view: RuntimeStateView): VisibleDebugAction | null {
  return chooseVisibleAction(
    view,
    (action) => action.id === "inspect:logs" && !view.executedActionIds.includes(action.id),
  );
}

/** Dispatch to the role runner for the active regime; `null` means use baseline fallback. */
export function chooseRoutedRegimeAction(regime: SearchRegime, view: RuntimeStateView): VisibleDebugAction | null {
  switch (regime) {
    case "explore":
      return chooseExplorerRoleAction(view);
    case "prune":
      return chooseOptimizerRoleAction(view);
    case "compound":
      return chooseConstraintRoleAction(view);
    case "coordinate":
      return chooseAdversarialCoordinateAction(view);
    default: {
      const _exhaustive: never = regime;
      return _exhaustive;
    }
  }
}
