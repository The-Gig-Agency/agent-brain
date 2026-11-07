import {
  validateOutcomeAttributionV1,
  validateRecommendationCreatedEventV1,
  type OutcomeObservedEventV1,
  type RecommendationCreatedEventV1,
} from "../../outcome-events-v1.js";
import { validateMusicDnaLearningEnvelopeV1 } from "./learning-observation-v1.js";

/** Supplied by the authorized receiver's source registry, never by the observation. */
export type MusicDnaOutcomeContext = {
  source_key: "music-dna-staging" | "music-dna";
  tenant_id: string;
  environment: "staging" | "production";
  measurement_window_hours: number;
};

export type MusicDnaOutcomeMapping =
  | { ok: false; errors: string[] }
  | {
      ok: true;
      attribution: "unattributed";
      observation_id: string;
      reason:
        "no_recorded_recommendation" | "recommendation_not_found" | "decision_context_missing";
    }
  | { ok: true; attribution: "matched"; event: OutcomeObservedEventV1 };

/**
 * Project a directly attributed synthetic observation into the generic outcome
 * contract. The domain feedback remains on the original observation/receipt.
 * Reading agreement is never inferred to mean a successful router decision.
 * Cohort attribution/production consent are deliberately outside this v1 pilot.
 */
export function mapMusicDnaObservationToOutcomeV1(
  envelopeValue: unknown,
  recommendationValue: unknown,
  context: MusicDnaOutcomeContext,
): MusicDnaOutcomeMapping {
  const validated = validateMusicDnaLearningEnvelopeV1(envelopeValue);
  if (!validated.ok) return validated;
  const envelope = validated.value;
  const observation = envelope.metadata.observation;
  if (
    envelope.source !== context.source_key ||
    envelope.environment !== context.environment ||
    typeof context.tenant_id !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/.test(context.tenant_id)
  ) {
    return { ok: false, errors: ["attribution: source registry binding mismatch"] };
  }
  const unattributed = (
    reason: "no_recorded_recommendation" | "recommendation_not_found" | "decision_context_missing",
  ): MusicDnaOutcomeMapping => ({
    ok: true,
    attribution: "unattributed",
    observation_id: observation.observation_id,
    reason,
  });
  if (observation.policy.recommendation_event_id === null)
    return unattributed("no_recorded_recommendation");
  if (recommendationValue === null || recommendationValue === undefined)
    return unattributed("recommendation_not_found");
  const recommendationValidation = validateRecommendationCreatedEventV1(recommendationValue);
  if (!recommendationValidation.ok) return recommendationValidation;
  const recommendation = recommendationValue as RecommendationCreatedEventV1;
  if (recommendation.join.decision_ref === undefined)
    return unattributed("decision_context_missing");
  const expectedEnvironment = context.environment === "production" ? "prod" : "staging";
  if (
    recommendation.event_id !== observation.policy.recommendation_event_id ||
    recommendation.environment !== expectedEnvironment ||
    recommendation.join.tenant_id !== context.tenant_id ||
    recommendation.join.subject_ref !== observation.subject_ref ||
    recommendation.join.decision_ref !== observation.decision.ref ||
    (recommendation.join.experiment_id ?? null) !== observation.policy.experiment_id ||
    (recommendation.join.variant ?? null) !== observation.policy.variant ||
    recommendation.policy.policy_id !== observation.policy.id ||
    recommendation.policy.router_version !== observation.policy.version
  ) {
    return { ok: false, errors: ["attribution: immutable recommendation context mismatch"] };
  }
  // Contract v1 accepts synthetic evidence only; it must not contaminate live metrics.
  if (recommendation.source.kind !== "eval") {
    return {
      ok: false,
      errors: ["attribution: synthetic evidence cannot join production telemetry"],
    };
  }
  const event: OutcomeObservedEventV1 = {
    schema_version: "outcome-events.v1",
    event_type: "recommendation.outcome_observed",
    event_id: observation.observation_id,
    occurred_at: observation.observed_at,
    environment: expectedEnvironment,
    source: { ...recommendation.source, surface: "internal:adapter" },
    join: {
      recommendation_event_id: recommendation.event_id,
      trace_id: recommendation.join.trace_id,
      tenant_id: context.tenant_id,
      subject_ref: observation.subject_ref,
      decision_ref: observation.decision.ref,
      result_ref: observation.decision.result_ref,
      result_version: observation.decision.result_version,
      observation_id: observation.observation_id,
      ...(observation.policy.experiment_id !== null && observation.policy.variant !== null
        ? { experiment_id: observation.policy.experiment_id, variant: observation.policy.variant }
        : {}),
    },
    outcome: {
      status: "unknown",
      observed_at: observation.observed_at,
      measurement_window_hours: context.measurement_window_hours,
      operator_label: `musicdna_feedback_${observation.feedback.accuracy ?? "rating_only"}`,
    },
    privacy: {
      contains_raw_user_text: false,
      contains_evaluator_only_fields: false,
      redaction_level: "hashes_only",
    },
  };
  const attribution = validateOutcomeAttributionV1(event, recommendation);
  return attribution.ok ? { ok: true, attribution: "matched", event } : attribution;
}
