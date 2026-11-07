import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateOutcomeAttributionV1,
  validateOutcomeObservedEventV1,
  validateRecommendationCreatedEventV1,
  type RecommendationCreatedEventV1,
} from "./outcome-events-v1.js";
import { mapMusicDnaObservationToOutcomeV1 } from "./integrations/musicdna/learning-outcome.js";
import type { MusicDnaLearningEnvelopeV1 } from "./integrations/musicdna/learning-observation-v1.js";

const fixtures = JSON.parse(
  readFileSync("contracts/musicdna-learning/v1/fixtures.json", "utf8"),
) as { base_envelope: MusicDnaLearningEnvelopeV1 };
const envelope = structuredClone(fixtures.base_envelope);
const observation = envelope.metadata.observation;
observation.policy = {
  id: "musicdna_policy",
  version: "policy.v1",
  recommendation_event_id: "rec_01",
  experiment_id: "experiment_01",
  variant: "control",
};
const terrain = JSON.parse(readFileSync("fixtures/musicdna/parity-golden-v1.json", "utf8")).cases[0]
  .expected.terrain;
const recommendation: RecommendationCreatedEventV1 = {
  schema_version: "outcome-events.v1",
  event_type: "recommendation.created",
  event_id: "rec_01",
  occurred_at: "2026-11-06T19:00:00.000Z",
  environment: "staging",
  source: { kind: "eval", surface: "internal:adapter", eval_case_id: "synthetic_01" },
  join: {
    recommendation_event_id: "rec_01",
    trace_id: "trace_01",
    tenant_id: "tenant_01",
    subject_ref: observation.subject_ref,
    decision_ref: observation.decision.ref,
    experiment_id: "experiment_01",
    variant: "control",
  },
  input: {
    terrain_profile: terrain,
    missing_information_count: 0,
    field_confidence_summary: {
      present_count: 0,
      average_confidence: null,
      low_confidence_fields: [],
    },
    problem_summary_hash: `sha256:${"a".repeat(64)}`,
  },
  recommendation: {
    primary_regime: "explore",
    secondary_regime: "prune",
    opposing_regime: "prune",
    transition_candidate: null,
    confidence: 0.5,
  },
  policy: { api_version: "1.0.0", policy_id: "musicdna_policy", router_version: "policy.v1" },
  privacy: {
    contains_raw_user_text: false,
    contains_evaluator_only_fields: false,
    redaction_level: "hashes_only",
  },
};
const context = {
  source_key: "music-dna-staging",
  tenant_id: "tenant_01",
  environment: "staging",
  measurement_window_hours: 24,
} as const;
const before = structuredClone({ envelope, recommendation });
const mapped = mapMusicDnaObservationToOutcomeV1(envelope, recommendation, context);
assert.ok(mapped.ok && mapped.attribution === "matched");
const outcome = mapped.event;
assert.equal(outcome.outcome.status, "unknown");
assert.equal(outcome.event_id, observation.observation_id);
assert.equal(outcome.join.result_version, 1);
assert.equal(outcome.join.observation_id, observation.observation_id);
assert.equal(
  outcome.outcome.quality_score,
  undefined,
  "reading agreement is not an inferred quality score",
);
assert.deepEqual({ envelope, recommendation }, before, "mapping must not mutate input evidence");
assert.ok(validateOutcomeAttributionV1(outcome, recommendation).ok);
assert.deepEqual(
  mapMusicDnaObservationToOutcomeV1(envelope, recommendation, context),
  mapped,
  "retry must be deterministic",
);

