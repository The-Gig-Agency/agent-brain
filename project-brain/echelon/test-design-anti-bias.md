# echelon — Test Design Anti-Bias Notes

## Purpose

Synthetic debugging tests are useful, but they are also dangerous.

If we are not careful, the case design will simply encode our preferred story:

- routed policy looks smart
- baselines look dumb
- metrics improve
- confidence rises

even if the underlying wedge is weak.

This document exists to reduce false positives.

## Main false-positive risks

### 1. Case design rewards our router by construction

Failure mode:

- we create worlds where the routed policy’s preferred sequence is the only reasonable path
- baselines are forced into obviously bad behavior

Result:

- benchmark wins do not generalize

### 2. Hidden answer leakage

Failure mode:

- the visible input strongly encodes the intended regime or correct path
- prompts, terrain fields, or action labels quietly reveal the solution

Result:

- the benchmark measures label-reading, not adaptive search

### 3. Static inspect order accidentally matches the ground truth too often

Failure mode:

- the same fixed heuristic keeps winning because the synthetic worlds reward a simple inspect-first order

Result:

- we learn less about routing quality than we think

### 4. Benchmark-specific hacks

Failure mode:

- we tune the router to the current case set
- improvements stop transferring to holdout cases

Result:

- apparent progress
- weak real wedge

### 5. Metric gaming

Failure mode:

- the system lowers cost by stopping early
- or lowers retries by avoiding useful exploration

Result:

- metrics improve while true search quality worsens

## Anti-bias design rules

### Rule 1: Build cases that can beat the router

Every new synthetic case should be able to make routed policy lose if the routing or transition logic is wrong.

If a case is too easy for every reasonable policy:

- it is not a good discriminator

### Rule 2: Separate visible input from hidden truth

Visible input should contain:

- task prompt
- terrain hints
- action space
- budget

Hidden truth should contain:

- root cause
- observation rules
- success conditions

Never let hidden-truth fields leak into visible descriptions.

### Rule 3: Make some cases hostile to our assumptions

At least some cases should include:

- misleading early evidence
- false-positive inspection paths
- delayed decisive signals
- paths that look promising and then fail
- situations where static inspect order is good

That last one is important.

The benchmark should not assume routed policy always ought to win.

### Rule 4: Use holdout cases

Do not judge progress only on the development set.

Every tuning pass should check:

- does the win hold on holdout cases?

If not:

- suspect benchmark overfitting

### Rule 5: Compare against strong simple baselines

Do not compare only against strawmen.

At minimum, preserve:

- `naive_retry`
- `always_compound`
- `fixed_heuristic`

The strongest simple baseline matters most.

### Rule 6: Track failure, not just success

For every run, track:

- repeated failed-path count
- cost before first strong signal
- dead-end persistence
- hysteresis
- transition timing

This helps distinguish real control improvements from accidental wins.

### Rule 7: Penalize benchmark quirks

If routed policy wins by exploiting weird action ordering or synthetic artifacts rather than better search adaptation:

- count that as a bad win

We want:

- transferable control logic

not:

- benchmark-shaped cleverness

## Practical case-design checklist

Before accepting a new debugging-core case, ask:

1. Can `fixed_heuristic` plausibly win here?
2. Can routed policy plausibly lose here?
3. Does visible input avoid revealing the hidden answer?
4. Does the case stress transition timing, not just initial selection?
5. Would a cheap benchmark-specific hack obviously game this case?

If too many answers are unfavorable, the case is not good enough yet.

## Interpretation rule

Synthetic wins are evidence.
They are not proof.

Use them to:

- sharpen the wedge
- identify good control signals
- expose failure modes

Do not use them to justify widening scope prematurely.
