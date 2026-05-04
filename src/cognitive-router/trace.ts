import type { DebugFamily, DebugRunResult, RouterTraceEvent } from "./types.js";

export function createEmptyTrace(): RouterTraceEvent[] {
  return [];
}

export function countRepeatedFailedPaths(trace: RouterTraceEvent[]): number {
  return trace.filter((event) => event.type === "failed_path" && event.count > 1).length;
}

export function countRetriesBeforeSuccess(trace: RouterTraceEvent[]): number {
  return trace.filter((event) => event.type === "failed_path").length;
}

export function countTransitions(trace: RouterTraceEvent[]): number {
  return trace.filter((event) => event.type === "transition").length;
}

export function countHysteresis(trace: RouterTraceEvent[]): number {
  const transitions = trace.filter((event) => event.type === "transition");
  let hysteresis = 0;

  for (let index = 1; index < transitions.length; index += 1) {
    const previous = transitions[index - 1];
    const current = transitions[index];
    if (previous && current && previous.from === current.to && previous.to === current.from) {
      hysteresis += 1;
    }
  }

  return hysteresis;
}

export function measureDeadEndPersistence(trace: RouterTraceEvent[]): number {
  let currentStreak = 0;
  let maxStreak = 0;

  for (const event of trace) {
    if (event.type === "failed_path") {
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
      continue;
    }

    if (event.type === "transition" || event.type === "observation") {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

export function firstThreeActions(trace: RouterTraceEvent[]): string[] {
  return trace
    .filter((event) => event.type === "action")
    .slice(0, 3)
    .map((event) => event.action_id);
}

export function costBeforeFirstStrongSignal(trace: RouterTraceEvent[]): number | null {
  let cost = 0;

  for (const event of trace) {
    if (event.type === "action") {
      cost += event.cost;
    }

    if (event.type === "observation" && event.observation.polarity === "positive" && event.observation.strength >= 2) {
      return cost;
    }
  }

  return null;
}

export function costBeforeFamilySignal(
  trace: RouterTraceEvent[],
  family: DebugFamily,
  minimumStrength = 2,
): number | null {
  let cost = 0;

  for (const event of trace) {
    if (event.type === "action") {
      cost += event.cost;
    }

    if (
      event.type === "observation" &&
      event.observation.family === family &&
      event.observation.polarity === "positive" &&
      event.observation.strength >= minimumStrength
    ) {
      return cost;
    }
  }

  return null;
}

export function failedFixAttemptsBeforeFamilySignal(
  trace: RouterTraceEvent[],
  family: DebugFamily,
  minimumStrength = 2,
): number {
  let failedFixes = 0;

  for (const event of trace) {
    if (
      event.type === "observation" &&
      event.observation.family === family &&
      event.observation.polarity === "positive" &&
      event.observation.strength >= minimumStrength
    ) {
      return failedFixes;
    }

    if (event.type === "failed_path") {
      failedFixes += 1;
    }
  }

  return failedFixes;
}

export function measurePrematureTransitionRegret(trace: RouterTraceEvent[]): number {
  return trace.filter((event) => event.type === "transition" && event.to === "compound" && event.step <= 1).length;
}

export function measureDelayedTransitionRegret(trace: RouterTraceEvent[]): number {
  let signalStep: number | null = null;
  let transitionStep: number | null = null;

  for (const event of trace) {
    if (
      signalStep === null &&
      event.type === "observation" &&
      event.observation.polarity === "positive" &&
      event.observation.strength >= 3
    ) {
      signalStep = event.step;
    }

    if (
      signalStep !== null &&
      transitionStep === null &&
      event.type === "transition" &&
      (event.to === "prune" || event.to === "compound")
    ) {
      transitionStep = event.step;
    }
  }

  if (signalStep === null) {
    return 0;
  }

  if (transitionStep === null) {
    return 1;
  }

  return Math.max(0, transitionStep - signalStep - 1);
}

export function measureUnnecessaryTransitionCost(trace: RouterTraceEvent[]): number {
  let cost = 0;

  const transitions = trace.filter((event) => event.type === "transition");
  for (let index = 0; index < transitions.length; index += 1) {
    const current = transitions[index];
    const next = transitions[index + 1];
    if (!current) {
      continue;
    }

    if (next && current.from === next.to && current.to === next.from) {
      cost += actionCostBetweenSteps(trace, current.step + 1, next.step);
    }
  }

  return cost;
}

function actionCostBetweenSteps(trace: RouterTraceEvent[], startStep: number, endStep: number): number {
  return trace.reduce((total, event) => {
    if (event.type !== "action") {
      return total;
    }

    if (event.step < startStep || event.step > endStep) {
      return total;
    }

    return total + event.cost;
  }, 0);
}

export function measureRecoveryCostAfterWrongSwitch(trace: RouterTraceEvent[]): number {
  const wrongSwitch = trace.find(
    (event) => event.type === "transition" && event.to === "compound",
  );
  if (!wrongSwitch) {
    return 0;
  }

  const laterStrongSignal = trace.find(
    (event) =>
      event.type === "observation" &&
      event.step > wrongSwitch.step &&
      event.observation.polarity === "positive" &&
      event.observation.strength >= 3,
  );

  if (!laterStrongSignal) {
    return 0;
  }

  return actionCostBetweenSteps(trace, wrongSwitch.step + 1, laterStrongSignal.step);
}

export function detectFalseConvergence(result: DebugRunResult): boolean {
  return !result.success && result.trace.some((event) => event.type === "transition");
}
