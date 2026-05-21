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
