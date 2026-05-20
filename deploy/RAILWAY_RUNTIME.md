# Railway runtime: router-recommend-v1

**Tickets:** AB-36, AB-37  
**Service:** `router-recommend-v1`  
**Runtime:** Railway web service, Node 20+, stateless.

## Deploy settings

Railway should read `railway.json` from the repository root.

| Setting | Value |
|---------|-------|
| Builder | Nixpacks |
| Build command | `npm ci && npm run build` |
| Start command | `npm run start:router-recommend:v1` |
| Health check path | `/health` |
| Restart policy | on failure, max 3 retries |

The service starts from `dist/`; Railway deploys must not use the local convenience `serve:*` script.

## Required environment

| Env var | Required | Notes |
|---------|----------|-------|
| `PORT` | Railway-provided | The server falls back to `7399` for local runs. |
| `ROUTER_RECOMMEND_BEARER_TOKEN` | yes | Shared bearer for internal callers. Rotate when a calling service secret is exposed. |
| `ROUTER_RECOMMEND_ALLOW_UNAUTHENTICATED` | no | Local-only bypass. Do not set this in Railway. |

Do not add YouTrack, Repo C, Supabase, or filesystem persistence env vars for this service. The v1 router recommendation service is a pure HTTP wrapper around in-repo cognitive-router code.

## Runtime behavior

- `GET /health` returns `200` when the process can answer HTTP.
- `GET /ready` returns `200` only when auth is configured or the local bypass is enabled.
- `POST /v1/recommend` requires `Authorization: Bearer <ROUTER_RECOMMEND_BEARER_TOKEN>`.
- Logs are JSON lines on stdout with `service`, `request_id`, `trace_id`, `method`, `path`, `status`, `duration_ms`, and `level`.
- Callers should send `X-Trace-Id` so Railway logs can be correlated with upstream job or Slack request logs.

## Pre-deploy checklist

Run before opening or promoting a Railway deployment:

```bash
npm run check
npm run smoke:router-recommend:v1
npm run smoke:router-recommend-http:v1
npm run smoke:router-recommend-ops:v1
```

## Railway verification

After deployment:

1. Confirm Railway health check is green for `/health`.
2. Check `/ready`; it must return `200` in Railway.
3. Confirm `/ready` response has `checks.auth_configured: true` and `checks.allow_unauthenticated: false`.
4. Send an authenticated `POST /v1/recommend` with an upstream `X-Trace-Id`.
5. Confirm Railway logs contain one JSON line for each request and include the upstream trace id.
6. Confirm unauthenticated `POST /v1/recommend` returns `401`.

## Rollback

Rollback should be a Railway deployment rollback to the last healthy commit. If a token is suspected to be exposed, rotate `ROUTER_RECOMMEND_BEARER_TOKEN` first, then redeploy or restart both the service and callers.

## Expected next integration

- AB-40 adds the intake-aware route for messy text.
- AB-41 wires the Railway edge-bot client/skill to this hosted service.
- AB-6 work adds live outcome telemetry after the hosted recommendation path is stable.
