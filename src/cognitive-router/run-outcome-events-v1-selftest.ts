import {
  OUTCOME_EVENTS_SCHEMA_VERSION,
  OUTCOME_JOIN_WINDOWS,
  summarizeFieldConfidence,
  validateOutcomeObservedEventV1,
  validateRecommendationCreatedEventV1,
  type OutcomeObservedEventV1,
  type RecommendationCreatedEventV1,
} from "./outcome-events-v1.js";
import type { TerrainProfile } from "./types.js";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const terrain: TerrainProfile = {
  feedback_latency: "medium",
  reversibility: "medium",
  uncertainty: "high",
  branching_factor: "medium",
  adversariality: "none",
  ruggedness: "medium",
  local_minima_risk: "medium",
  information_cost: "medium",
  coordination_load: "low",
  environment_stability: "stable",
  time_horizon: "iterative",
  mode_pressure: "explore",
};

const recommendation: RecommendationCreatedEventV1 = {
  schema_version: OUTCOME_EVENTS_SCHEMA_VERSION,
  event_type: "recommendation.created",
  event_id: "rec_evt_01",
  occurred_at: "2026-05-20T18:00:00.000Z",
  environment: "staging",
  source: {
    kind: "production",
    surface: "http:v1/intake-recommend",
  },
  join: {
    recommendation_event_id: "rec_evt_01",
    trace_id: "trace_01",
    tenant_id: "tenant_tga",
    subject_ref: "slack_thread:abc",
  },
  input: {
    terrain_profile: terrain,
    missing_information_count: 2,
    field_confidence_summary: summarizeFieldConfidence({
      uncertainty: 0.8,
      branching_factor: 0.4,
      mode_pressure: 0.7,
    }),
    problem_summary_hash: "sha256:example",
  },
  recommendation: {
    primary_regime: "explore",
    secondary_regime: "compound",
    opposing_regime: "prune",
    transition_candidate: null,
    confidence: 0.72,
  },
  policy: {
    api_version: "1.0.0",
    router_version: "router-recommend-v1",
  },
  privacy: {
    contains_raw_user_text: false,
    contains_evaluator_only_fields: false,
    redaction_level: "hashes_only",
  },
};

const outcome: OutcomeObservedEventV1 = {
  schema_version: OUTCOME_EVENTS_SCHEMA_VERSION,
  event_type: "recommendation.outcome_observed",
  event_id: "outcome_evt_01",
  occurred_at: "2026-05-21T18:00:00.000Z",
  environment: "staging",
  source: recommendation.source,
  join: recommendation.join,
  outcome: {
    status: "acted_on",
    observed_at: "2026-05-21T18:00:00.000Z",
    measurement_window_hours: OUTCOME_JOIN_WINDOWS.default_hours,
    quality_score: 0.75,
    cost_units: 3,
    latency_ms: 86_400_000,
  },
  privacy: recommendation.privacy,
};

const recommendationValidation = validateRecommendationCreatedEventV1(recommendation);
assert(recommendationValidation.ok, `recommendation event invalid: ${JSON.stringify(recommendationValidation)}`);

const outcomeValidation = validateOutcomeObservedEventV1(outcome);
assert(outcomeValidation.ok, `outcome event invalid: ${JSON.stringify(outcomeValidation)}`);

assert(
  outcome.join.recommendation_event_id === recommendation.event_id,
  "outcome must join to recommendation.event_id",
);
assert(outcome.join.trace_id === recommendation.join.trace_id, "outcome trace id must preserve request correlation");
assert(
  recommendation.input.field_confidence_summary.low_confidence_fields.includes("branching_factor"),
  "field confidence summary should preserve low-confidence dimensions",
);

const badEvalEvent = {
  ...recommendation,
  source: { kind: "eval", surface: "eval:fixture" },
};
const badEvalValidation = validateRecommendationCreatedEventV1(badEvalEvent);
assert(!badEvalValidation.ok, "eval telemetry without eval_case_id should fail validation");

const rawTextEvent = {
  ...outcome,
  privacy: { ...outcome.privacy, contains_raw_user_text: true },
};
const rawTextValidation = validateOutcomeObservedEventV1(rawTextEvent);
assert(!rawTextValidation.ok, "events with raw user text should fail validation");

console.log(JSON.stringify({ smoke: "outcome-events-v1", status: "ok" }));
