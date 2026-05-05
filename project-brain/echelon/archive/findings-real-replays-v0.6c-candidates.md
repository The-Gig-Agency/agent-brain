# Echelon Findings — Real Replays v0.6c Candidates

## Summary

`v0.6c` is the first broader replay-expansion pass built from the next mined candidate set rather than the original five real replay cases.

Its purpose is simple:

> does the replay-routing signal survive a broader real-case mix containing more hidden-dependency, propagation, and contract-drift bugs?

Current answer: **yes, cautiously**.

## Result

- `overall_pass: true`
- routed hidden-regime match rate: `1.0`
- fixed hidden-regime match rate: `0.6`
- score-threshold hidden-regime match rate: `0.6`
- routed beats fixed on `2/5` cases
- routed ties or beats score-threshold on `5/5` cases

## What Changed

This pass introduced five new grounded cases:

- `cg-937`
- `cg-987`
- `cg-936`
- `ciq-95356ae`
- `acp-8d0c011`

The most important routing adjustment was not arbitrary retuning. It was a more explicit interpretation of hidden-dependency terrain:

- post-create delayed failures
- nested response-format mismatches across service boundaries
- deceptive auth symptoms that are really integration-shape bugs

That change matters because the first untuned `v0.6c` run tied compact baselines and under-read those cases as simple pruning problems.

## Interpretation

This is a meaningful step because the routed policy now separates on the two most deceptive cases in the set:

- `cg-937`
- `acp-8d0c011`

Those are exactly the kinds of cases where the project thesis should matter:

- symptom looks narrow
- root cause is one layer away
- naive local narrowing can converge too early

At the same time, the pass is still modest:

- three of five cases tie the compact baselines
- the visible layer is still partly changed-file-shaped
- the suite is broader than `v0.6a` and `v0.6b`, but still small

## What v0.6c Proves

- the routed policy can retain separation on a broader real-case set
- hidden-dependency cases are a real discriminator, not just a synthetic artifact
- the current replay engine can use mined private-repo history as structured benchmark input

## What v0.6c Does Not Prove

- broad generalization across debugging domains
- full execution-grounded win on real patching
- robustness against stronger compact baselines on all replay classes
- immunity to truth-adjacent leakage in the visible fixture

## Best Next Move

The next step should not be “add more tickets.”

It should be:

- tighten the visible layer for these `v0.6c` cases
- reduce changed-file leakage
- preserve terrain diversity
- rerun as a stricter replay pass before further expansion

In other words:

> improve ambiguity quality before increasing replay volume
