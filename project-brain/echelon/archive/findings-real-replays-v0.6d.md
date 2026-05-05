# Echelon Findings — Real Replays v0.6d

## Summary

`v0.6d` is the first replay pass built explicitly as a degraded-evidence pack.

The question is narrower than earlier replay passes:

> Can routed policy beat fixed narrowing on real debugging cases where the evidence is misleading, conflicting, delayed, or only partially corrective?

Current answer: **yes, strongly within this narrow pack**.

## Result

- `overall_pass: true`
- routed hidden-regime match rate: `1.0`
- fixed hidden-regime match rate: `0.0`
- score-threshold hidden-regime match rate: `0.0`
- routed beats fixed on `5/5` cases
- routed ties or beats score-threshold on `5/5` cases

## What This Pack Is

The `v0.6d` set is intentionally not balanced across regime types.

It is a targeted five-case wedge made of:

- misleading progress after auto-fix
- nested or flat response ambiguity
- ambiguous 200 success signals
- public facade output that can look plausible while being unsafe
- stale-state rollover behavior after later updates

All five cases are designed to stress one specific failure mode:

> premature local narrowing under degraded evidence

## Interpretation

This is a strong result for the wedge itself:

- routed policy correctly chooses `explore` for all five degraded-evidence cases
- compact baselines collapse into `prune`
- the separation is complete on this pack

That is meaningful because the pack is grounded in real bug-fix history, not synthetic toy stories.

## What v0.6d Proves

- the router can cleanly separate from fixed narrowing on a deliberately degraded-evidence real-case pack
- hidden-dependency, conflicting-telemetry, and delayed-root-cause bugs are strong discriminators
- the project now has a real wedge benchmark for “adaptive commitment control under degraded evidence”

## What v0.6d Does Not Prove

- that the router is better across all debugging terrains
- that the current replay evaluator is broadly calibrated
- that the system beats stronger compact baselines on balanced mixed-regime packs
- that this result would hold unchanged on raw incident traces

## Most Important Caveat

This pack is intentionally one-sided.

That is not a flaw for the current milestone, but it means the next step should be:

- keep `v0.6d` as the degraded-evidence wedge
- add a later mixed pack where some cases should still resolve to `prune`
- avoid claiming general superiority from this result alone

## Best Next Move

Use `v0.6d` as the controlled wedge benchmark for:

- misleading incidents
- conflicting telemetry
- partial fixes
- delayed root causes

Then build a follow-on pack that mixes:

- `explore`-deserving degraded cases
- genuinely `prune`-deserving narrow cases

That will test whether the router is learning the right boundary rather than just preferring exploration.
