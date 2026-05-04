import type { DebugRunResult, RouterTraceEvent } from "./types.js";

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

export function detectFalseConvergence(result: DebugRunResult): boolean {
  return !result.success && result.trace.some((event) => event.type === "transition");
}
