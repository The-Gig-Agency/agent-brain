import {
  ADVERSARIALITY_VALUES,
  BRANCHING_FACTOR_VALUES,
  COORDINATION_LOAD_VALUES,
  ENVIRONMENT_STABILITY_VALUES,
  FEEDBACK_LATENCIES,
  INFORMATION_COST_VALUES,
  LOCAL_MINIMA_RISK_VALUES,
  MODE_PRESSURE_VALUES,
  REVERSIBILITY_VALUES,
  RUGGEDNESS_VALUES,
  SEARCH_REGIMES,
  TIME_HORIZON_VALUES,
  UNCERTAINTY_VALUES,
  type FieldConfidence,
  type SearchRegime,
  type TerrainProfile,
} from "./types.js";

export const OUTCOME_EVENTS_SCHEMA_VERSION = "outcome-events.v1" as const;

export const OUTCOME_JOIN_WINDOWS = {
  immediate_hours: 24,
  default_hours: 168,
  long_horizon_hours: 720,
} as const;

export const RECOMMENDATION_EVENT_TYPES = ["recommendation.created"] as const;
export const OUTCOME_EVENT_TYPES = ["recommendation.outcome_observed"] as const;
export const TELEMETRY_ENVIRONMENTS = ["dev", "staging", "prod"] as const;
export const TELEMETRY_SOURCE_KINDS = ["production", "eval"] as const;
export const TELEMETRY_SURFACES = [
  "http:v1/recommend",
  "http:v1/intake-recommend",
  "eval:fixture",
  "internal:adapter",
] as const;
export const OUTCOME_STATUSES = [
  "accepted",
  "rejected",
  "acted_on",
  "succeeded",
  "failed",
  "superseded",
  "unknown",
] as const;

export type RecommendationEventType = (typeof RECOMMENDATION_EVENT_TYPES)[number];
export type OutcomeEventType = (typeof OUTCOME_EVENT_TYPES)[number];
export type TelemetryEnvironment = (typeof TELEMETRY_ENVIRONMENTS)[number];
export type TelemetrySourceKind = (typeof TELEMETRY_SOURCE_KINDS)[number];
export type TelemetrySurface = (typeof TELEMETRY_SURFACES)[number];
export type OutcomeStatus = (typeof OUTCOME_STATUSES)[number];

export type TelemetrySourceV1 = {
  kind: TelemetrySourceKind;
  surface: TelemetrySurface;
  eval_suite_id?: string;
  eval_case_id?: string;
};

export type TelemetryJoinKeysV1 = {
  recommendation_event_id: string;
  trace_id: string;
  tenant_id?: string;
  subject_ref?: string;
  session_id?: string;
  actor_ref_hash?: string;
  decision_ref?: string;
  result_ref?: string;
  result_version?: number;
  observation_id?: string;
  experiment_id?: string;
  variant?: "control" | "treatment";
};

export type TelemetryPrivacyV1 = {
  contains_raw_user_text: false;
  contains_evaluator_only_fields: false;
  redaction_level: "none" | "hashes_only" | "redacted_summary";
};

export type FieldConfidenceSummaryV1 = {
  present_count: number;
  average_confidence: number | null;
  low_confidence_fields: string[];
};

export type RecommendationCreatedEventV1 = {
  schema_version: typeof OUTCOME_EVENTS_SCHEMA_VERSION;
  event_type: RecommendationEventType;
  event_id: string;
  occurred_at: string;
  environment: TelemetryEnvironment;
  source: TelemetrySourceV1;
  join: TelemetryJoinKeysV1;
  input: {
    terrain_profile: TerrainProfile;
    missing_information_count: number;
    field_confidence_summary: FieldConfidenceSummaryV1;
    problem_summary_hash?: string;
  };
  recommendation: {
    primary_regime: SearchRegime;
    secondary_regime: SearchRegime | null;
    opposing_regime: SearchRegime;
    transition_candidate: SearchRegime | null;
    confidence: number;
  };
  policy: {
    api_version: string;
    router_version?: string;
    policy_id?: string;
  };
  privacy: TelemetryPrivacyV1;
};

