# Railway router recommend v1 topology

**Tickets:** AB-34, AB-35, AB-36, AB-37  
**Service:** `router-recommend-v1`  
**Status:** Internal hosted-service design, wrapper contract, Railway config, and ops checklist.

## Target shape

Run `agent-brain` as one stateless Railway web service:

```text
internal caller / hosted agent
  -> HTTPS + Bearer token
  -> agent-brain Railway service
  -> Node http wrapper
  -> recommend-v1 handler
  -> cognitive-router core
```

The service owns HTTP, auth, request limits, structured request logs, health, and readiness. Router policy remains in `src/cognitive-router/`; the transport wrapper must stay thin.

## Routes

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /health` | no | Liveness only: process can answer HTTP. |
| `GET /ready` | no | Readiness: returns `503` if production auth is not configured. |
| `POST /v1/recommend` | bearer | Structured terrain assessment → regime recommendation. |
| `POST /v1/intake-recommend` | bearer | Messy problem text → inferred terrain + clarification + recommendation (AB-40). |

AB-40 adds `/v1/intake-recommend`. Do not overload `POST /v1/recommend`; it remains the structured terrain contract from AB-24/25.

## Railway commands

Recommended Railway settings are committed in [`../../railway.json`](../../railway.json):

```text
Build command: npm ci && npm run build
Start command: npm run start:router-recommend:v1
Health check path: /health
```

`npm run serve:router-recommend:v1` remains a local convenience command because it builds before starting. Hosted environments should start from `dist/`.

## Environment

| Env var | Required | Notes |
|---------|----------|-------|
| `PORT` | Railway-provided | Falls back to `7399` locally. |
| `ROUTER_RECOMMEND_BEARER_TOKEN` | production yes | Shared bearer used by internal clients. |
| `ROUTER_RECOMMEND_ALLOW_UNAUTHENTICATED` | no | Local-only escape hatch. Do not set to `true` in Railway production. |

Future AB-40/41 client env names:

| Env var | Owner |
|---------|-------|
| `AGENT_BRAIN_URL` | edge-bot / calling services |
| `AGENT_BRAIN_BEARER_TOKEN` | edge-bot / calling services |

## Operational boundaries

- No persistent disk required for v1.
- No Supabase dependency required for the recommendation-only service.
- Logs are JSON lines on stdout with `request_id`, `trace_id`, `method`, `path`, `status`, and `duration_ms`.
- Callers should pass `X-Trace-Id` when they have one; otherwise the service generates a trace id.
- HTTP body limit is `ROUTER_RECOMMEND_MAX_BODY_BYTES` from `src/server/constants.ts`.

Runtime details live in [`../../deploy/RAILWAY_RUNTIME.md`](../../deploy/RAILWAY_RUNTIME.md). The observability checklist lives in [`router-recommend-observability-checklist-v1.md`](router-recommend-observability-checklist-v1.md).

## Go-live checks

1. Build locally: `npm run check`.
2. Smoke handlers: `npm run smoke:router-recommend:v1` and `npm run smoke:intake-recommend-v1`.
3. Smoke HTTP wrapper: `npm run smoke:router-recommend-http:v1`.
4. Smoke ops/readiness/logging: `npm run smoke:router-recommend-ops:v1`.
5. Start locally with auth bypass only for dev:

   ```bash
   ROUTER_RECOMMEND_ALLOW_UNAUTHENTICATED=true npm run serve:router-recommend:v1
   ```

6. Confirm `GET /health` returns `200`.
7. Confirm `GET /ready` returns `200` with bypass locally, and returns `503` if neither bypass nor bearer token is configured.
8. In Railway, set `ROUTER_RECOMMEND_BEARER_TOKEN`, deploy, then verify `/health`, `/ready`, and authenticated `POST /v1/recommend` and `POST /v1/intake-recommend`.

## What is intentionally not solved here

- AB-41: edge-bot/OpenClaw workspace skill and client.
- AB-6: live outcome learning, telemetry ingestion, and calibration loops.
