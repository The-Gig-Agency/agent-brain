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
npm run smoke:router-recommend-ops:v1
```

This starts the HTTP wrapper on a random local port, verifies readiness, verifies unauthorized and authorized recommendation requests, captures stdout, and asserts the structured log contract.

## Railway verification

After deploy, check Railway logs for:

1. Startup log with `method: "LISTEN"`.
2. `/health` entries from Railway health checks.
3. `/ready` returning `200`.
4. Authenticated `/v1/recommend` entry with the caller-provided `trace_id`.
5. No `SERVICE_MISCONFIGURED` messages.

## Deployment decision

The deployment is ready for AB-41 integration only when:

- `/health` is green in Railway.
- `/ready` returns `200`.
- `ROUTER_RECOMMEND_ALLOW_UNAUTHENTICATED` is absent or not `true`.
- An authenticated smoke recommendation succeeds.
- An unauthenticated recommendation fails with `401`.
- Logs are valid JSON and include the caller trace id.

## Escalation notes

- `503` on `/ready`: set or repair `ROUTER_RECOMMEND_BEARER_TOKEN`.
- `401` on authorized client requests: compare the caller token with Railway `ROUTER_RECOMMEND_BEARER_TOKEN`.
- Missing trace correlation: fix the caller to send `X-Trace-Id`.
- Repeated `5xx`: rollback the Railway deployment and inspect the last error-level log line.