export type OutcomeObservedEventV1 = {
  schema_version: typeof OUTCOME_EVENTS_SCHEMA_VERSION;
  event_type: OutcomeEventType;
  event_id: string;
  occurred_at: string;
  environment: TelemetryEnvironment;
  source: TelemetrySourceV1;
  join: TelemetryJoinKeysV1;
  outcome: {
    status: OutcomeStatus;
    observed_at: string;
    measurement_window_hours: number;
    quality_score?: number;
    cost_units?: number;
    latency_ms?: number;
    operator_label?: string;
    failure_mode?: string;
  };
  privacy: TelemetryPrivacyV1;
};

export type RecommendationOutcomeTelemetryEventV1 =
  RecommendationCreatedEventV1 | OutcomeObservedEventV1;

export type EventValidationResult = { ok: true } | { ok: false; errors: string[] };

const TERRAIN_ENUMS = {
  feedback_latency: FEEDBACK_LATENCIES,
  reversibility: REVERSIBILITY_VALUES,
  uncertainty: UNCERTAINTY_VALUES,
  branching_factor: BRANCHING_FACTOR_VALUES,
  adversariality: ADVERSARIALITY_VALUES,
  ruggedness: RUGGEDNESS_VALUES,
  local_minima_risk: LOCAL_MINIMA_RISK_VALUES,
  information_cost: INFORMATION_COST_VALUES,
  coordination_load: COORDINATION_LOAD_VALUES,
  environment_stability: ENVIRONMENT_STABILITY_VALUES,
  time_horizon: TIME_HORIZON_VALUES,
  mode_pressure: MODE_PRESSURE_VALUES,
} as const;
const TERRAIN_FIELDS = Object.keys(TERRAIN_ENUMS);
const CODE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function object(
  value: unknown,
  required: readonly string[],
  optional: readonly string[],
  path: string,
  errors: string[],
): Record<string, unknown> | null {
  if (!isRecord(value)) {
    errors.push(`${path}: object required`);
    return null;
  }
  if (required.some((key) => !Object.hasOwn(value, key))) errors.push(`${path}: missing fields`);
  if (Object.keys(value).some((key) => !required.includes(key) && !optional.includes(key))) {
    errors.push(`${path}: unknown fields`); // Do not echo untrusted field names or values.
  }
  return value;
}

function oneOf(value: unknown, allowed: readonly unknown[], path: string, errors: string[]): void {
  if (!allowed.includes(value)) errors.push(`${path}: invalid value`);
}

function code(value: unknown, path: string, errors: string[]): void {
  if (typeof value !== "string" || !CODE.test(value)) errors.push(`${path}: bounded code required`);
}

function timestamp(value: unknown, path: string, errors: string[]): void {
  // Preserve valid RFC3339 producers, including offsets and second precision.
  // Date.parse alone accepts non-ISO strings and normalizes impossible dates.
  const rfc3339 =
    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
  if (typeof value !== "string" || !rfc3339.test(value) || !Number.isFinite(Date.parse(value))) {
    errors.push(`${path}: RFC3339 timestamp required`);
    return;
  }
  const date = value.slice(0, 10);
  if (new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date) {
    errors.push(`${path}: invalid calendar date`);
  }
}

function finite(
  value: unknown,
  minimum: number,
  maximum: number,
  path: string,
  errors: string[],
): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    errors.push(`${path}: finite number outside permitted range`);
  }
}

