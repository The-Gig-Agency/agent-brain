# Echelon Findings — Real Replays v0.8

## Summary

`v0.8` is the first replay pack built from a broader cross-repo mining pass across TGA and ACEDGE incident history.

It is intentionally different from `v0.7b`:

- less single-family concentration
- more mixed operational failure modes
- balanced explore-versus-prune judgment on real bug-fix surfaces

This pass stays in the debugging domain and the same small regime set, but it adds heterogeneity across:

- partner API contract drift
- auth and migration state divergence
- function plus schema coupled failures
- RLS policy and recursion incidents
- adapter contract mismatches
- request invocation contract failures
- navigation-state conflicts

## Result

- `overall_pass: true`
- routed hidden-regime match rate: `1.0`
- fixed hidden-regime match rate: `0.5`
- score-threshold hidden-regime match rate: `0.5`
- routed beats fixed on `5/10` cases
- routed ties or beats score-threshold on `10/10` cases

## Pack Shape

Explore-deserving cases:

- `v08-og-404-fallback`
- `v08-auth-legacy-migration`
- `v08-reset-password-diagnostics`
- `v08-edge-send-failure`
- `v08-admin-redirect-loop`

Prune-deserving cases:

- `v08-postgrest-numeric-coercion`
- `v08-brand-profiles-rls`
- `v08-rls-recursion`
- `v08-manage-meta-actions`
- `v08-token-header-contract`

## Why This Matters

This pass is less about one incident family and more about whether the same routing logic survives domain-near operational variety.

The key signal is not only that routed policy wins on the explore half.

It is that routed policy also stays disciplined on compact prune incidents, where over-broadening would be easy to justify from noisy symptoms.

## What v0.8 Proves

- the router still separates explore versus prune on a broader real-case mix
- widened incident diversity does not collapse regime-boundary behavior
- compact baselines remain strong on prune cases while routed policy recovers the explore cases
- hidden-regime alignment remains stable (`10/10`) after adding new case families

## What v0.8 Still Does Not Prove

- dynamic transition quality under mid-search environment shifts
- confidence-collapse behavior after an initially plausible but wrong local fix
- compound-deserving replay behavior in real operational cases
- execution-grounded patch quality (this remains routing-only evaluation)
- clean-room naturalistic generalization without evaluator curation

## Interpretation

`v0.8` is the first replay result that starts to look like:

> route-policy generalization across operationally different debugging incidents

instead of:

> repeated wins on one shaped incident family

This is still not enough for broad production claims, but it is a stronger substrate for next-phase tests.

## Best Next Move

The next pass should emphasize transition-control realism rather than only larger static case counts:

1. add confidence-rise-then-collapse cases
2. add explicit environment-shift and drift-recovery cases
3. add partial-resolution cases where containment is acceptable but full root-cause certainty is not
4. measure overcommitment regret and drift recovery cost in addition to regime match

That would move replay evaluation from:

> picking the right initial mode

toward:

> knowing when the initially reasonable mode stopped being right
