# Echelon Findings — Real Replays v0.6c Tight

## Summary

`v0.6c-tight` reruns the broader replay-expansion set under a stricter router-visible layer.

The goal is narrower than `v0.6c`:

> does the broader replay result survive after reducing repo identity and file-path leakage?

Current answer: **yes**.

## Result

- `overall_pass: true`
- routed hidden-regime match rate: `1.0`
- fixed hidden-regime match rate: `0.4`
- score-threshold hidden-regime match rate: `0.6`
- routed beats fixed on `3/5` cases
- routed ties or beats score-threshold on `5/5` cases

## What Tightened

Compared with `v0.6c`, the new visible layer:

- anonymizes repo identity
- removes concrete local repo paths
- replaces file paths with terrain-oriented investigation surfaces
- preserves only the minimum topology needed for search-policy evaluation
- uses ambiguity augmentation deliberately on the deceptive cases

## Interpretation

This is a better result than the base `v0.6c` pass for one reason:

> the routing signal survived with less visible leakage and became more discriminative against the fixed heuristic.

The most important cases remain:

- `cg-937`
- `cg-936`
- `acp-8d0c011`

Those are the cases where the routed policy now clearly resists premature local narrowing.

## What v0.6c-tight Proves

- the broader replay-expansion set still separates after a meaningful visible-layer tightening pass
- hidden-dependency and propagation terrain remain real discriminators
- the current replay framework can preserve signal without leaning as heavily on repo-specific naming or raw file clues

## What v0.6c-tight Does Not Prove

- broad real-world generalization
- full execution-grounded patching advantage
- robustness against much stronger compact baselines
- parity with messy, naturalistic incident traces

## Best Next Move

The next step should be:

- keep this five-case set
- tighten toward issue-text, logs, and repro-note framing
- avoid adding more volume until this stricter visible layer is stable

In short:

> keep improving ambiguity quality before expanding the dataset again
