# Internal router recommend HTTP service (v1)

Thin **Node `http`** server under `src/server/` (AB-25). Wraps `recommendRegime` from `src/cognitive-router` — **no routing logic in the transport layer**. **AB-40** adds messy-text intake on a separate path from structured recommend.

## Contract

- OpenAPI: [`../../docs/api/router-recommend-v1.yaml`](../../docs/api/router-recommend-v1.yaml)
- **POST** `/v1/recommend` — one JSON body with full **terrain** dimensions → one recommendation (`api_version` in body). Structured contract (AB-24/25).
- **POST** `/v1/intake-recommend` — **problem_summary** (+ optional `context`, `signals`) → heuristic ingestion (`ingestProblem`) → same recommendation shape, plus `trace_id`, inferred `terrain_profile`, confidences, clarification questions, and `regime_hint` (**AB-40**). Does not replace `/v1/recommend` for callers that already have terrain.
- **GET** `/health` — liveness, **no auth** (process is alive).
- **GET** `/ready` — readiness, **no auth** (returns `503` when production auth is not configured).

## Run

```bash
npm run build
npm run start:router-recommend:v1
```

Default port **7399** (override with `PORT`).

`npm run serve:router-recommend:v1` remains as a local convenience command that builds before starting.

## Auth (AB-26)

| Env | Purpose |
|-----|--------|
| `ROUTER_RECOMMEND_BEARER_TOKEN` | Shared secret for `Authorization: Bearer <token>`. **Required** in production-style runs unless bypass is set. |
| `ROUTER_RECOMMEND_ALLOW_UNAUTHENTICATED` | Set to `true` to skip bearer validation (**local dev only**). |

If bypass is not `true` and `ROUTER_RECOMMEND_BEARER_TOKEN` is empty, the server returns **503** on authenticated POST routes (`/v1/recommend`, `/v1/intake-recommend`).

## Observability (AB-26)

- One **JSON line per request** to stdout: `request_id`, `trace_id`, `method`, `path`, `status`, `duration_ms`, `level`, `service`.
- Accept optional **`X-Trace-Id`** from clients; if missing, the server generates a UUID and logs it.

## Smoke

```bash
npm run smoke:router-recommend:v1
npm run smoke:intake-recommend-v1
npm run smoke:router-recommend-http:v1
npm run smoke:router-recommend-ops:v1
```

## Railway wrapper (AB-34 / AB-35)

- Railway config: [`../../railway.json`](../../railway.json)
- Build command: `npm ci && npm run build`
- Start command: `npm run start:router-recommend:v1`
- Health check: `GET /health`
- Readiness check: `GET /ready`
- Required production env: `ROUTER_RECOMMEND_BEARER_TOKEN`
- Optional local-only env: `ROUTER_RECOMMEND_ALLOW_UNAUTHENTICATED=true`

Topology and rollout notes live in [`../../docs/deploy/railway-router-recommend-v1.md`](../../docs/deploy/railway-router-recommend-v1.md). Runtime settings live in [`../../deploy/RAILWAY_RUNTIME.md`](../../deploy/RAILWAY_RUNTIME.md), and the deployment checklist lives in [`../../docs/deploy/router-recommend-observability-checklist-v1.md`](../../docs/deploy/router-recommend-observability-checklist-v1.md).

## Internal example clients (AB-27 / AB-40)

With server running (`ROUTER_RECOMMEND_ALLOW_UNAUTHENTICATED=true` **or** token set):

```bash
node examples/internal/router-recommend-client.example.mjs
node examples/internal/router-intake-recommend-client.example.mjs
```

Set `ROUTER_RECOMMEND_URL`, `ROUTER_RECOMMEND_BEARER_TOKEN`, and optionally `TRACE_ID` as needed.

## Scope limits (AB-25 / AB-27 / AB-40)

- No batch endpoint.
- No public SDK; service and examples are **internal-facing** only.
