import type { FieldConfidence, SearchRegime, TerrainProfile } from "./types.js";

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

export type RecommendationOutcomeTelemetryEventV1 = RecommendationCreatedEventV1 | OutcomeObservedEventV1;

export type EventValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isOneOf<const T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === "string" && allowed.includes(value);
}

function isIsoDate(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function isFiniteUnitInterval(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function validateBaseEvent(value: unknown): { event: Record<string, unknown> | null; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { event: null, errors: ["event must be an object"] };
  }

  if (value.schema_version !== OUTCOME_EVENTS_SCHEMA_VERSION) {
    errors.push(`schema_version must be ${OUTCOME_EVENTS_SCHEMA_VERSION}`);
  }
  if (typeof value.event_id !== "string" || value.event_id.length === 0) {
    errors.push("event_id is required");
  }
  if (!isIsoDate(value.occurred_at)) {
    errors.push("occurred_at must be an ISO timestamp");
  }
  if (!isOneOf(value.environment, TELEMETRY_ENVIRONMENTS)) {
    errors.push("environment is invalid");
  }

  const source = value.source;
  if (!isRecord(source)) {
    errors.push("source is required");
  } else {
    if (!isOneOf(source.kind, TELEMETRY_SOURCE_KINDS)) {
      errors.push("source.kind is invalid");
    }
    if (!isOneOf(source.surface, TELEMETRY_SURFACES)) {
      errors.push("source.surface is invalid");
    }
    if (source.kind === "eval" && typeof source.eval_case_id !== "string") {
      errors.push("eval source requires eval_case_id");
    }
  }

  const join = value.join;
  if (!isRecord(join)) {
    errors.push("join is required");
  } else {
    if (typeof join.recommendation_event_id !== "string" || join.recommendation_event_id.length === 0) {
      errors.push("join.recommendation_event_id is required");
    }
    if (typeof join.trace_id !== "string" || join.trace_id.length === 0) {
      errors.push("join.trace_id is required");
    }
  }

  const privacy = value.privacy;
  if (!isRecord(privacy)) {
    errors.push("privacy is required");
  } else {
    if (privacy.contains_raw_user_text !== false) {
      errors.push("privacy.contains_raw_user_text must be false");
    }
    if (privacy.contains_evaluator_only_fields !== false) {
      errors.push("privacy.contains_evaluator_only_fields must be false");
    }
  }

  return { event: value, errors };
}

export function summarizeFieldConfidence(fieldConfidence: FieldConfidence | undefined): FieldConfidenceSummaryV1 {
  const entries = Object.entries(fieldConfidence ?? {}).filter((entry): entry is [string, number] =>
    typeof entry[1] === "number" && Number.isFinite(entry[1])
  );
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const average = entries.length > 0 ? Math.round((total / entries.length) * 1000) / 1000 : null;
  return {
    present_count: entries.length,
    average_confidence: average,
    low_confidence_fields: entries.filter(([, value]) => value < 0.5).map(([field]) => field).sort(),
  };
}

export function validateRecommendationCreatedEventV1(value: unknown): EventValidationResult {
  const { event, errors } = validateBaseEvent(value);
  if (!event) {
    return { ok: false, errors };
  }
  if (event.event_type !== "recommendation.created") {
    errors.push("event_type must be recommendation.created");
  }

  const input = event.input;
  if (!isRecord(input)) {
    errors.push("input is required");
  } else if (!isRecord(input.terrain_profile)) {
    errors.push("input.terrain_profile is required");
  }

  const recommendation = event.recommendation;
  if (!isRecord(recommendation)) {
    errors.push("recommendation is required");
  } else if (!isFiniteUnitInterval(recommendation.confidence)) {
    errors.push("recommendation.confidence must be between 0 and 1");
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function validateOutcomeObservedEventV1(value: unknown): EventValidationResult {
  const { event, errors } = validateBaseEvent(value);
  if (!event) {
    return { ok: false, errors };
  }
  if (event.event_type !== "recommendation.outcome_observed") {
    errors.push("event_type must be recommendation.outcome_observed");
  }

  const outcome = event.outcome;
  if (!isRecord(outcome)) {
    errors.push("outcome is required");
  } else {
    if (!isOneOf(outcome.status, OUTCOME_STATUSES)) {
      errors.push("outcome.status is invalid");
    }
    if (!isIsoDate(outcome.observed_at)) {
      errors.push("outcome.observed_at must be an ISO timestamp");
    }
    if (typeof outcome.measurement_window_hours !== "number" || outcome.measurement_window_hours <= 0) {
      errors.push("outcome.measurement_window_hours must be positive");
    }
    if (outcome.quality_score !== undefined && !isFiniteUnitInterval(outcome.quality_score)) {
      errors.push("outcome.quality_score must be between 0 and 1");
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function validateRecommendationOutcomeTelemetryEventV1(value: unknown): EventValidationResult {
  if (!isRecord(value)) {
    return { ok: false, errors: ["event must be an object"] };
  }
  if (value.event_type === "recommendation.created") {
    return validateRecommendationCreatedEventV1(value);
  }
  if (value.event_type === "recommendation.outcome_observed") {
    return validateOutcomeObservedEventV1(value);
  }
  return { ok: false, errors: ["event_type is invalid"] };
}
