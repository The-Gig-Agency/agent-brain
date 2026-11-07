# Outcome events v1

**Ticket:** AB-28  
**Epic:** AB-6 live outcome learning and production feedback loops  
**Status:** Contract for recommendation and outcome telemetry. Storage and dashboards are intentionally later work.

## Purpose

Outcome learning needs two separate event families:

1. `recommendation.created` records what the router recommended and the redacted terrain context it used.
2. `recommendation.outcome_observed` records what happened later, joined back to the recommendation.

The contract is implemented in `src/cognitive-router/outcome-events-v1.ts`.

## Recommendation event

`RecommendationCreatedEventV1` captures:

- `schema_version: "outcome-events.v1"`
- `event_type: "recommendation.created"`
- stable `event_id`
- `occurred_at`
- `environment`: `dev`, `staging`, or `prod`
- `source`: production or eval, plus the surface that emitted the event
- `join`: correlation keys
- redacted input shape
- selected regimes and confidence
- policy/API version
- privacy attestation

The recommendation event must not store raw user text. If callers need later deduplication, store a hash in `input.problem_summary_hash`.

## Outcome event

`OutcomeObservedEventV1` captures:

- `schema_version: "outcome-events.v1"`
- `event_type: "recommendation.outcome_observed"`
- stable `event_id`
- `occurred_at`
- `environment`
- matching `source`
- matching `join`
- `outcome.status`
- `outcome.observed_at`
- `outcome.measurement_window_hours`
- optional quality/cost/latency labels
- privacy attestation

Allowed statuses:

| Status | Meaning |
|--------|---------|
| `accepted` | Human or caller accepted the recommendation. |
| `rejected` | Human or caller explicitly rejected it. |
| `acted_on` | The recommendation led to a concrete downstream action. |
| `succeeded` | The downstream action met the domain success criterion. |
| `failed` | The downstream action failed or caused rollback. |
| `superseded` | A later recommendation or human choice replaced it. |
| `unknown` | Outcome window elapsed without a reliable label. |

## Join keys

`join.recommendation_event_id` is the primary join key. It must equal the recommendation event `event_id` for any outcome event.

`join.trace_id` preserves request/log correlation across HTTP, Railway, edge-bot, and future telemetry consumers.

Optional joins:

| Key | Use |
|-----|-----|
| `tenant_id` | Tenant/account boundary. |
| `subject_ref` | Redacted domain object reference, such as a Slack thread id or task id. |
| `session_id` | Multi-turn session grouping. |
| `actor_ref_hash` | Hashed operator or user identity. |

## Time windows

Default constants:

| Window | Hours | Use |
|--------|-------|-----|
| `immediate_hours` | 24 | Acceptance/rejection and near-term action. |
| `default_hours` | 168 | Most operational outcomes. |
| `long_horizon_hours` | 720 | Slow product, GTM, or organizational outcomes. |

Outcome events should include the actual `measurement_window_hours` used. Do not infer a win from missing data; emit `unknown` when the window elapsed without a reliable label.

## Eval data vs production telemetry

Production events:

- `source.kind: "production"`
- no evaluator-only fields
- no hidden labels
- no raw prompts or raw user text
- may include hashes and redacted domain references

Eval events:

- `source.kind: "eval"`
- must include `source.eval_case_id`
- may include `source.eval_suite_id`
- still must not leak evaluator-only fields into production-shaped telemetry

The privacy attestation requires:

```json
{
  "contains_raw_user_text": false,
  "contains_evaluator_only_fields": false
}
```

## Validation

Run:

```bash
npm run smoke:outcome-events:v1
```

The selftest validates a recommendation event, an outcome event, join-key consistency, low-confidence field summarization, eval-source requirements, and privacy rejection for raw-text events.

## Strict boundary validation and Music DNA mapping (AB-28 / AB-43)

Runtime validation now requires every declared required field, closed nested field allowlists, full terrain/regime enums, bounded technical identifiers, digest-shaped hashes, finite numeric ranges and calendar-valid RFC3339 timestamps (UTC/offsets and second/fractional precision). Optional outcome labels are bounded codes, not prose. Production telemetry cannot carry eval-case/suite metadata; privacy attestations do not make unknown text fields acceptable. Created-event self-join IDs must equal their event IDs.

`validateOutcomeAttributionV1` additionally checks an outcome against a separately loaded, already-authorized immutable recommendation: recommendation ID, environment, trace, tenant/subject/actor/decision/experiment scope and temporal ordering. The caller must still authorize the source/record and persist unique events; a pure validator cannot prove a database reference exists or authenticate an API request. Late outcome events remain valid, append-only records; do not conflate the original request trace with a new delivery correlation ID.

The optional join references `decision_ref`, `result_ref`, `result_version`, `observation_id`, `experiment_id` and `variant` support exact-version attribution. Result versions must be positive safe integers and experiment/variant are present together. These additions do not change the public recommendation HTTP response.

The shared synthetic-only [Music DNA contract](../../../contracts/musicdna-learning/v1/README.md) and `integrations/musicdna/learning-outcome.ts` bridge the domain observation to these existing event families. Unknown recommendation/policy provenance stays unattributed, with no invented outcome; matched reading feedback stays `unknown` and never becomes an automatic `succeeded`, `accepted` or inferred quality score. The original observation retains accuracy/rating, located by observation ID. The source registry supplies tenant/environment binding and the agreed measurement window. The initial mapper handles direct synthetic-session attribution only; real-user consent and cohort assignment remain later gates.

Run `npm run check:learning-contract` for pinned cross-repo envelope/receipt fixtures and `npm run smoke:outcome-events:v1` for positive/negative outcome validation plus retry, tenant denial and late-version mapping. Pass another repository's manifest path to the contract checker for a cross-repo checksum comparison.
