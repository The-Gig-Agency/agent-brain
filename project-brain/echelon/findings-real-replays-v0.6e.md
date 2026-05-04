# Echelon Findings — Real Replays v0.6e

## Summary

`v0.6e` is the first mixed real-world replay pack.

It is intentionally different from `v0.6d`.

Instead of asking:

> can routed exploration beat fixed narrowing on degraded-evidence cases?

it asks:

> can the router correctly separate real explore-deserving cases from real prune-deserving cases without changing the routing logic?

Current answer: **yes**.

## Result

- `overall_pass: true`
- routed hidden-regime match rate: `1.0`
- fixed hidden-regime match rate: `0.5`
- score-threshold hidden-regime match rate: `0.5`
- routed beats fixed on `3/6` cases
- routed ties or beats score-threshold on `6/6` cases

## Pack Shape

Explore-deserving cases:

- `ciq-bf61b23`
- `acp-9b20f69`
- `cg-1036`

Prune-deserving cases:

- `cg-987`
- `ciq-95356ae`
- `hfc-2`

## Why This Matters

This is the first replay result that shows the router is not merely winning because the pack is one-sided.

It succeeds on both sides of the boundary:

- it explores when the evidence is degraded, delayed, or deceptively optimistic
- it prunes when the problem is actually narrow, contract-like, or compactly local

That is a more important signal than the stronger-looking `v0.6d` numbers.

## Interpretation

The fixed and score-threshold baselines still do exactly what they should:

- they handle the prune cases correctly
- they collapse the explore-deserving cases into local narrowing

The router now distinguishes those two terrains correctly across the full pack.

That is the first credible sign that the system is learning:

> when to explore versus when to narrow

not just:

> how to win a wedge benchmark

## What v0.6e Proves

- the router can separate explore and prune on a real mixed replay pack
- the degraded-evidence wedge does not appear to be a pure overfit to exploration
- compact baselines remain competitive on narrow cases, which is healthy for the benchmark

## What v0.6e Does Not Prove

- broad calibration across all debugging terrains
- anything yet about compound or coordination regimes
- full execution-grounded patching advantage
- robustness to larger and noisier mixed packs

## Best Next Move

The best next step is probably not more ontology and not more model complexity.

It is either:

1. build `v0.6f` with a slightly larger mixed pack
2. introduce one or two real `compound`-deserving cases
3. keep tightening the visible layer so these results depend less on shaped replay context

The important thing is that `v0.6e` should remain the reference pack for:

> is the router actually learning a regime boundary?
