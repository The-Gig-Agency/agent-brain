import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  evaluatePilot,
  wilson,
  differenceInterval,
  renderPilotReport,
} from "./musicdna-experiment.mjs";
const stamp = "2026-11-08T12:00:00.000Z",
  version = "sha256:" + "a".repeat(64);
const uid = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function row(n, variant = "control", accuracy = "accurate") {
  return {
    participant_ref: "p_" + n.toString(16).padStart(64, "0"),
    variant,
    enrolled_at: "2026-11-08T11:00:00Z",
    withdrawn: false,
    session_id: uid(n),
    session_started_at: "2026-11-08T11:10:00Z",
    answered: 6,
    skips: 0,
    result_id: uid(n + 100),
    result_version: 1,
    result_created_at: stamp,
    assignment_match: true,
    policy_version: version,
    window_end: "2026-11-09T12:00:00Z",
    feedback: [
      {
        feedback_id: uid(n + 200),
        result_id: uid(n + 100),
        result_version: 1,
        observed_at: "2026-11-08T12:01:00Z",
        accuracy,
      },
    ],
    latency_ms: null,
    application_errors: null,
    cost_micro: null,
  };
}
function snapshot(rows = [row(1), row(2, "treatment")]) {
  return {
    schema_version: "musicdna-pilot-cohort.v1",
    data_class: "consented_pilot",
    experiment_id: "ab52.test.v1",
    as_of: "2026-11-16T12:00:00Z",
    design: {
      experiment_id: "ab52.test.v1",
      policy_id: "musicdna-selector",
      policy_version: version,
      strategy_version: version,
      eligibility_version: "invited-adult-testflight.v1",
      measurement_window_seconds: 86400,
      enrollment_closes_at: "2026-11-15T12:00:00Z",
      max_participants: 60,
      metric_version: "first-result-perceived-accuracy.v1",
      allocation: "random_50_50",
    },
    participants: rows,
  };
}
test("Wilson reference boundaries and known 4/20 interval", () => {
  assert.equal(wilson(0, 0), null);
  assert.ok(wilson(0, 10).low < 1e-15);
  assert.ok(wilson(10, 10).high > 1 - 1e-15);
  const c = wilson(4, 20);
  assert.ok(Math.abs(c.low - 0.08065766) < 1e-6);
  assert.ok(Math.abs(c.high - 0.41601743) < 1e-6);
  assert.equal(differenceInterval(0, 0, 1, 2), null);
  const same = differenceInterval(10, 20, 10, 20);
  assert.ok(same.low < 0 && same.high > 0);
});
test("unknown is not a zero, and missing feedback is not a negative rating", () => {
  const p = row(1);
  p.feedback = [];
  const r = evaluatePilot(snapshot([p]));
  assert.equal(r.arms.control.accurate_rate, null);
  assert.equal(r.arms.control.missing_feedback, 1);
  assert.deepEqual(r.arms.control.all_assigned_accuracy_bounds, {
    low: 0,
    high: 1,
  });
  assert.equal(r.arms.control.guardrail_metrics.cost_micro.value, null);
  assert.equal(r.comparison.candidate_minus_control, null);
  assert.equal(r.status, "insufficient_evidence");
});
test("uses the first on-time response, retains late counts and ignores revision feedback", () => {
  const p = row(1);
  p.feedback[0].accuracy = "mixed";
  p.feedback.push(
    {
      ...p.feedback[0],
      feedback_id: uid(800),
      observed_at: "2026-11-08T12:02:00Z",
      accuracy: "accurate",
    },
    {
      ...p.feedback[0],
      feedback_id: uid(801),
      observed_at: "2026-11-09T12:00:00Z",
    },
    { ...p.feedback[0], feedback_id: uid(802), result_version: 2 },
  );
  const a = evaluatePilot(snapshot([p])).arms.control;
  assert.equal(a.mixed, 1);
  assert.equal(a.accurate, 0);
  assert.equal(a.known_accuracy, 1);
  assert.equal(a.late_feedback_participants, 1);
  assert.equal(a.invalid_feedback_events, 1);
});
test("deduplicates exact replay and rejects conflicting reused feedback IDs", () => {
  const p = row(1);
  p.feedback.push({ ...p.feedback[0] });
  assert.equal(evaluatePilot(snapshot([p])).arms.control.known_accuracy, 1);
  p.feedback[1].accuracy = "mixed";
  assert.throws(() => evaluatePilot(snapshot([p])), /invalid_pilot_snapshot/);
});
test("flags unexecuted treatment without relabeling it as control", () => {
  const p = row(2, "treatment");
  p.assignment_match = false;
  const r = evaluatePilot(snapshot([p]));
  assert.equal(r.arms.treatment.assigned, 1);
  assert.equal(r.arms.control.assigned, 0);
  assert.equal(r.status, "guardrail_review_required");
  assert.equal(r.automatic_promotion_allowed, false);
});
test("rejects slipped deadlines, duplicate people, private fields and future feedback", () => {
  const p = row(1),
    bad = structuredClone(p);
  bad.window_end = "2026-11-10T12:00:00Z";
  assert.throws(() => evaluatePilot(snapshot([bad])));
  assert.throws(() => evaluatePilot(snapshot([p, p])));
  assert.throws(() => evaluatePilot(snapshot([{ ...p, email: "PRIVATE" }])));
  bad.feedback[0].observed_at = "2027-01-01T00:00:00Z";
  assert.throws(() => evaluatePilot(snapshot([bad])));
});
test("withdrawn people retain only unknown-outcome denominator, never private details", () => {
  const p = row(1);
  Object.assign(p, {
    withdrawn: true,
    session_id: null,
    result_id: null,
    feedback: [],
  });
  const r = evaluatePilot(snapshot([p]));
  assert.equal(r.arms.control.withdrawn, 1);
  assert.equal(r.arms.control.unknown_accuracy, 1);
  assert.doesNotMatch(
    JSON.stringify(r),
    /participant_ref|feedback_id|session_id/,
  );
});
test("one-owner QA and fixtures cannot be mistaken for an experiment result", () => {
  const s = snapshot([row(1, "treatment")]);
  s.design.allocation = "owner_qa_treatment";
  const r = evaluatePilot(s);
  assert.equal(r.status, "functional_qa_only");
  assert.equal(r.automatic_promotion_allowed, false);
  assert.equal(
    evaluatePilot(snapshot(), { fixture: true }).status,
    "fixture_only",
  );
});
test("open windows and unavailable guardrails prevent premature candidate signal", () => {
  const rows = Array.from({ length: 40 }, (_, i) =>
    row(
      i + 1,
      i < 20 ? "control" : "treatment",
      i < 20 ? "not_accurate" : "accurate",
    ),
  );
  const s = snapshot(rows);
  s.as_of = "2026-11-08T13:00:00Z";
  assert.equal(evaluatePilot(s).status, "collection_open");
  s.as_of = "2026-11-16T12:00:00Z";
  const r = evaluatePilot(s);
  assert.equal(r.status, "inconclusive");
  assert.ok(r.comparison.approximate_interval_95.low > 0);
  assert.match(renderPilotReport(r), /unavailable/);
});
test("CLI writes private reproducible reports once and never overwrites them", () => {
  const tmp = mkdtempSync(join(tmpdir(), "ab52-report-"));
  try {
    const input = join(tmp, "input.json"),
      out = join(tmp, "output");
    writeFileSync(input, JSON.stringify(snapshot()));
    execFileSync(process.execPath, [
      "scripts/musicdna-experiment.mjs",
      "--input",
      input,
      "--output",
      out,
      "--fixture",
    ]);
    const a = readFileSync(join(out, "report.json"), "utf8");
    assert.equal(JSON.parse(a).evidence_kind, "development_fixture");
    assert.throws(() =>
      execFileSync(
        process.execPath,
        ["scripts/musicdna-experiment.mjs", "--input", input, "--output", out],
        { stdio: "pipe" },
      ),
    );
    assert.equal(readFileSync(join(out, "report.json"), "utf8"), a);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("preserves microsecond feedback deadlines", () => {
  const p = row(1);
  p.result_created_at = "2026-11-08T12:00:00.123456Z";
  p.window_end = "2026-11-09T12:00:00.123456Z";
  p.feedback[0].observed_at = "2026-11-09T12:00:00.123455Z";
  p.feedback.push({
    ...p.feedback[0],
    feedback_id: uid(900),
    observed_at: p.window_end,
  });
  const a = evaluatePilot(snapshot([p])).arms.control;
  assert.equal(a.known_accuracy, 1);
  assert.equal(a.late_feedback_participants, 1);
});
