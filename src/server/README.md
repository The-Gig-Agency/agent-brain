# Internal router recommend HTTP service (v1)

Thin **Node `http`** server under `src/server/` (AB-25). Wraps `recommendRegime` from `src/cognitive-router` — **no routing logic in the transport layer**.

## Contract

- OpenAPI: [`../../docs/api/router-recommend-v1.yaml`](../../docs/api/router-recommend-v1.yaml)
- **POST** `/v1/recommend` — one JSON body → one recommendation (`api_version` in body).
- **GET** `/health` — liveness, **no auth** (for probes).

## Run

```bash
npm run build
npm run serve:router-recommend:v1
```

Default port **7399** (override with `PORT`).

## Auth (AB-26)

| Env | Purpose |
|-----|--------|
| `ROUTER_RECOMMEND_BEARER_TOKEN` | Shared secret for `Authorization: Bearer <token>`. **Required** in production-style runs unless bypass is set. |
| `ROUTER_RECOMMEND_ALLOW_UNAUTHENTICATED` | Set to `true` to skip bearer validation (**local dev only**). |

If bypass is not `true` and `ROUTER_RECOMMEND_BEARER_TOKEN` is empty, the server returns **503** on `/v1/recommend`.

## Observability (AB-26)

- One **JSON line per request** to stdout: `request_id`, `trace_id`, `method`, `path`, `status`, `duration_ms`, `level`, `service`.
- Accept optional **`X-Trace-Id`** from clients; if missing, the server generates a UUID and logs it.

## Smoke

```bash
npm run smoke:router-recommend:v1
```

## Internal example client (AB-27)

With server running (`ROUTER_RECOMMEND_ALLOW_UNAUTHENTICATED=true` **or** token set):

```bash
node examples/internal/router-recommend-client.example.mjs
```

Set `ROUTER_RECOMMEND_URL`, `ROUTER_RECOMMEND_BEARER_TOKEN`, and optionally `TRACE_ID` as needed.

## Scope limits (AB-25 / AB-27)

- No batch endpoint.
- No public SDK; service and example are **internal-facing** only.
