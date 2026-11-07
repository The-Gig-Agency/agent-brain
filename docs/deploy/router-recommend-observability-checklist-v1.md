# Router recommend observability checklist v1

**Ticket:** AB-37  
**Service:** `router-recommend-v1`

## Required signals

| Signal | Source | Healthy value |
|--------|--------|---------------|
| Liveness | `GET /health` | `200`, `{ "ok": true }` |
| Readiness | `GET /ready` | `200`, `checks.auth_configured: true`, `checks.allow_unauthenticated: false` |
| Auth rejection | unauthenticated `POST /v1/recommend` | `401` |
| Recommendation path | authenticated `POST /v1/recommend` | `200`, response includes `api_version` and `recommendation.primary_regime` |
| Intake path | authenticated `POST /v1/intake-recommend` | `200`, response includes the caller trace and inferred terrain/recommendation |
| Structured logs | Railway stdout | one JSON line per request with correlation and timing fields |

## Structured log contract

Each request log must include:

- `service: "router-recommend-v1"`
- `request_id`
- `trace_id`
- `method`
- `path`
- `status`
- `duration_ms`
- `level`

Status-to-level mapping:

| Status | Level |
|--------|-------|
| `2xx` and `3xx` | `info` |
| `4xx` | `warn` |
| `5xx` | `error` |

## Local verification

Run:

```bash
npm ci
npm run check
npm run smoke:router-recommend-ops:v1
```

This starts the HTTP wrapper on a random local port, verifies readiness, verifies unauthorized and authorized recommendation requests, captures stdout, and asserts the structured log contract.

The [source CI workflow](../../.github/workflows/verify.yml) additionally checks the handlers, HTTP wrapper, Music DNA contracts/mapping/outcomes and frozen regression runners on Node 22/24 Linux. It has read-only repository permissions, receives no production secrets and performs no deployment or model calls. It is a local regression gate, not a production monitor.

## Railway verification

After deploy, check Railway logs for:

1. Startup log with `method: "LISTEN"`.
2. `/health` entries from Railway health checks.
3. `/ready` returning `200`.
4. Authenticated `/v1/recommend` entry with the caller-provided `trace_id`.
5. No `SERVICE_MISCONFIGURED` messages.

Use the existing example clients and injected caller token as described in the [runtime runbook](../../deploy/RAILWAY_RUNTIME.md#railway-verification). Capture the serving commit/deployment, UTC timestamp, route/status/API version and trace IDs. Save sanitized client summaries and matching server log lines on AB-37; never include bearer headers or real listener payloads. Verify both structured and intake routes and record no-token/wrong-token denials separately.

## Continuous monitoring acceptance

Railway's [deployment health check](https://docs.railway.com/deployments/healthchecks) gates deployment startup; it does not establish ongoing availability or alert delivery. Before closing AB-37, record the actual existing monitor or reviewed monitor configuration and verify its notification path:

- Probe `/ready` every 60 seconds with a 10-second timeout, expecting `200`, `auth_configured=true` and `allow_unauthenticated=false`. Alert after three consecutive failures and notify on recovery.
- Record the selected on-call recipient/channel and verify a test alert and recovery notification with that owner. No new Slack/email notification is sent merely by adding this checklist.
- Check the existing metrics/log view for request volume, unauthorized responses, `5xx` and latency. Record the initial normal/error evidence; set operational thresholds with the service owner from actual traffic instead of inventing a success claim from a quiet service.
- Monitor probes do not call recommendation/model endpoints or create learning work. Do not create a new scheduler or background learning job as a substitute for service monitoring.

These are proposed acceptance settings until the monitor identity, owner and delivered test alert are recorded. A documented threshold alone is not proof of an active monitor.

## Deployment decision

The deployment is ready for AB-41 integration only when:

- `/health` is green in Railway.
- `/ready` returns `200`.
- `ROUTER_RECOMMEND_ALLOW_UNAUTHENTICATED` is absent or not `true`.
- An authenticated smoke recommendation succeeds.
- An unauthenticated recommendation fails with `401`.
- Logs are valid JSON and include the caller trace id.
- A monitor/notification owner and delivered alert/recovery test are recorded.
- The serving revision and the configuration migration decision are recorded under AB-36.

## Escalation notes

- `503` on `/ready`: set or repair `ROUTER_RECOMMEND_BEARER_TOKEN`.
- `401` on authorized client requests: compare the caller token with Railway `ROUTER_RECOMMEND_BEARER_TOKEN`.
- Missing trace correlation: fix the caller to send `X-Trace-Id`.
- Repeated `5xx`: rollback the Railway deployment and inspect the last error-level log line.
