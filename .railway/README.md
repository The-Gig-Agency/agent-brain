# Agent Brain Railway configuration (AB-36)

The named `agent-brain` partial manages only the existing service in
`gallant-bravery` / `production`. Variables are unmanaged; domains, the separate
monitoring worker and its volume are outside this configuration's change scope.
The app is stateless and deterministic. No database, model call or job is added.

## Migration status

The reviewed configuration was applied on November 7, 2026, producing successful
deployment `5d5d615e-b91d-453c-9d38-832d401944b3` from merged PR #8 / commit
`99f1dac4ca96de7f8a3602dfafc027fd73cb7d25`. Health/readiness, both authenticated
routes, missing/wrong-token denial and all eight matching request logs passed.
See the [execution evidence](../docs/deploy/ab36-migration-2026-11-07.md).

That deployment still auto-detected the repository's old `railway.json`, even
though `railwayConfigFile` was null and migration status reported no explicit
Config as Code paths. No separate path-clearing cutover or undo snapshot existed.
This cleanup removes the old file so subsequent deployments use the applied IaC
settings alone. Close AB-36 only after its merged deployment is verified.

## Provider defaults and idempotency

Effective settings were verified through Railway's service API and deployment
manifest: Nixpacks, `npm run build`, `npm run start:router-recommend:v1`, `/health`,
timeout 300, ON_FAILURE with three retries, sleeping disabled and one us-west2 replica.

Railway's stored graph omits its ON_FAILURE and awake defaults, despite reporting
those effective values. Explicitly declaring `restartPolicyType: "ON_FAILURE"`
and `sleepApplication: false` caused repeated no-effect plan differences after apply.
The authoring file relies on these verified defaults, retains max retries 3, and
requires the operator to verify effective restart/sleep behavior after deployment.
The normalized read-only plan must contain zero changes and diagnostics.

## Plan and apply

Use CLI **5.71.0**, pinned dev SDK **3.16.0**, and Node 22/24 for configuration tooling.
Run the native CLI executable on PATH; the older installed CLI 4.30.3 has no IaC commands.

```sh
npm ci
npm run check
railway link --project ddc9d9d6-98be-4854-93c3-94ed324e3279 \
  --environment 0b3a3e78-f9d0-454e-ba54-5eea5ac6a23a \
  --service d0b95799-b5c1-4400-8d62-b532da2d0af9
railway config plan --file .railway/railway.ts --environment production \
  --json --out /tmp/agent-brain-reviewed.plan.json
```

Review source commit/tree, environment revision and every change. No creation,
deletion, source/domain/replica/credential edit or unrelated resource update is in
scope. Never use `--show-values`, `--decrypt-variables` or `--include-variables`.
Replan after any source/environment change. Apply only the exact reviewed artifact:

```sh
railway config apply --plan /tmp/agent-brain-reviewed.plan.json --environment production
```

After an actual change, verify deployment success and effective settings, public
health/readiness, both authenticated routes, four 401 denial checks, and request logs
from that exact deployment. Filter logs server-side by quoted exact synthetic trace
IDs (`@trace_id:"<id>"`), never retrieve unrelated production logs. Replan for zero drift.
Merging future authoring changes does not automatically run `config apply`.

## Rollback

Preserve the last healthy deployment and sanitized before-graph/plan. For an unhealthy
deployment, use Railway deployment rollback to the recorded healthy revision, then
repeat health/auth/log checks. If source cleanup needs reversal, restore the prior
`railway.json` from Git and review that deployment. A settings reversal needs its
own fresh, scoped plan; never reset credentials or touch the monitor/volume.

`migrate undo` applies only when a real cutover saved `.railway/.cac-migration.json`.
It is not a general rollback command, and this execution required no explicit path
cutover. Rollback was prepared, not induced against a healthy production service.
Transient plans/snapshots remain ignored; never commit secrets or authentication state.
