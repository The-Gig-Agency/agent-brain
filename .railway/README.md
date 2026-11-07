# Agent Brain Railway configuration (AB-36)

This named partial manages the existing `agent-brain` service in `gallant-bravery` / `production`. It preserves the deployed Nixpacks build, start/health settings, restart behavior and one `us-west2` replica. Project variables are unmanaged: the existing bearer stays in Railway. Public domains are left untouched, and the plan must show no domain or variable deletion.

The app remains a stateless deterministic HTTP service. This configuration adds no database, model call, background job, service or alert sender. The `railway` SDK is a pinned development dependency for configuration tooling; use Node 22 or 24 for that tooling. The recommendation server's runtime code and declared Node compatibility are unchanged.

## Source review and read-only plan

Use Railway CLI **5.71.0** with SDK **3.16.0**, or review a toolchain update deliberately. The installed older CLI `4.30.3` has no IaC commands. Run the native `railway` executable on PATH: SDK evaluation checks that executable's version.

```sh
npm ci
npm run check
railway whoami
railway link --project ddc9d9d6-98be-4854-93c3-94ed324e3279 \
  --environment 0b3a3e78-f9d0-454e-ba54-5eea5ac6a23a \
  --service d0b95799-b5c1-4400-8d62-b532da2d0af9
railway config plan --file .railway/railway.ts --environment production --json
```

Review the exact source commit and plan. Only updates to this existing service's build/start/health/restart settings are expected. Those values are currently supplied by `railway.json`; dashboard defaults alone do not describe the running deployment. No service creation, removal, credential edit, domain change, replica change or unrelated resource change is authorized by this migration scope. Replan after any source or environment change. Never use `--show-values`, `--decrypt-variables` or `--include-variables` for this review.

Merging the source does **not** apply IaC: Railway still reads `railway.json` until the explicit cutover. Keep that file in the repository during source review and cutover. There is no automatic config-apply workflow in this PR.

## Reviewed production cutover

Perform this only after the source/plan is reviewed, from a clean checkout of the approved commit. See the [runtime runbook](../deploy/RAILWAY_RUNTIME.md) for authenticated smoke and log correlation.

1. Record the current successful deployment/commit, config-file path, domain and passing health/auth/log checks. Run `railway config migrate status` and save the output with AB-36.
2. Run `railway config migrate cutover --service agent-brain`. CLI 5.71.0 saves the previous hosted config-file paths for `migrate undo`. This changes configuration ownership; it is distinct from the local-only `migrate --apply` command. Keep `railway.json` available for rollback.
3. Immediately generate a **fresh** pinned plan after cutover, since cutover can change the environment revision:

   ```sh
   railway config plan --file .railway/railway.ts --environment production \
     --json --out /tmp/agent-brain-reviewed.plan.json
   ```

4. Compare it with the reviewed scope above. Stop and undo cutover if it changes anything else. Apply that exact artifact, allowing the CLI to enforce its environment revision and source-tree checks:

   ```sh
   railway config apply --plan /tmp/agent-brain-reviewed.plan.json
   ```

5. Confirm the deployment succeeds, the hostname stays the same, `/health` and `/ready` pass with auth configured/bypass off, both authenticated API routes succeed, missing/wrong tokens return 401, and traces appear in that deployment's JSON logs. Inspect the effective build/start/health/restart/region settings. A successful config apply is not sufficient evidence by itself.
6. Replan: no outstanding changes should remain. Record `railway config migrate status`, deployment/commit, sanitized plan, trace evidence and rollback instructions on AB-36 before closing it. AB-37 separately tracks actual monitoring and delivered alert/recovery proof.

## Rollback

If the fresh plan is unexpected, apply fails, or post-change checks fail:

```sh
railway config migrate undo
```

Confirm the saved `/railway.json` mapping is restored. If an unhealthy deployment was created, restore the recorded last healthy deployment through Railway's deployment rollback. Repeat the health/auth/log checks and record the outcome. Undo restores legacy config-file paths; it does not claim to undo every unrelated service setting or a credential change.

Transient plan/snapshot files are ignored under `.railway/`; only this README and `railway.ts` are tracked. Do not commit keys, decrypted variables or CLI authentication state. Delete the legacy source file in a later cleanup only after the recorded cutover succeeds.
