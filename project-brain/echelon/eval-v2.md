# Echelon — Eval V2

## Goal

Prove Echelon is a search-policy engine, not a dressed-up framework.

The question is not, “did it guess the right label?”
The question is, “did routed policy improve outcome, cost, and transition behavior under blindness?”

## What to test

### 1. Blinded routing

Input:
- task prompt
- terrain features or enough context to infer them

Hidden from the router:
- gold regime
- expected answer
- evaluator labels
- hidden causal structure

Measure:
- chosen regime
- confidence
- transition suggestion
- cost estimate

Use this to test:
- whether routing generalizes
- whether the router is stable on holdout cases
- whether it avoids leaking the answer through prompt design

### 2. Closed-world synthetic tasks

Build fake but structured cases where different regimes produce measurably different search behavior.

Each case should include:
- initial evidence state
- hidden causal structure
- action space
- observation rules
- cost model
- stopping rule

Good wedges:
- debugging
- GTM experiment selection
- prioritization under uncertainty
- incident triage

### 3. Historical replay / counterfactuals

Take real cases, strip outcome labels from the router, and let it choose a regime from the initial state.

Compare against:
- what humans did
- what worked
- what wasted cycles
- what dead paths were repeated

This is the best near-term realism test.

## Dataset contract

Every runnable case should separate router-visible input from evaluator-only truth.

Shape:

```json
{
  "case_id": "debug-v1-01",
  "input_context": {
    "prompt": "string",
    "terrain": {},
    "budget": 10,
    "available_actions": []
  },
  "hidden_truth": {
    "root_cause": "string",
    "effects": {}
  }
}
```

The router may only read:
- `case_id`
- `input_context`

The evaluator may read:
- `hidden_truth`
- final run trace
- baseline traces

This separation is required to keep the eval actually blinded.

## Baselines

At minimum:
- always-explore
- always-prune
- always-compound
- fixed heuristic policy
- naive retry loop

Baseline contract:
- every baseline operates over the same visible action space as the routed policy
- every baseline spends from the same cost budget
- every baseline emits the same output trace schema
- no baseline gets privileged access to hidden truth

Echelon should beat at least one simple baseline on a real wedge, or it is not yet paying for itself.

## Metrics

### Outcome metrics
- success rate
- time to resolution
- retries before success
- repeated failed-path count
- false convergence rate
- budget consumed

### Router metrics
- regime accuracy on held-out cases
- confidence calibration
- transition timing quality
- drift detection precision
- failed-path recall

### System metrics
- token cost
- tool calls
- latency
- human override rate

## Pass / fail

Pass if, on at least one wedge:
- routed policy beats the strongest simple baseline on success rate or cost-adjusted success
- transition timing improves outcomes, not just classification score
- performance holds on held-out cases

Fail if:
- the system only matches labels but not outcomes
- routing adds cost without measurable gain
- the eval can be gamed by prompt shape or taxonomy wording

## First benchmark wedge

Use debugging first.

Why:
- failures are observable
- repeated dead paths are measurable
- cost is easy to model
- transitions matter a lot

## First 10 synthetic cases

1. Missing dependency vs wrong dependency version
2. Flaky test vs real regression
3. Env var mismatch vs bad secret scope
4. Cache issue vs logic bug
5. Bad input validation vs downstream API failure
6. Race condition vs stale state
7. Broken retry policy vs transient outage
8. Schema drift vs serialization bug
9. Permission issue vs missing deployment artifact
10. Silent failure vs observability gap

## Recommended eval protocol

1. Freeze the router version.
2. Run blinded holdout cases.
3. Run synthetic debugging cases.
4. Run historical replay cases.
5. Compare against baselines.
6. Report per-case and per-stratum results.
7. Track failure modes, not just aggregate score.

## Output format

Every run should emit:
- case id
- predicted regime
- confidence
- transition recommendation
- final outcome
- cost summary
- baseline comparison
- pass/fail

## Notes

This eval is intentionally designed to punish:
- generic planner/executor loops
- keyword routing
- confident but useless labels
- regime taxonomies with no operational effect

If the router does not improve search behavior, shrink the system.
