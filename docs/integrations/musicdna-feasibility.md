# AB-52 first deliverable: pinned offline policy preflight

This command makes an existing policy comparison reproducible before a live
experiment. It uses the Music DNA domain adapter (`mode_pressure` weight +2), not
Agent Brain's generic hosted API (+4). It does not collect data or authorize a
trial. No Echelon changes, HTTP/database calls, model tokens or deployment occur.

```bash
npm ci --no-audit --no-fund
npm run eval:musicdna:feasibility -- --output /tmp/new-musicdna-report
# To verify the actual Music DNA mirror at the reviewed commit too:
npm run eval:musicdna:feasibility -- \
  --musicdna-root /path/to/pinned/music-dna-checkout \
  --output /tmp/another-new-musicdna-report
```

Use a new output directory; existing reports are never overwritten. Outputs are
`report.json` and `report.md`. With no reference checkout, mirror verification is
**unverified/null**, not passed. The pinned reference commit and source/compiled
file hashes live in `fixtures/musicdna/feasibility-pin-v1.json`; source or stale
build drift fails before artifacts are written. Updating pins requires reviewing
the policy change, not just regenerating hashes to make a test pass. The report
also hashes its evaluator, records exact policy bytes and has no wall-clock fields,
so repeated runs over the same inputs produce identical artifacts.

## November 8 source finding

Music DNA reference `e0bb787adc495265936fe0b0d599b595033cd1f1` and Agent Brain's three
shared golden cases were verified. Those cases omit escape pressure. Eight added
boundary inputs (rounds 4/5, general/alternative lane, low/settled lane confidence)
exposed one telemetry semantic difference: Music DNA treats `escape -> explore` as
agreement; Agent Brain previously returned false. The domain-only helper now
matches the shipped Music DNA semantic. Scores, regimes, weights and knobs are
unchanged by that correction. The generic API/scorer is unchanged.

All eleven covered inputs match the actual pinned Music DNA mirror after this
fix. This is coverage of these inputs, not proof for every possible session.
The three golden cases have different generic versus domain scores, confirming
that a generic Brain HTTP reply must not be called the Music DNA domain policy.

The report compares the existing post-bootstrap legacy mode/knobs with candidate
knobs. It does not run the catalog selector, simulate bootstrap or fallback,
assert lane/evidence safety, or produce counterfactual listener outcomes. Even a
knob difference in every covered input is not evidence of improvement.

## What remains on AB-52

The first readout is **hold / insufficient evidence**. Evaluated live sessions and
joined outcomes are zero; the actual available live population is unknown because
this command never reads production. Effect and uncertainty stay null.

Before any treatment, record an owner decision freezing one diagnostic-quality
metric, completion/skips/diversity/evidence/latency/error/cost guardrails, eligibility,
consent, stable control/treatment assignment, pinned versions, exposure window,
feedback deadline and missing/late-outcome rules. No sample-size or efficacy claim
is inferred from the small parity corpus or old shadow thresholds.

AB-29 must join the assignment and **actually applied** policy/result version to
exact-version feedback through the existing durable evidence path. A suggested
or shadow-only policy is not an applied treatment. Missing feedback is unknown;
respondent agreement alone is biased and cannot establish benefit.

After these inputs and authorization exist, the remaining AB-52 work implements
the bounded experiment and reports denominators, uncertainty, attrition and contrary
results. AB-30 governs any later promotion. This PR neither completes AB-52 nor
changes any production flag, scope, source, policy, memory or skill.

Verification: `npm run smoke:musicdna-feasibility` plus
`AB52_MUSICDNA_REFERENCE_ROOT=/path/to/pinned/checkout npm run smoke:musicdna-feasibility`
for the cross-repository check. CI runs local checks on Node 22 and 24; reference
verification is explicitly skipped when that separate private checkout is absent.
