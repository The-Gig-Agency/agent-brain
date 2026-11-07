# AB-36 configuration migration evidence — November 7, 2026

**Status:** reviewed settings applied and live checks passed; legacy-file cleanup
requires its merged deployment verification before AB-36 is closed.

## Scope and execution

- Project/environment: gallant-bravery / production
  (`ddc9d9d6-98be-4854-93c3-94ed324e3279` / `0b3a3e78-f9d0-454e-ba54-5eea5ac6a23a`).
- Existing service: agent-brain / `d0b95799-b5c1-4400-8d62-b532da2d0af9`.
- Merged source: `99f1dac4ca96de7f8a3602dfafc027fd73cb7d25`; reviewed config tree
  `38fb7460fd4f439cea6aa28e959be286287a9130`.
- CLI 5.71.0 / SDK 3.16.0. Two safe setting groups; only one existing service updated.
  No resource creation/deletion, credential, domain, source or replica changes.
- Apply receipt: `iac-change-set/0b3a3e78-f9d0-454e-ba54-5eea5ac6a23a/14a7df39f1721e96bb8f129a01b6b52b`, status applied, diagnostics empty.
- Ownership map: only `service.agent-brain` belongs to partial `agent-brain`.
  Monitoring service/volume remain outside that partial. Variables remain unmanaged.
- Deployment before: `118742c9-cc13-462d-8e5d-9c9c34a442e2`; after:
  `5d5d615e-b91d-453c-9d38-832d401944b3`, SUCCESS, same application commit.

The service's explicit config-file path was null, so CLI migration status reported
no Config as Code services. The deployment nevertheless auto-detected root
`railway.json`. No path-clearing command or undo snapshot was needed. Its deletion
is necessary to remove that second settings source on the next GitHub deployment.

## Verified behavior

Before and after, all eight synthetic requests passed:

| Check | Result |
| --- | --- |
| /health and /ready | 200 |
| Auth configured / bypass | true / false |
| Matching bearer, both API routes | 200, API 1.0.0 and recommendation |
| Missing bearer, both API routes | 401 |
| Wrong bearer, both API routes | 401 |

The same existing credential was injected in memory; no value was printed or stored.
No model call, user data, application database change or synthetic outage was involved.

Post-change service API verified NIXPACKS, build `npm run build`, start
`npm run start:router-recommend:v1`, health `/health`, timeout 300, ON_FAILURE/3,
sleep false and one us-west2 replica. The monitoring worker kept deployment
`4802780a-d8cd-4cf4-8a84-3364d36cfe0b` and its volume unchanged.

## Trace correlation

The provider-side filter used quoted exact `@trace_id` values for our eight requests.
An unfiltered production-log read was rejected and never executed. All eight pre-
and post-change records were matched from their exact deployments; only request
metadata was retained.

- Pre prefix: `ab36-pre-130fbbee-d4e2-4bee-9542-88cec526be20`.
- Post prefix: `ab36-post-0d3fc1ad-f08f-4811-9083-e3110cdd96bd`.
- Post structured request: `c2a51ae4-9479-4177-bde0-1ebb54e711e8`, status 200, 2ms.
- Post intake request: `bfe85550-71dc-444e-90a5-fe82990235c3`, status 200, 2ms.
- Sanitized local artifacts: `/tmp/ab36-live-20261107/`; no credentials/raw user logs.

## Default normalization and final gate

The stored graph drops default ON_FAILURE and sleep=false even while the effective
service API returns them. Keeping explicit declarations produced repeated safe
differences after a successful apply. The cleanup omits these redundant declarations,
keeps max retries 3 and documents verification of both effective defaults. The fresh
normalized read-only plan showed zero differences and diagnostics; no-effect updates
were not reapplied.

After merging cleanup, verify the new deployment no longer loads a legacy file,
repeat the eight requests/log correlation and zero-drift check, then close AB-36.
Rollback target is the recorded healthy deployment/source. No rollback was induced.