function validateBaseEvent(
  value: unknown,
  eventType: "recommendation.created" | "recommendation.outcome_observed",
  errors: string[],
): Record<string, unknown> | null {
  const variantFields =
    eventType === "recommendation.created" ? ["input", "recommendation", "policy"] : ["outcome"];
  const event = object(
    value,
    [
      "schema_version",
      "event_type",
      "event_id",
      "occurred_at",
      "environment",
      "source",
      "join",
      "privacy",
      ...variantFields,
    ],
    [],
    "event",
    errors,
  );
  if (!event) return null;
  oneOf(event.schema_version, [OUTCOME_EVENTS_SCHEMA_VERSION], "schema_version", errors);
  oneOf(event.event_type, [eventType], "event_type", errors);
  code(event.event_id, "event_id", errors);
  timestamp(event.occurred_at, "occurred_at", errors);
  oneOf(event.environment, TELEMETRY_ENVIRONMENTS, "environment", errors);
  const source = object(
    event.source,
    ["kind", "surface"],
    ["eval_suite_id", "eval_case_id"],
    "source",
    errors,
  );
  if (source) {
    oneOf(source.kind, TELEMETRY_SOURCE_KINDS, "source.kind", errors);
    oneOf(source.surface, TELEMETRY_SURFACES, "source.surface", errors);
    for (const field of ["eval_suite_id", "eval_case_id"])
      if (Object.hasOwn(source, field)) code(source[field], `source.${field}`, errors);
    if (source.kind === "eval" && !Object.hasOwn(source, "eval_case_id"))
      errors.push("source: eval_case_id required");
    if (
      source.kind === "production" &&
      (Object.hasOwn(source, "eval_suite_id") ||
        Object.hasOwn(source, "eval_case_id") ||
        source.surface === "eval:fixture")
    ) {
      errors.push("source: production cannot carry evaluator metadata");
    }
  }
  const join = object(
    event.join,
    ["recommendation_event_id", "trace_id"],
    [
      "tenant_id",
      "subject_ref",
      "session_id",
      "actor_ref_hash",
      "decision_ref",
      "result_ref",
      "result_version",
      "observation_id",
      "experiment_id",
      "variant",
    ],
    "join",
    errors,
  );
  if (join) {
    for (const field of [
      "recommendation_event_id",
      "trace_id",
      "tenant_id",
      "subject_ref",
      "session_id",
      "decision_ref",
      "result_ref",
      "observation_id",
      "experiment_id",
    ]) {
      if (Object.hasOwn(join, field)) code(join[field], `join.${field}`, errors);
    }
    if (
      Object.hasOwn(join, "actor_ref_hash") &&
      (typeof join.actor_ref_hash !== "string" ||
        !/^(sha256:)?[0-9a-f]{64}$/.test(join.actor_ref_hash))
    )
      errors.push("join.actor_ref_hash: digest required");
    if (
      Object.hasOwn(join, "result_version") &&
      (!Number.isSafeInteger(join.result_version) || Number(join.result_version) < 1)
    )
      errors.push("join.result_version: positive safe integer required");
    if (Object.hasOwn(join, "variant"))
      oneOf(join.variant, ["control", "treatment"], "join.variant", errors);
    if (Object.hasOwn(join, "variant") !== Object.hasOwn(join, "experiment_id"))
      errors.push("join: experiment and variant required together");
    if (eventType === "recommendation.created" && join.recommendation_event_id !== event.event_id)
      errors.push("join: recommendation event ID mismatch");
  }
  const privacy = object(
    event.privacy,
    ["contains_raw_user_text", "contains_evaluator_only_fields", "redaction_level"],
    [],
    "privacy",
    errors,
  );
  if (privacy) {
    oneOf(privacy.contains_raw_user_text, [false], "privacy.contains_raw_user_text", errors);
    oneOf(
      privacy.contains_evaluator_only_fields,
      [false],
      "privacy.contains_evaluator_only_fields",
      errors,
    );
    oneOf(
      privacy.redaction_level,
      ["none", "hashes_only", "redacted_summary"],
      "privacy.redaction_level",
      errors,
    );
  }
  return event;
}

export function summarizeFieldConfidence(
  fieldConfidence: FieldConfidence | undefined,
): FieldConfidenceSummaryV1 {
  const entries = Object.entries(fieldConfidence ?? {}).filter(
    (entry): entry is [string, number] =>
      TERRAIN_FIELDS.includes(entry[0]) &&
      typeof entry[1] === "number" &&
      Number.isFinite(entry[1]) &&
      entry[1] >= 0 &&
      entry[1] <= 1,
  );
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const average = entries.length > 0 ? Math.round((total / entries.length) * 1000) / 1000 : null;
  return {
    present_count: entries.length,
    average_confidence: average,
    low_confidence_fields: entries
      .filter(([, value]) => value < 0.5)
      .map(([field]) => field)
      .sort(),
  };
}

