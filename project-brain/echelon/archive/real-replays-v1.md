# Echelon — Real Replays V1

## Purpose

`real-replays-v1` is the first evaluator-backed replay dataset for Echelon.

It exists to move beyond purely synthetic debugging worlds while preserving the same core discipline:

- router sees only visible task context
- evaluator holds the patch truth
- results are judged on search-policy quality, not just narrative quality

## Dataset shape

The dataset is intentionally split into two files:

- router-visible fixture
- evaluator-only fixture

That separation is required.

The router-visible file may include:

- case id
- repo
- local repo path
- stack
- symptom
- visible evidence
- reproducibility notes
- success framing

The evaluator-only file may include:

- PR number
- PR URL
- merge commit SHA
- pre-fix start ref
- merged date
- likely fix files
- hidden root-cause notes
- patch-family judgment criteria

## Included cases

Current cases:

1. `cg-161`
2. `cg-171`
3. `cg-172`
4. `cg-173`
5. `hfc-2`

## Why this set

This is a good first replay batch because:

- all five are real merged fixes
- the symptoms are concrete and production-like
- several cases come from one codebase, which reduces setup noise
- `hfc-2` provides a cleaner schema-centric case outside the `creatorgift-backend` cluster

## Recommended usage order

Start with the cleaner and smaller cases first:

1. `hfc-2`
2. `cg-172`
3. `cg-171`
4. `cg-161`
5. `cg-173`

## Evaluation posture

At first, treat these as replay-routing cases, not as full autonomous coding tasks.

The first question should be:

- does the routed policy inspect better areas sooner than compact baselines?

Only after that should we ask:

- can the system reproduce the patch or land a consistent fix?

## Current limitations

This dataset is stronger than synthetic worlds, but it is still replay-oriented.

It does **not** yet guarantee:

- perfect reproducibility
- runnable local verification for every case
- complete issue / log history for every PR

That is acceptable for `v1`.

The main goal is to establish a disciplined real-case substrate without leaking evaluator truth into the router.
