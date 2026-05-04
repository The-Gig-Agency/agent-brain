# Echelon — Real Replays v3 Mining

## Purpose

This pass does **not** add more benchmark volume yet.

It identifies stronger real bug-fix candidates for the next replay-expansion wave, specifically optimized for:

- misleading real incidents
- flaky or unstable behavior
- conflicting telemetry
- partial fixes
- cross-system failures
- delayed root causes

The target question stays narrow:

> Can adaptive commitment control beat fixed narrowing under degraded evidence?

## Best Next Candidates

### Priority 1

1. `ciq-bf61b23` — Fixed auto-fix & re-fetch logic
   - Strongest degraded-evidence candidate in the current mining pass.
   - Auto-fix plus re-fetch implies that apparent success may not reveal final truth immediately.

2. `ciq-6adf83e` — Fix campaign summary report flow
   - Strong cross-system case with nested/flat JSON handling, partner resolution, and fallback behavior.

3. `acp-9b20f69` — approve uses ACP_BASE_URL and fails closed on ambiguous 200
   - Excellent conflicting-telemetry case.
   - A nominal success code is not enough; the system must interpret ambiguity conservatively.

4. `acp-2f10f7c` — fail-closed audit mapping + validate env
   - Good for public-facade-versus-internal-state mismatch and env-driven ambiguity.

5. `cg-1036` — Fixed not working roll over allowances
   - High partial-fix and stale-state risk across tasks, helpers, and publisher logic.

### Priority 2

6. `cg-992` — Fixed not creating limits while csv upload
   - Strong delayed-root-cause case where one ingestion path skips downstream setup.

7. `cg-981` — Fixed filtered orders
   - Useful UI plus backend mixed-surface case with several tempting false-positive inspection paths.

8. `ciq-7eefd8d` — Fix publisher lookup by Id
   - Strong identifier-semantics mismatch case.

9. `acp-e7eebcc` — Fix gateway 401: use correct api-keys-lookup path
   - Great misleading-auth-symptom case.

10. `acp-faf5153` — Fix duplicate `/functions/v1` in registry endpoint URLs
    - Strong delayed root cause and path-composition case.

## Secondary Candidates

- `cg-1013` — resets when `refresh_influencers`
- `cg-995` — 504 error
- `ciq-a072b65` — messaging payload / raw response mismatch
- `acp-f79bf6c` — hosted login failures should return blocked result

## Recommendation

The best next replay-expansion wave should **not** pull all of these in at once.

A stronger next step would be a deliberate five-case degraded-evidence pack:

1. `ciq-bf61b23`
2. `ciq-6adf83e`
3. `acp-9b20f69`
4. `acp-2f10f7c`
5. `cg-1036`

Why this five:

- two CIQ cases for flaky and cross-boundary handler ambiguity
- two ACP cases for conflicting telemetry and fail-closed control logic
- one CreatorGift case for stale-state propagation

That gives good terrain diversity while staying inside the same debugging domain.

## Files

Machine-readable candidate list:

- `fixtures/echelon/real-replays-v3-mining-candidates.json`