export function validateRecommendationCreatedEventV1(value: unknown): EventValidationResult {
  const errors: string[] = [];
  const event = validateBaseEvent(value, "recommendation.created", errors);
  if (!event) return { ok: false, errors };
  const input = object(
    event.input,
    ["terrain_profile", "missing_information_count", "field_confidence_summary"],
    ["problem_summary_hash"],
    "input",
    errors,
  );
  if (input) {
    const terrain = object(
      input.terrain_profile,
      TERRAIN_FIELDS,
      [],
      "input.terrain_profile",
      errors,
    );
    if (terrain)
      for (const field of TERRAIN_FIELDS)
        oneOf(
          terrain[field],
          TERRAIN_ENUMS[field as keyof TerrainProfile],
          `input.terrain_profile.${field}`,
          errors,
        );
    if (
      !Number.isSafeInteger(input.missing_information_count) ||
      Number(input.missing_information_count) < 0 ||
      Number(input.missing_information_count) > TERRAIN_FIELDS.length
    )
      errors.push("input.missing_information_count: invalid count");
    if (
      Object.hasOwn(input, "problem_summary_hash") &&
      (typeof input.problem_summary_hash !== "string" ||
        !/^(sha256:)?[0-9a-f]{64}$/.test(input.problem_summary_hash))
    )
      errors.push("input.problem_summary_hash: digest required");
    const summary = object(
      input.field_confidence_summary,
      ["present_count", "average_confidence", "low_confidence_fields"],
      [],
      "input.field_confidence_summary",
      errors,
    );
    if (summary) {
      const presentCount =
        typeof summary.present_count === "number" &&
        Number.isSafeInteger(summary.present_count) &&
        summary.present_count >= 0 &&
        summary.present_count <= TERRAIN_FIELDS.length
          ? summary.present_count
          : null;
      if (presentCount === null)
        errors.push("field_confidence_summary.present_count: invalid count");
      if (presentCount === 0) {
        if (summary.average_confidence !== null)
          errors.push("field_confidence_summary: empty summary requires null average");
      } else
        finite(
          summary.average_confidence,
          0,
          1,
          "field_confidence_summary.average_confidence",
          errors,
        );
      const low = summary.low_confidence_fields;
      if (
        !Array.isArray(low) ||
        presentCount === null ||
        low.length > presentCount ||
        new Set(low).size !== low.length ||
        low.some((field) => typeof field !== "string" || !TERRAIN_FIELDS.includes(field))
      )
        errors.push("field_confidence_summary.low_confidence_fields: invalid dimensions");
    }
  }
  const recommendation = object(
    event.recommendation,
    ["primary_regime", "secondary_regime", "opposing_regime", "transition_candidate", "confidence"],
    [],
    "recommendation",
    errors,
  );
  if (recommendation) {
    oneOf(recommendation.primary_regime, SEARCH_REGIMES, "recommendation.primary_regime", errors);
    oneOf(recommendation.opposing_regime, SEARCH_REGIMES, "recommendation.opposing_regime", errors);
    for (const field of ["secondary_regime", "transition_candidate"])
      oneOf(recommendation[field], [...SEARCH_REGIMES, null], `recommendation.${field}`, errors);
    finite(recommendation.confidence, 0, 1, "recommendation.confidence", errors);
  }
  const policy = object(
    event.policy,
    ["api_version"],
    ["router_version", "policy_id"],
    "policy",
    errors,
  );
  if (policy) {
    if (
      typeof policy.api_version !== "string" ||
      !/^\d+\.\d+\.\d+$/.test(policy.api_version) ||
      policy.api_version.length > 32
    )
      errors.push("policy.api_version: semantic version required");
    for (const field of ["router_version", "policy_id"])
      if (Object.hasOwn(policy, field)) code(policy[field], `policy.${field}`, errors);
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateOutcomeObservedEventV1(value: unknown): EventValidationResult {
  const errors: string[] = [];
  const event = validateBaseEvent(value, "recommendation.outcome_observed", errors);
  if (!event) return { ok: false, errors };
  const outcome = object(
    event.outcome,
    ["status", "observed_at", "measurement_window_hours"],
    ["quality_score", "cost_units", "latency_ms", "operator_label", "failure_mode"],
    "outcome",
    errors,
  );
  if (outcome) {
    oneOf(outcome.status, OUTCOME_STATUSES, "outcome.status", errors);
    timestamp(outcome.observed_at, "outcome.observed_at", errors);
    finite(
      outcome.measurement_window_hours,
      Number.MIN_VALUE,
      Number.MAX_SAFE_INTEGER,
      "outcome.measurement_window_hours",
      errors,
    );
    if (Object.hasOwn(outcome, "quality_score"))
      finite(outcome.quality_score, 0, 1, "outcome.quality_score", errors);
    for (const field of ["cost_units", "latency_ms"])
      if (Object.hasOwn(outcome, field))
        finite(outcome[field], 0, Number.MAX_SAFE_INTEGER, `outcome.${field}`, errors);
    for (const field of ["operator_label", "failure_mode"])
      if (Object.hasOwn(outcome, field)) code(outcome[field], `outcome.${field}`, errors);
    if (
      typeof outcome.observed_at === "string" &&
      typeof event.occurred_at === "string" &&
      Date.parse(outcome.observed_at) > Date.parse(event.occurred_at)
    )
      errors.push("outcome: observation cannot occur after the event");
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function validateRecommendationOutcomeTelemetryEventV1(
  value: unknown,
): EventValidationResult {
  if (!isRecord(value)) return { ok: false, errors: ["event: object required"] };
  if (value.event_type === "recommendation.created")
    return validateRecommendationCreatedEventV1(value);
  if (value.event_type === "recommendation.outcome_observed")
    return validateOutcomeObservedEventV1(value);
  return { ok: false, errors: ["event_type: invalid value"] };
}

/** Validate an outcome against an already-authorized immutable recommendation. */
export function validateOutcomeAttributionV1(
  outcomeValue: unknown,
  recommendationValue: unknown,
): EventValidationResult {
  const outcomeValidation = validateOutcomeObservedEventV1(outcomeValue);
  if (!outcomeValidation.ok) return outcomeValidation;
  const recommendationValidation = validateRecommendationCreatedEventV1(recommendationValue);
  if (!recommendationValidation.ok) return recommendationValidation;
  const outcome = outcomeValue as OutcomeObservedEventV1;
  const recommendation = recommendationValue as RecommendationCreatedEventV1;
  const errors: string[] = [];
  if (outcome.join.recommendation_event_id !== recommendation.event_id)
    errors.push("attribution: recommendation ID mismatch");
  if (outcome.environment !== recommendation.environment)
    errors.push("attribution: environment mismatch");
  for (const field of [
    "tenant_id",
    "subject_ref",
    "session_id",
    "actor_ref_hash",
    "experiment_id",
    "variant",
    "decision_ref",
  ] as const) {
    if (outcome.join[field] !== recommendation.join[field])
      errors.push(`attribution: ${field} mismatch`);
  }
  if (
    outcome.source.kind !== recommendation.source.kind ||
    outcome.source.eval_case_id !== recommendation.source.eval_case_id ||
    outcome.source.eval_suite_id !== recommendation.source.eval_suite_id
  )
    errors.push("attribution: source/eval mismatch");
  if (outcome.join.trace_id !== recommendation.join.trace_id)
    errors.push("attribution: trace mismatch");
  if (Date.parse(outcome.outcome.observed_at) < Date.parse(recommendation.occurred_at))
    errors.push("attribution: outcome predates recommendation");
  return errors.length ? { ok: false, errors } : { ok: true };
}
