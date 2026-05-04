# Echelon — Real Replays V1 Findings

## Status

The first real replay pass is useful, but not yet decisive.

This pass proves:

- the real replay dataset loads cleanly
- the router-visible versus evaluator-only split works
- Echelon can now run a replay-oriented report over real merged bug-fix cases

It does **not** yet prove that routed policy beats compact baselines on those real cases.

## Result

Current `real-replays-v1` summary:

- overall pass: `false`
- case count: `5`
- routed hidden-regime match rate: `1`
- fixed hidden-regime match rate: `1`
- score-threshold hidden-regime match rate: `1`
- routed beats fixed case count: `0`
- routed ties or beats score-threshold case count: `5`

## What this means

This first replay run is a substrate and sanity-check result, not a wedge-proof result.

Why:

- the real cases are real and valuable
- the blindness boundary is preserved structurally
- but the current visible fixtures are still somewhat truth-adjacent
- and the current replay heuristics are not yet differentiating routed policy from compact baselines

In other words:

- the replay layer is real
- the current replay score is not yet a strong claim

## Why the result ties

The current visible fixture still includes changed-file-derived entry points.

That means:

- compact baselines and the routed policy often see enough structure to choose the same regime
- especially for cases that naturally compress into `prune`

That is not a failure of the dataset build.
It is an honest signal about the current replay-eval strength.

## Best interpretation

The right claim is:

- Echelon now has a functioning real replay evaluation substrate, but this first replay pass is not yet discriminative enough to prove routed advantage

The wrong claim would be:

- Echelon has now beaten baselines on real-world debugging data

## Best next move

To make `v0.6` more serious, the next pass should:

- reduce changed-file leakage from the visible fixture
- replace file-derived hints with issue text, logs, repro notes, and weaker symptom context
- add replay metrics beyond regime match, such as path-priority quality and search-breadth appropriateness
- rerun the same five cases under the tighter visible contract

That is the cleanest route from “real replay substrate” to “real replay evidence.”
