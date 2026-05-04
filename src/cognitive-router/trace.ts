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

export function detectFalseConvergence(result: DebugRunResult): boolean {
  return !result.success && result.trace.some((event) => event.type === "transition");
}
