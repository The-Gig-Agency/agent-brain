# Echelon Findings — Media Decision Eval v0.1

## Summary

`v0.1` is the first structured evaluation pass for the media decision router.

It validates whether the new media contract can produce:

- one actionable recommendation
- confidence and rationale
- operator-ready keep/cut/test-next guidance

across six core action classes: `explore`, `prune`, `hold`, `scale`, `diagnose`, and `reallocate` (with `test_next` included as a recommendation mode).

After QA-tuning of cap-aware brand expansion logic, cleanup account reallocation behavior, confidence calibration, and rationale generation, the rerun is now fully green.

## Result

- `overall_pass: true`
- case count: `6`
- exact action match rate: `1.0`
- acceptable action match rate: `1.0`
- confidence band match rate: `1.0`
- rationale quality pass rate: `1.0`

## Cases

- `media-01-brand-healthy-capped` (`explore` expected, `explore` predicted)
- `media-02-clear-loser-branch` (`prune` expected, `prune` predicted)
- `media-03-tracking-ambiguity` (`diagnose` expected, `diagnose` predicted)
- `media-04-healthy-winner` (`scale` expected, `scale` predicted)
- `media-05-fragmented-meta-structure` (`reallocate` expected, `reallocate` predicted)
- `media-06-learning-pocket` (`test_next` expected, `test_next` predicted)

## Interpretation

The contract and evaluation scaffolding are now working and measurable with a complete pass on the initial pack.

The previous miss pattern (expansion-versus-scale, cleanup reallocate-versus-prune, and confidence calibration drift) was resolved in this pass.

## What v0.1 Proves

- the media decision schema is executable end-to-end
- the router returns a single action plus confidence and rationale
- operator report structure can map output to concrete keep/cut/test-next guidance

## What v0.1 Does Not Prove

- production-safe autonomous media optimization at larger account scale
- confidence calibration robustness across larger account diversity
- stable action selection across all edge boundaries

## Best Next Move

1. add 12-20 more media cases with heavier boundary pressure (`explore` vs `scale`, `prune` vs `reallocate`, `diagnose` vs `hold`)
2. add hold-focused and multi-channel reallocation edge cases so this does not overfit a 6-case set
3. add out-of-sample account packs for calibration robustness before automation rollout
