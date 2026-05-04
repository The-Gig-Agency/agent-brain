# Echelon Findings — Real Replays v0.6f

## Summary

`v0.6f` is the first replay pack built to tighten two weaknesses at once:

- the mixed pack was still shaped asymmetrically toward explore cases
- the visible layer still carried too many direct terrain hints

It keeps the debugging domain narrow and the regime set small, but makes the benchmark harder by:

- adding noisy prune cases
- adding one weaker-signaled explore case
- weakening direct terrain wording in the router-visible fixture

## Result

- `overall_pass: true`
- routed hidden-regime match rate: `1.0`
- fixed hidden-regime match rate: `0.5`
- score-threshold hidden-regime match rate: `0.5`
- routed beats fixed on `4/8` cases
- routed ties or beats score-threshold on `8/8` cases

## Pack Shape

Explore-deserving cases:

- `ciq-bf61b23`
- `acp-9b20f69`
- `cg-1036`
- `ciq-6adf83e`

Prune-deserving but noisy cases:

- `cg-987`
- `cg-1013`
- `ciq-95356ae`
- `acp-e7eebcc`

## Why This Matters

This is a stronger result than `v0.6e`, even though the win shape is less flashy.

`v0.6f` asks a harder question:

> can the router still separate explore from prune when the prune side also contains noise and the visible layer stops naming the terrain so directly?

Current answer: **yes**.

The important part is not just that the explore cases survived.

It is that the new noisy prune cases also stayed narrow under the same scoring logic.

## What v0.6f Proves

- the router still separates real explore-deserving from prune-deserving cases after the visible layer becomes more issue-like
- symmetric shaping pressure does not immediately collapse the regime boundary
- the weaker-signaled explore case (`ciq-6adf83e`) still routes correctly
- the noisy prune cases no longer get over-broadened just because they mention refresh, auth, or stale-state surfaces

## What v0.6f Still Does Not Prove

- full execution-grounded patching advantage
- robustness to strategy reversal or mid-search environment shifts
- compound-deserving replay behavior
- clean-room naturalistic generalization without evaluator curation

## Interpretation

`v0.6f` is the first replay pass that feels meaningfully closer to:

> adaptive commitment control under degraded and misleading evidence

instead of:

> terrain-labeled replay routing

That does not make it solved.

But it does mean the benchmark is starting to ask a cleaner question without losing discriminative power.

## Best Next Move

The next pass should probably not add more cases immediately.

It should add:

1. strategy-reversal cases
2. confidence-rise-then-collapse cases
3. environment-shift cases

That would move the replay work from:

> picking the right initial mode

toward:

> knowing when the initially reasonable mode stopped being right
