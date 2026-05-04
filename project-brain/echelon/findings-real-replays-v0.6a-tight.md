# Echelon — Real Replays v0.6a Tight Findings

## Status

The tighter replay pass is the first real-case evaluation layer that is meaningfully discriminative.

Unlike the initial replay run, this pass does separate:

- routed policy
- fixed heuristic
- score-threshold baseline

That makes it a much more useful signal.

## Result

Current `real-replays-v0.6a-tight` summary:

- overall pass: `true`
- case count: `5`
- routed hidden-regime match rate: `1`
- fixed hidden-regime match rate: `0.4`
- score-threshold hidden-regime match rate: `0.4`
- routed beats fixed case count: `3`
- routed ties or beats score-threshold case count: `5`

## What changed from v0.6

The earlier replay pass used router-visible fixtures that were too truth-adjacent.

That created ties.

`v0.6a` tightens the replay setup by:

- removing file-level changed-path clues from the visible fixture
- replacing them with weaker surfaces and issue-style descriptions
- adding deliberate ambiguity:
  - misleading telemetry
  - delayed decisive signal
  - false-positive fix family
  - conflicting evidence

This is closer to the real terrain where adaptive commitment control could matter.

## Why this matters

This is the first replay-oriented result in the repo where the router’s behavior is not simply tied with compact heuristics.

The most important successful differentiators are:

- `cg-161`
- `cg-171`
- `cg-173`

Those cases now reward exploration under deceptive or delayed evidence instead of collapsing into obvious pruning.

## What this still does not prove

This is still not a raw naturalistic replay benchmark.

It is:

- real-case grounded
- evaluator-backed
- deliberately augmented

So the right interpretation is not:

- “Echelon has beaten baselines on raw production bug traces”

The right interpretation is:

- “Echelon now shows a meaningful replay-based advantage when real cases are tightened to better reflect noisy, delayed, and deceptive evidence.”

## Best interpretation

`v0.6a` is the first replay pass that really supports the project’s narrow scientific question:

- can adaptive commitment control outperform fixed search policies when evidence is noisy, delayed, contradictory, or deceptive?

That is a much stronger and more respectable claim than:

- “the router sounds smart on real tickets”

## Best next move

The next honest step is:

- reduce remaining repo- and org-specific fingerprinting
- introduce terrain diversity across bug classes
- add a small raw-incident variant alongside the augmented one
- eventually compare path-priority quality, not just hidden regime match

That is the clean path from “discriminative replay benchmark” to “credible operational evidence.”