function changed(base: unknown, path: string, value?: unknown, remove = false): unknown {
  const copy = structuredClone(base) as Record<string, unknown>;
  const keys = path.split(".");
  let target = copy;
  for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
  const last = keys.at(-1)!;
  if (remove) delete target[last];
  else
    Object.defineProperty(target, last, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  return copy;
}

let negativeCases = 0;
function invalidRecommendation(name: string, path: string, value?: unknown, remove = false): void {
  const result = validateRecommendationCreatedEventV1(changed(recommendation, path, value, remove));
  assert.equal(result.ok, false, name);
  if (!result.ok)
    assert.ok(result.errors.every((error) => !error.includes("SYNTHETIC_PRIVATE_TEXT")));
  negativeCases++;
}

// The seven audit failures, plus required/nested field and source boundaries.
invalidRecommendation("missing policy", "policy", undefined, true);
invalidRecommendation("invalid regime", "recommendation.primary_regime", "bogus");
invalidRecommendation("empty terrain", "input.terrain_profile", {});
invalidRecommendation("mismatched self join", "join.recommendation_event_id", "other_rec");
invalidRecommendation("hidden raw text", "input.raw_user_text", "SYNTHETIC_PRIVATE_TEXT");
invalidRecommendation(
  "non-scalar count cannot throw",
  "input.field_confidence_summary.present_count",
  JSON.parse('{"toString":{}}'),
);
for (const timestamp of ["2026-11-06T19:00:00Z", "2026-11-06T20:00:00+01:00"]) {
  assert.ok(
    validateRecommendationCreatedEventV1(changed(recommendation, "occurred_at", timestamp)).ok,
    "valid ISO producers remain compatible",
  );
}
const production = changed(recommendation, "source.kind", "production");
assert.equal(
  validateRecommendationCreatedEventV1(production).ok,
  false,
  "production cannot carry evaluator labels",
);
negativeCases++;
for (const field of [
  "primary_regime",
  "secondary_regime",
  "opposing_regime",
  "transition_candidate",
  "confidence",
])
  invalidRecommendation(`missing ${field}`, `recommendation.${field}`, undefined, true);
for (const [path, value] of [
  ["input.missing_information_count", -1],
  ["input.missing_information_count", 0.5],
  ["input.field_confidence_summary.present_count", 13],
  ["input.field_confidence_summary.average_confidence", 0.5],
  ["input.field_confidence_summary.low_confidence_fields", ["unknown"]],
  ["input.problem_summary_hash", "not-a-digest"],
  ["input.terrain_profile.raw_text", "SYNTHETIC_PRIVATE_TEXT"],
  ["input.terrain_profile.uncertainty", "bogus"],
  ["source.eval_case_id", ""],
  ["source.extra", "SYNTHETIC_PRIVATE_TEXT"],
  ["privacy.redaction_level", "bogus"],
  ["privacy.contains_raw_user_text", true],
  ["privacy.extra", "SYNTHETIC_PRIVATE_TEXT"],
  ["policy.api_version", "unversioned"],
  ["policy.raw_prompt", "SYNTHETIC_PRIVATE_TEXT"],
  ["recommendation.confidence", Number.NaN],
  ["recommendation.confidence", Infinity],
  ["recommendation.confidence", -0.01],
  ["join.actor_ref_hash", "person@example.test"],
  ["join.result_version", 0],
  ["join.variant", "other"],
  ["join.experiment_id", ""],
  ["occurred_at", "42"],
  ["occurred_at", "2026-02-30T19:00:00.000Z"],
  ["event_id", "person@example.test"],
] as [string, unknown][])
  invalidRecommendation(path, path, value);

function invalidOutcome(path: string, value: unknown): void {
  assert.equal(validateOutcomeObservedEventV1(changed(outcome, path, value)).ok, false, path);
  negativeCases++;
}
for (const [path, value] of [
  ["outcome.measurement_window_hours", JSON.parse("1e309")],
  ["outcome.measurement_window_hours", Number.NaN],
  ["outcome.measurement_window_hours", 0],
  ["outcome.cost_units", -1],
  ["outcome.latency_ms", Infinity],
  ["outcome.quality_score", 1.1],
  ["outcome.status", "guessed_success"],
  ["outcome.operator_label", "SYNTHETIC PRIVATE TEXT"],
  ["outcome.failure_mode", "person@example.test"],
  ["outcome.observed_at", "2026-11-07T20:00:00.000Z"],
  ["outcome.raw_text", "SYNTHETIC_PRIVATE_TEXT"],
] as [string, unknown][])
  invalidOutcome(path, value);

// Matching a string ID is insufficient; use the authorized immutable context.
for (const [path, value] of [
  ["join.tenant_id", "other_tenant"],
  ["join.subject_ref", "other_subject"],
  ["join.trace_id", "other_trace"],
  ["join.decision_ref", "other_decision"],
  ["join.experiment_id", "other_experiment"],
  ["join.variant", "treatment"],
  ["environment", "prod"],
  ["source.eval_case_id", "other_case"],
  ["outcome.observed_at", "2026-11-06T18:00:00.000Z"],
] as [string, unknown][]) {
  assert.equal(
    validateOutcomeAttributionV1(changed(outcome, path, value), recommendation).ok,
    false,
    path,
  );
  negativeCases++;
}

const unattributed = mapMusicDnaObservationToOutcomeV1(fixtures.base_envelope, undefined, context);
assert.ok(unattributed.ok && unattributed.attribution === "unattributed");
assert.equal(
  mapMusicDnaObservationToOutcomeV1(envelope, recommendation, { ...context, tenant_id: "other" })
    .ok,
  false,
);
assert.equal(
  mapMusicDnaObservationToOutcomeV1(envelope, recommendation, {
    ...context,
    environment: "production",
  }).ok,
  false,
);
assert.equal(
  mapMusicDnaObservationToOutcomeV1(envelope, recommendation, {
    ...context,
    measurement_window_hours: Infinity,
  }).ok,
  false,
);
for (const accuracy of ["accurate", "mixed", "not_accurate"] as const) {
  const next = structuredClone(envelope);
  next.metadata.observation.feedback.accuracy = accuracy;
  const result = mapMusicDnaObservationToOutcomeV1(next, recommendation, context);
  assert.ok(result.ok && result.attribution === "matched");
  assert.equal(result.event.outcome.status, "unknown");
}
const revision = structuredClone(envelope);
revision.metadata.observation.observation_id = "33333333-3333-4333-8333-333333333333";
revision.correlation_id = `music-dna:learning:v1:${revision.metadata.observation.observation_id}`;
revision.metadata.observation.decision.result_version = 2;
revision.metadata.observation.decision.result_ref = `r_${"5".repeat(64)}`;
revision.metadata.observation.feedback.ref = `f_${"6".repeat(64)}`;
revision.metadata.observation.decision.result_source = "chat_self_report";
revision.metadata.observation.observed_at = "2026-11-07T20:00:00.000Z";
const later = mapMusicDnaObservationToOutcomeV1(revision, recommendation, context);
assert.ok(later.ok && later.attribution === "matched");
assert.notEqual(later.event.event_id, outcome.event_id);
assert.equal(later.event.join.result_version, 2);
assert.equal(outcome.join.result_version, 1, "later feedback never rewrites an earlier outcome");
assert.equal(mapMusicDnaObservationToOutcomeV1(envelope, undefined, context).ok, true);
const missingDecision = structuredClone(recommendation);
delete missingDecision.join.decision_ref;
const pending = mapMusicDnaObservationToOutcomeV1(envelope, missingDecision, context);
assert.ok(pending.ok && pending.attribution === "unattributed");
const excessIdentity = structuredClone(recommendation);
excessIdentity.join.session_id = "unnecessary_source_identity";
assert.equal(
  mapMusicDnaObservationToOutcomeV1(envelope, excessIdentity, context).ok,
  false,
  "do not copy generic optional identity fields into the minimal domain projection",
);

console.log(
  JSON.stringify({
    smoke: "outcome-validation-v1",
    negative_cases: negativeCases,
    mapping: "original/retry/late-version/unknown/tenant-isolation",
    status: "ok",
  }),
);
