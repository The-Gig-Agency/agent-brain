# echelon — Debugging V1 Findings

## Status

First runnable MVP benchmark exists.

This is not yet a decisive product proof.
It is a useful first checkpoint.

## What was built

- blinded-ish debugging case contract with separated `input_context` and `hidden_truth`
- synthetic debugging-v1 suite plus holdout cases
- executable baselines
- routed-policy runner
- trace schema
- local benchmark CLI

## Current result

Current train summary:

- routed success rate: `1.0`
- strongest simple baseline by current scoring: `always_prune`
- strongest baseline success rate: `1.0`
- routed currently does **not** beat the strongest simple baseline

Current holdout summary:

- routed success rate: `1.0`
- strongest simple baseline by current scoring: `always_prune`
- strongest baseline success rate: `1.0`
- routed currently does **not** beat the strongest simple baseline

## What is encouraging

- routed policy clearly beats `naive_retry`
- routed policy clearly beats `always_compound`
- repeated failed-path counts are visible and measurable
- the benchmark now punishes premature fixing and dead-end retries
- the runtime produces traces that are useful for tuning

## What is not good enough yet

The router is still tying stronger simple heuristics like:

- `always_prune`
- `fixed_heuristic`

That means the current system is not yet a strong enough proof of:

- measurable search-policy advantage

It is a functioning MVP engine, but not yet a clear wedge win.

## Likely next tuning moves

- make routed `explore -> prune -> compound` transitions more efficient than the static heuristics
- make some cases punish early pruning more sharply
- add more realistic ambiguous evidence and drift conditions
- improve pass/fail scoring around cost-adjusted success
- add historical replay cases after the synthetic suite is stable

## Decision

Do not declare victory yet.

The current result supports:

- the architecture path
- the debugging-first MVP direction
- continued investment in the eval engine

It does not yet support:

- a strong claim that routed policy has beaten the best simple baseline on the wedge
