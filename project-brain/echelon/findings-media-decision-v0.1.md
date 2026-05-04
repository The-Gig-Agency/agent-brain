# Echelon Findings — Media Decision Eval v0.1

## Summary

`v0.1` is the first structured evaluation pass for the media decision router.

It validates whether the new media contract can produce:

- one actionable recommendation
- confidence and rationale
- operator-ready keep/cut/test-next guidance

across six core action classes: `explore`, `prune`, `hold`, `scale`, `diagnose`, and `reallocate` (with `test_next` included as a recommendation mode).

## Result

- `overall_pass: false`
- case count: `6`
- exact action match rate: `0.667`
- acceptable action match rate: `0.833`
- confidence band match rate: `0.5`
- rationale quality pass rate: `0.667`

## Cases

- `media-01-brand-healthy-capped` (`explore` expected, `scale` predicted)
- `media-02-clear-loser-branch` (`prune` expected, `prune` predicted)
- `media-03-tracking-ambiguity` (`diagnose` expected, `diagnose` predicted)
- `media-04-healthy-winner` (`scale` expected, `scale` predicted)
- `media-05-fragmented-meta-structure` (`reallocate` expected, `prune` predicted)
- `media-06-learning-pocket` (`test_next` expected, `test_next` predicted)

## Interpretation

The contract and evaluation scaffolding are working and measurable, but policy quality is not yet stable enough for automation claims.

Current miss pattern is concentrated in:

- expansion-versus-scale boundary (`media-01`)
- reallocate-versus-prune boundary (`media-05`)
- confidence calibration consistency across cases

## What v0.1 Proves

- the media decision schema is executable end-to-end
- the router returns a single action plus confidence and rationale
- operator report structure can map output to concrete keep/cut/test-next guidance

## What v0.1 Does Not Prove

- production-safe autonomous media optimization
- confidence calibration robustness across larger account diversity
- stable action selection across all edge boundaries

## Best Next Move

1. add 12-20 more media cases with heavier boundary pressure (`explore` vs `scale`, `prune` vs `reallocate`, `diagnose` vs `hold`)
2. tighten action-level heuristics in `media-decision.ts` for capped-volume and fragmented-structure patterns
3. add confidence calibration checks by action family, not only global band match
