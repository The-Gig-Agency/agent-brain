# Echelon Findings — Real Replays v0.6b Diverse

## Summary

`v0.6b` asks a narrower question than `v0.6a`:

> Does the replay-routing signal survive a first pass at reducing repository and organization fingerprinting?

The answer is currently **yes**.

The visible replay layer was tightened by:

- anonymizing repo identity
- removing local repo paths
- shifting case descriptions toward terrain-shaped signals
- preserving ambiguity augmentation instead of restoring truth-adjacent file hints

This makes the benchmark less dependent on organization-specific naming, repository structure, and team-writing style.

## Result

- `overall_pass: true`
- routed hidden-regime match rate: `1.0`
- fixed hidden-regime match rate: `0.4`
- score-threshold hidden-regime match rate: `0.4`
- routed beats fixed on `3/5` cases
- routed ties or beats score-threshold on `5/5` cases

## Interpretation

This is the strongest replay result so far on one specific question:

> the routed advantage does not appear to be solely explained by repository fingerprint learning.

That is meaningful progress because the visible layer now exposes less:

- repo identity
- path topology
- org-specific naming
- direct local-environment context

At the same time, this is **not** a claim that the system is robust on raw incident traces.

The benchmark is still:

- small
- evaluator-shaped
- ambiguity-augmented
- regime-scored rather than full autonomous patch execution

## What v0.6b Proves

- the replay substrate remains discriminative after a first anonymization pass
- routed policy still separates from compact baselines on the same five real cases
- terrain-shaped replay descriptions can preserve useful routing signal without leaning as heavily on repo-specific cues

## What v0.6b Does Not Prove

- broad generalization across teams or repos
- performance on raw naturalistic debugging traces
- full execution-grounded improvement on real bug fixing
- immunity to all organizational prior leakage

## Next Question

The next serious replay question is:

> Can adaptive commitment control still outperform compact baselines when replay evidence is noisy, delayed, contradictory, or deceptive without relying on repo-specific fingerprints?

That points toward:

- more terrain diversity
- anti-fingerprint discipline
- stronger misleading replay augmentation
- eventually, messier replay traces with weaker evaluator shaping
