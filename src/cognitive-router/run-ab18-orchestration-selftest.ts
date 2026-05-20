/**
 * AB-18 acceptance checks: counter-regime notes + transition triggers on routed debugging-world runs.
 * Run: `npm run smoke:ab18-orchestration` (after build).
 */
import { DEBUGGING_V1_CASES } from "./debugging-world.js";
import {
  ORCHESTRATION_TRACE_SCHEMA_ID,
  type OrchestrationTraceEventV1,
} from "./orchestration-trace-v1.js";
import { runDebugCase } from "./router-runner.js";
import type { RouterTraceEvent } from "./types.js";

function fail(message: string): never {
  throw new Error(`AB-18 selftest: ${message}`);
}

const ALLOWED_TRIGGERS = new Set<string>([
  "strong_family_signal",
  "targeted_inspect_compound",
  "compound_drift_recovery",
  "scoring_confidence_gate",
  "other",
]);

function legacyTransitions(trace: RouterTraceEvent[]): Array<Extract<RouterTraceEvent, { type: "transition" }>> {
  return trace.filter((e): e is Extract<RouterTraceEvent, { type: "transition" }> => e.type === "transition");
}

function orchTransitions(orch: OrchestrationTraceEventV1[]): Array<
  Extract<OrchestrationTraceEventV1, { type: "transition_applied" }>
> {
  return orch.filter(
    (e): e is Extract<OrchestrationTraceEventV1, { type: "transition_applied" }> =>
      e.type === "transition_applied",
  );
}

const sampleCase = DEBUGGING_V1_CASES[0];
if (!sampleCase) {
  fail("expected at least one debugging v1 case");
}

const naive = runDebugCase(sampleCase, "naive_retry");
if (naive.orchestration_trace !== undefined) {
  fail("non-routed policies must not set orchestration_trace");
}

const routed = runDebugCase(sampleCase, "routed_policy");
const orch = routed.orchestration_trace;
if (orch === undefined || orch.length < 2) {
  fail("routed_policy must populate orchestration_trace");
}

const first = orch[0];
if (!first || first.type !== "run_start") {
  fail("first orchestration event must be run_start");
}
if (first.schema_id !== ORCHESTRATION_TRACE_SCHEMA_ID) {
  fail("run_start.schema_id must match ORCHESTRATION_TRACE_SCHEMA_ID");
}
if (first.vertical_slice_id !== "debugging_world_v1") {
  fail("run_start.vertical_slice_id must be debugging_world_v1");
}

const last = orch[orch.length - 1];
if (!last || last.type !== "run_end") {
  fail("last orchestration event must be run_end");
}

for (let i = 0; i < orch.length; i += 1) {
  const ev = orch[i];
  if (!ev) continue;
  if (ev.type === "recommendation") {
    const next = orch[i + 1];
    if (next?.type !== "counter_regime_note" || next.step !== ev.step) {
      fail("after each recommendation snapshot, counter_regime_note must follow with the same step");
    }
    if (next.opposing_regime !== ev.opposing_regime) {
      fail("counter_regime_note.opposing_regime must match recommendation.opposing_regime");
    }
  }
  if (ev.type === "transition_applied" && !ALLOWED_TRIGGERS.has(ev.trigger)) {
    fail(`transition_applied.trigger must be known: ${ev.trigger}`);
  }
}

const legacyT = legacyTransitions(routed.trace);
const orchT = orchTransitions(orch);
if (legacyT.length !== orchT.length) {
  fail(
    `legacy transition count (${legacyT.length}) must match orchestration transition_applied (${orchT.length})`,
  );
}

for (const lt of legacyT) {
  const match = orchT.find((o) => o.step === lt.step && o.from === lt.from && o.to === lt.to);
  if (match === undefined) {
    fail(`each legacy transition at step ${lt.step} must have matching transition_applied`);
  }
}

console.log("ab18-orchestration selftest: OK");
