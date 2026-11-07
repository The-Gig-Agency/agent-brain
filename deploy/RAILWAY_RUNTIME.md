# Railway runtime: router-recommend-v1

**Tickets:** AB-36, AB-37  
**Service:** `router-recommend-v1`  
**Runtime:** Railway web service, Node 20+, stateless.

## Existing deployment

- Host: <https://agent-brain-production-6956.up.railway.app>
- Project/environment: `gallant-bravery` / `production`.
- Source: `The-Gig-Agency/agent-brain`, branch `master`.
- `router-recommend-v1` is the HTTP service identifier in responses/logs. Confirm the dashboard service identity before changing configuration; do not create a duplicate service.

These are the settings declared by the existing repository's `railway.json`. Confirm them against the selected service and deployment before an infrastructure change.

| Setting | Value |
|---------|-------|
| Builder | Nixpacks |
| Install phase | Nixpacks installs dependencies with `npm ci` |
| Build command | `npm run build` |
| Start command | `npm run start:router-recommend:v1` |
| Health check path | `/health` |
| Restart policy | on failure, max 3 retries |

The service starts from `dist/`; Railway deploys must not use the local convenience `serve:*` script. Do not run `npm ci` again in the build command: Nixpacks' mounted `node_modules/.cache` can produce `EBUSY`. See the [build triage notes](../docs/deploy/railway-router-recommend-v1.md#railway-build-npm-error-ebusy--rmdir-appnode_modulescache).

## Configuration migration gate (AB-36)

[Railway's current migration documentation](https://docs.railway.com/infrastructure-as-code) says existing `railway.json`/`railway.toml` files stop being read on **2026-12-01**. The committed file describes the existing legacy deployment; it is not a completed migration.

1. Use a current Railway CLI with the documented `config` commands. Authentication was restored and production checks passed on November 6, 2026; migration preview uses CLI `5.71.0`, while the installed CLI `4.30.3` lacks the new config commands.
2. Select the existing project/environment/service and record the serving commit, builder, install/build/start commands, health check, restart policy and current variable names. Keep secret values out of logs and source.
3. Use `railway config migrate` to preview the existing service's configuration. For an import, `railway config pull` preserves variables by reference; do not use `--include-variables`. This project can contain other repos' services: preserve resource ownership and use the documented named-partial approach where applicable.
4. Prepare the generated configuration for review using the current CLI's actual help. In CLI `5.71.0`, `railway config migrate --apply` writes the local authoring file only. The separate `railway config migrate cutover` command changes the hosted config-file settings and saves an undo snapshot. Review the generated file and migration sequence before cutover; keep `railway.json` until that sequence is complete. A TypeScript plan also needs the documented `railway` SDK; a disposable preview installation is separate from adding it to this app's dependencies.
5. A subsequent reviewed migration must preserve the existing service/domain/auth and show no unexpected service or variable deletions. Verify health, authenticated routes and log correlation afterward, and record rollback evidence before closing AB-36.

This runbook/CI repair performs no hosted migration and adds no Railway SDK dependency. Keep migration acceptance open until actual service inspection and a reviewed plan/application are recorded.

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
npm ci
npm run check
npm run smoke:router-recommend:v1
npm run smoke:intake-recommend-v1
npm run smoke:router-recommend-http:v1
npm run smoke:router-recommend-ops:v1
npm run smoke:outcome-events:v1
npm run smoke:musicdna-mapper
npm run eval:frozen:debug:v1
npm run eval:frozen:media:v1
```

The same commands run in [GitHub Actions](../.github/workflows/verify.yml) on Linux with Node 22 and 24. They use synthetic local inputs, need no production secrets, and do not call models or deploy services. A green source workflow is separate from hosted acceptance.

## Railway verification

After deployment:

1. Confirm Railway health check is green for `/health`.
2. Check `/ready`; it must return `200` in Railway.
3. Confirm `/ready` response has `checks.auth_configured: true` and `checks.allow_unauthenticated: false`.
4. Send an authenticated `POST /v1/recommend` with an upstream `X-Trace-Id`.
5. Confirm Railway logs contain one JSON line for each request and include the upstream trace id.
6. Confirm unauthenticated `POST /v1/recommend` returns `401`.

Run the existing [structured](../examples/internal/router-recommend-client.example.mjs) and [intake](../examples/internal/router-intake-recommend-client.example.mjs) clients from an authorized caller environment with the matching token already injected. Set `ROUTER_RECOMMEND_URL` to the hostname above and use a fresh `TRACE_ID`. Do not paste a production bearer into chat, shell history or ticket evidence. Their synthetic example payloads test the generic HTTP service; they do not prove the Music DNA-specific adapter or learning loop.

Record commit/deployment, timestamp, status, response API version and trace IDs, then correlate both client traces with Railway JSON logs. See the [monitoring and acceptance checklist](../docs/deploy/router-recommend-observability-checklist-v1.md). Missing-token rejection and public readiness alone do not complete AB-37.

## Rollback

Rollback should be a Railway deployment rollback to the last healthy commit. If a token is suspected to be exposed, rotate `ROUTER_RECOMMEND_BEARER_TOKEN` first, then redeploy or restart both the service and callers.

## Expected next integration

- The intake-aware route for messy text is implemented under AB-40.
- AB-51 verifies/reconciles the actual EdgeBot client and adds the new Music DNA learning skill; historical AB-41 completion is not proof that its documented script is present today.
- AB-6 tracks the remaining evidence transport, scoped review, experiment and governed application stages. Ordinary observations do not trigger model calls.
