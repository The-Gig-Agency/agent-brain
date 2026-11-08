#!/usr/bin/env node
// AB-52 local operator report. No HTTP, database, model calls or rollout authority.
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const hash = (x) => createHash("sha256").update(x).digest("hex");
const Z = 1.959963984540054;
const fail = () => {
  throw new Error("invalid_pilot_snapshot");
};
const fields = (o, keys) => {
  if (
    !o ||
    typeof o !== "object" ||
    Array.isArray(o) ||
    Object.keys(o).some((k) => !keys.includes(k)) ||
    keys.some((k) => !Object.hasOwn(o, k))
  )
    fail();
};
// Preserve Postgres microseconds: rounding a deadline to milliseconds can misclassify a late rating.
const time = (x) => {
  if (typeof x !== "string") fail();
  const m = /^(.*T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(
    x,
  );
  if (!m) fail();
  const base = Date.parse(m[1] + m[3]);
  const value = base * 1000 + Number((m[2] || "").padEnd(6, "0"));
  if (!Number.isSafeInteger(value)) fail();
  return value;
};
const uuid = (x) =>
  typeof x === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    x,
  );
const count = (x) => Number.isSafeInteger(x) && x >= 0;
export function wilson(successes, n) {
  if (!count(n) || !count(successes) || successes > n) fail();
  if (n === 0) return null;
  const p = successes / n,
    z2 = Z * Z,
    den = 1 + z2 / n,
    center = (p + z2 / (2 * n)) / den;
  const half = (Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / den;
  return { low: Math.max(0, center - half), high: Math.min(1, center + half) };
}
export function differenceInterval(t, tn, c, cn) {
  if (!tn || !cn) return null;
  const a = wilson(t, tn),
    b = wilson(c, cn),
    p = t / tn,
    q = c / cn,
    d = p - q;
  return {
    low: Math.max(-1, d - Math.hypot(p - a.low, b.high - q)),
    high: Math.min(1, d + Math.hypot(a.high - p, q - b.low)),
  };
}
const arm = () => ({
  assigned: 0,
  withdrawn: 0,
  started: 0,
  completed: 0,
  known_accuracy: 0,
  accurate: 0,
  mixed: 0,
  not_accurate: 0,
  awaiting_feedback: 0,
  missing_feedback: 0,
  unknown_without_result: 0,
  late_feedback_participants: 0,
  invalid_feedback_events: 0,
  assignment_mismatches: 0,
  provenance_unavailable: 0,
  answer_limit_violations: 0,
  total_skips: 0,
  skips_observed: 0,
  latency_values: [],
  errors_values: [],
  cost_values: [],
});
const metricKeys = ["latency_values", "errors_values", "cost_values"];
export function evaluatePilot(snapshot, { fixture = false } = {}) {
  fields(snapshot, [
    "schema_version",
    "data_class",
    "experiment_id",
    "as_of",
    "design",
    "participants",
  ]);
  if (
    snapshot.schema_version !== "musicdna-pilot-cohort.v1" ||
    snapshot.data_class !== "consented_pilot" ||
    !/^ab52\.[A-Za-z0-9._-]+$/.test(snapshot.experiment_id)
  )
    fail();
  const asOf = time(snapshot.as_of),
    d = snapshot.design;
  fields(d, [
    "experiment_id",
    "policy_id",
    "policy_version",
    "strategy_version",
    "eligibility_version",
    "measurement_window_seconds",
    "enrollment_closes_at",
    "max_participants",
    "metric_version",
    "allocation",
  ]);
  if (
    d.experiment_id !== snapshot.experiment_id ||
    d.policy_id !== "musicdna-selector" ||
    !/^sha256:[0-9a-f]{64}$/.test(d.policy_version) ||
    d.strategy_version !== d.policy_version ||
    d.eligibility_version !== "invited-adult-testflight.v1" ||
    d.metric_version !== "first-result-perceived-accuracy.v1" ||
    !["random_50_50", "owner_qa_control", "owner_qa_treatment"].includes(
      d.allocation,
    ) ||
    !count(d.measurement_window_seconds) ||
    d.measurement_window_seconds < 3600 ||
    d.measurement_window_seconds > 604800 ||
    !count(d.max_participants) ||
    d.max_participants < 2 ||
    d.max_participants > 60
  )
    fail();
  const closes = time(d.enrollment_closes_at);
  if (
    !Array.isArray(snapshot.participants) ||
    snapshot.participants.length > d.max_participants
  )
    fail();
  const arms = { control: arm(), treatment: arm() },
    seen = new Set(),
    seenFeedback = new Map();
  for (const p of snapshot.participants) {
    fields(p, [
      "participant_ref",
      "variant",
      "enrolled_at",
      "withdrawn",
      "session_id",
      "session_started_at",
      "answered",
      "skips",
      "result_id",
      "result_version",
      "result_created_at",
      "assignment_match",
      "policy_version",
      "window_end",
      "feedback",
      "latency_ms",
      "application_errors",
      "cost_micro",
    ]);
    if (
      !/^p_[0-9a-f]{64}$/.test(p.participant_ref) ||
      seen.has(p.participant_ref) ||
      !Object.hasOwn(arms, p.variant) ||
      typeof p.withdrawn !== "boolean" ||
      time(p.enrolled_at) > asOf ||
      time(p.enrolled_at) >= closes ||
      !Array.isArray(p.feedback) ||
      p.feedback.length > 200
    )
      fail();
    seen.add(p.participant_ref);
    const a = arms[p.variant];
    a.assigned++;
    for (const [field, key] of [
      ["latency_ms", "latency_values"],
      ["application_errors", "errors_values"],
      ["cost_micro", "cost_values"],
    ]) {
      if (p[field] !== null && !count(p[field])) fail();
      if (p[field] !== null && !p.withdrawn) a[key].push(p[field]);
    }
    if (p.withdrawn) {
      if (p.session_id !== null || p.result_id !== null || p.feedback.length)
        fail();
      a.withdrawn++;
      continue;
    }
    if (p.session_id !== null) {
      if (
        !uuid(p.session_id) ||
        time(p.session_started_at) > asOf ||
        time(p.session_started_at) < time(p.enrolled_at) ||
        !count(p.answered) ||
        !count(p.skips)
      )
        fail();
      a.started++;
      a.total_skips += p.skips;
      a.skips_observed++;
      if (p.answered > 6) a.answer_limit_violations++;
    }
    if (p.result_id === null) {
      if (p.feedback.length) fail();
      a.unknown_without_result++;
      continue;
    }
    if (
      !uuid(p.result_id) ||
      p.session_id === null ||
      p.result_version !== 1 ||
      p.answered !== 6
    )
      fail();
    const created = time(p.result_created_at),
      end = time(p.window_end);
    if (
      created < time(p.session_started_at) ||
      created > asOf ||
      Math.abs(end - created - d.measurement_window_seconds * 1000000) > 1
    )
      fail();
    a.completed++;
    if (p.assignment_match === false) a.assignment_mismatches++;
    else if (
      p.assignment_match !== true ||
      p.policy_version !== d.policy_version
    )
      a.provenance_unavailable++;
    const feedback = [];
    let late = false;
    for (const f of p.feedback) {
      fields(f, [
        "feedback_id",
        "result_id",
        "result_version",
        "observed_at",
        "accuracy",
      ]);
      if (
        !uuid(f.feedback_id) ||
        !uuid(f.result_id) ||
        !Number.isSafeInteger(f.result_version) ||
        ![null, "accurate", "mixed", "not_accurate"].includes(f.accuracy)
      )
        fail();
      const stamp = time(f.observed_at);
      if (stamp > asOf) fail();
      const signature = JSON.stringify([
        p.participant_ref,
        f.result_id,
        f.result_version,
        stamp,
        f.accuracy,
      ]);
      if (seenFeedback.has(f.feedback_id)) {
        if (seenFeedback.get(f.feedback_id) !== signature) fail();
        continue;
      }
      seenFeedback.set(f.feedback_id, signature);
      if (
        f.result_id !== p.result_id ||
        f.result_version !== 1 ||
        stamp < created
      ) {
        a.invalid_feedback_events++;
        continue;
      }
      if (f.accuracy === null) continue;
      if (stamp >= end) {
        late = true;
        continue;
      }
      feedback.push({ ...f, stamp });
    }
    if (late) a.late_feedback_participants++;
    feedback.sort(
      (x, y) => x.stamp - y.stamp || x.feedback_id.localeCompare(y.feedback_id),
    );
    const first = feedback[0];
    if (first) {
      a.known_accuracy++;
      a[first.accuracy]++;
    } else if (asOf < end) a.awaiting_feedback++;
    else a.missing_feedback++;
  }
  for (const a of Object.values(arms)) {
    a.accurate_rate = a.known_accuracy ? a.accurate / a.known_accuracy : null;
    a.accurate_rate_interval_95 = wilson(a.accurate, a.known_accuracy);
    a.response_coverage = a.assigned ? a.known_accuracy / a.assigned : null;
    a.completion_rate = a.assigned ? a.completed / a.assigned : null;
    a.unknown_accuracy = a.assigned - a.known_accuracy;
    a.all_assigned_accuracy_bounds = a.assigned
      ? {
          low: a.accurate / a.assigned,
          high: (a.accurate + a.unknown_accuracy) / a.assigned,
        }
      : null;
    a.mean_skips = a.skips_observed ? a.total_skips / a.skips_observed : null;
    a.guardrail_metrics = {};
    for (const [key, name] of [
      ["latency_values", "latency_ms"],
      ["errors_values", "application_errors"],
      ["cost_values", "cost_micro"],
    ]) {
      const v = a[key].sort((x, y) => x - y);
      a.guardrail_metrics[name] = {
        observed: v.length,
        missing: a.assigned - a.withdrawn - v.length,
        value: v.length
          ? name === "latency_ms"
            ? v[Math.ceil(v.length * 0.95) - 1]
            : v.reduce((x, y) => x + y, 0)
          : null,
      };
      delete a[key];
    }
  }
  const t = arms.treatment,
    c = arms.control;
  const delta =
    t.accurate_rate !== null && c.accurate_rate !== null
      ? t.accurate_rate - c.accurate_rate
      : null;
  const interval = differenceInterval(
    t.accurate,
    t.known_accuracy,
    c.accurate,
    c.known_accuracy,
  );
  const bounds =
    t.assigned && c.assigned
      ? {
          low:
            t.all_assigned_accuracy_bounds.low -
            c.all_assigned_accuracy_bounds.high,
          high:
            t.all_assigned_accuracy_bounds.high -
            c.all_assigned_accuracy_bounds.low,
        }
      : null;
  const violations = Object.values(arms).some(
    (a) =>
      a.assignment_mismatches ||
      a.provenance_unavailable ||
      a.answer_limit_violations ||
      a.invalid_feedback_events,
  );
  const closed = asOf >= closes + d.measurement_window_seconds * 1000000;
  const sufficient = t.known_accuracy >= 10 && c.known_accuracy >= 10;
  const incompleteGuardrails = Object.values(arms).some((a) =>
    Object.values(a.guardrail_metrics).some(
      (x) => x.missing > 0 || x.value === null,
    ),
  );
  const signal =
    !fixture &&
    d.allocation === "random_50_50" &&
    closed &&
    sufficient &&
    !violations &&
    !incompleteGuardrails &&
    interval?.low > 0 &&
    bounds?.low > 0;
  const status =
    d.allocation !== "random_50_50"
      ? "functional_qa_only"
      : fixture
        ? "fixture_only"
        : violations
          ? "guardrail_review_required"
          : !closed
            ? "collection_open"
            : !sufficient
              ? "insufficient_evidence"
              : signal
                ? "candidate_perceived_accuracy_signal"
                : "inconclusive";
  return {
    schema_version: "musicdna-pilot-report.v1",
    experiment_id: d.experiment_id,
    as_of: snapshot.as_of,
    evidence_kind: fixture
      ? "development_fixture"
      : "operator_supplied_local_snapshot",
    input_provenance: "not independently verified by the offline evaluator",
    design: d,
    collection_closed: closed,
    status,
    decision: "hold_for_human_review",
    automatic_promotion_allowed: false,
    primary_metric:
      "First on-time accurate label / first on-time non-null accuracy responses on original result v1",
    arms,
    comparison: {
      candidate_minus_control: delta,
      approximate_interval_95: interval,
      all_assigned_missing_outcome_bounds: bounds,
    },
    limitations: [
      "Perceived accuracy is self-report, not objective diagnostic validity or product improvement.",
      "Missing/late/withdrawn outcomes are unknown, never negative ratings; respondent rates can be biased.",
      "One participant contributes one reading and one earliest on-time accuracy response; later revisions are excluded.",
      "Allocation is participant-level; report assigned arms and flag unexecuted/mismatched treatment instead of relabeling it.",
      "Ten responses per arm is an exploratory reporting floor, not a power or efficacy guarantee.",
      "Latency/application-error/cost metrics remain unavailable when the producer has no verified numeric counters.",
      "Wilson/Newcombe intervals are approximate; no repeated-peeking or automated rollout follows this report.",
      "No real-person records are sent to Echelon, EdgeBot, a model or the hosted Brain by this command.",
    ],
  };
}
export function renderPilotReport(r) {
  const pct = (x) => (x === null ? "unavailable" : (100 * x).toFixed(1) + "%");
  return [
    "# Music DNA perceived-accuracy pilot",
    "",
    `Status: **${r.status}**. Decision: **${r.decision}**.`,
    `Evidence: ${r.evidence_kind}. Automatic promotion: disabled.`,
    `Experiment: ${r.experiment_id}. As of: ${r.as_of}.`,
    "",
    "| Measure | Current control | Candidate |",
    "| --- | ---: | ---: |",
    ...[
      ["Assigned", "assigned"],
      ["Withdrawn", "withdrawn"],
      ["Started", "started"],
      ["Completed", "completed"],
      ["On-time accuracy responses", "known_accuracy"],
      ["Accurate", "accurate"],
      ["Mixed", "mixed"],
      ["Not accurate", "not_accurate"],
      ["Awaiting feedback", "awaiting_feedback"],
      ["Missing feedback", "missing_feedback"],
      ["Unknown without result", "unknown_without_result"],
      ["Late feedback participants", "late_feedback_participants"],
    ].map(
      ([n, k]) => `| ${n} | ${r.arms.control[k]} | ${r.arms.treatment[k]} |`,
    ),
    `| Accurate among respondents | ${pct(r.arms.control.accurate_rate)} | ${pct(r.arms.treatment.accurate_rate)} |`,
    `| Response coverage | ${pct(r.arms.control.response_coverage)} | ${pct(r.arms.treatment.response_coverage)} |`,
    "",
    `Candidate minus control: ${r.comparison.candidate_minus_control === null ? "unavailable" : (r.comparison.candidate_minus_control * 100).toFixed(1) + " percentage points"}.`,
    `Approximate 95% interval: ${r.comparison.approximate_interval_95 ? JSON.stringify(r.comparison.approximate_interval_95) : "unavailable"}.`,
    `Missing-outcome sensitivity bounds: ${r.comparison.all_assigned_missing_outcome_bounds ? JSON.stringify(r.comparison.all_assigned_missing_outcome_bounds) : "unavailable"}.`,
    "",
    "## Guardrails",
    "",
    ...Object.entries(r.arms).map(
      ([name, a]) =>
        `${name}: completion ${pct(a.completion_rate)}, mean skips ${a.mean_skips ?? "unavailable"}, assignment mismatches ${a.assignment_mismatches}, provenance unavailable ${a.provenance_unavailable}; numeric metrics ${JSON.stringify(a.guardrail_metrics)}.`,
    ),
    "",
    "## Limits",
    "",
    ...r.limitations.map((x) => "- " + x),
    "",
  ].join("\n");
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2);
    if (args.includes("--help")) {
      console.log(
        "node scripts/musicdna-experiment.mjs --input <private snapshot.json> --output <new directory> [--fixture]",
      );
      process.exit(0);
    }
    let input,
      output,
      fixture = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--input") input = args[++i];
      else if (args[i] === "--output") output = args[++i];
      else if (args[i] === "--fixture") fixture = true;
      else throw Error("invalid_arguments");
    }
    if (!input || !output) throw Error("input_and_new_output_required");
    const bytes = readFileSync(input);
    if (bytes.length > 2097152) throw Error("snapshot_too_large");
    const report = evaluatePilot(JSON.parse(bytes.toString("utf8")), {
      fixture,
    });
    report.input_sha256 = hash(bytes);
    report.evaluator_sha256 = hash(
      readFileSync(fileURLToPath(import.meta.url)),
    );
    mkdirSync(output, { mode: 0o700 });
    writeFileSync(
      resolve(output, "report.json"),
      JSON.stringify(report, null, 2) + "\n",
      { mode: 0o600, flag: "wx" },
    );
    writeFileSync(resolve(output, "report.md"), renderPilotReport(report), {
      mode: 0o600,
      flag: "wx",
    });
    console.log(
      JSON.stringify({
        status: report.status,
        report_directory: resolve(output),
        promotion: false,
      }),
    );
  } catch (e) {
    console.error(
      e instanceof Error && /^[a-z_]+$/.test(e.message)
        ? e.message
        : "pilot_report_failed",
    );
    process.exitCode = 1;
  }
}
