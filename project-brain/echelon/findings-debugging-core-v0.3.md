# echelon — Debugging Core v0.3 Findings

## Status

The first adversarial pass is encouraging.

v0.3 did not widen scope.
It tried to break the current synthetic debugging-core result.

## Result

Current `debugging-core-v0.3` summary:

- overall pass: `true`
- label permutation: `pass`
- regime ablation: `pass`
- misleading-evidence reversal: `pass`

### Key numbers

- label permutation routed success delta: `0`
- label permutation routed cost delta: `0`
- regime ablation score delta: `1.333`
- misleading-evidence reversal routed average failed fixes before root signal: `0`
- misleading-evidence reversal fixed average failed fixes before root signal: `1`
- misleading-evidence reversal routed average cost before root signal: `5.667`
- misleading-evidence reversal fixed average cost before root signal: `8`

## What this means

The current debugging-core win survived three important falsification attempts:

- renaming and reordering the synthetic families did not collapse the result
- disabling runtime transitions made the routed policy worse
- on reversal cases, routed policy reached the decisive signal with fewer wasted wrong-fix attempts than `fixed_heuristic`

That is a better sign than v0.2 alone because it tests whether the win is:

- surface-pattern leakage
- decorative transitions
- synthetic cases that are too friendly to our preferred story

## What this still does not prove

This is still synthetic evidence.

It does **not** yet prove:

- general debugging superiority
- robustness on unseen generated cases
- robustness against stronger non-toy baselines
- transfer to real incident or agent replay traces

## Best interpretation

The right claim is:

- the focused debugging-core wedge now survives a first adversarial synthetic pass

The wrong claim would be:

- adaptive routing is now broadly validated for debugging

## Best next move

The next highest-value pass is:

- generated holdout cases from unseen seeds
- stronger baselines beyond `fixed_heuristic`
- small real-world replay traces if we can source them

That is the right path before any broader product claims.
