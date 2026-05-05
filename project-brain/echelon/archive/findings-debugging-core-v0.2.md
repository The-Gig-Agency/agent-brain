# echelon — Debugging Core v0.2 Findings

## Status

The anti-bias v0.2 pass is stronger than v0.1.

Reason:

- the suite now includes harder cases with misleading early evidence
- `fixed_heuristic` can lose on those cases
- the router still has to stay stable on cost, retries, and transitions

## Result

Current `debugging-core-v0.2` summary:

- go/no-go: `true`
- routed success rate: `1.0`
- fixed heuristic success rate: `0.625`
- routed average cost: `9.25`
- naive retry average cost: `10.875`
- routed average repeated failed paths: `0`
- naive retry average repeated failed paths: `2.625`
- always compound average repeated failed paths: `0.625`
- routed average hysteresis count: `0`
- routed average dead-end persistence: `0`

## What changed from v0.1

v0.1 proved a narrow wedge against weaker baselines.

v0.2 added:

- misleading log clues
- false-positive inspect paths
- stronger signal thresholds before successful fixes
- diagnostics comparing routed policy against `fixed_heuristic`

That made the suite more adversarial to the router and less likely to reward benchmark-flattering behavior by default.

## Why this is encouraging

- routed policy still beats `naive_retry`
- routed policy still beats `always_compound`
- routed policy now also beats `fixed_heuristic` on the focused suite
- the router keeps hysteresis at `0`
- dead-end persistence remains at `0`

This is the first sharper sign that the wedge may be real, not just decorative.

## Why this is not enough yet

This is still synthetic evidence.

It does **not** yet prove:

- general debugging superiority
- transfer to real-world incidents
- robustness outside the current suite design

Possible false-positive risks still remain:

- case-set bias
- implicit tuning toward the current synthetic worlds
- transition logic that wins here but does not transfer

## Best interpretation

The right claim is:

- Echelon now has a focused synthetic result suggesting adaptive routing can beat a stronger simple heuristic on debugging-core tasks

The wrong claim would be:

- Echelon has solved debugging search generally

## Next best move

Before widening scope:

- add holdout-style v0.2 cases designed by the anti-bias checklist
- inspect routed-vs-fixed diagnostics per case
- add a tiny historical replay set if possible

If the result holds after that, confidence increases materially.
