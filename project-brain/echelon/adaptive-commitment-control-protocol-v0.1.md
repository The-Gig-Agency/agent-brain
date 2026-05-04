# Adaptive Commitment Control Protocol (v0.1)

## Purpose

Define the operational protocol for frozen benchmarking, transition-first evaluation, and ablation studies so Echelon progress remains scientifically legible over time.

This protocol executes the charter and prevents silent benchmark drift.

## Scope

- proving ground: debugging
- adjacent transfer domain: media decisioning
- protocol focus: invariants, transitions, calibration, and primitive causality

## Benchmark Topology

Maintain three benchmark lanes:

1. **Frozen Lane (sacred)**
   - immutable after ratification
   - used for all longitudinal claims
   - no case edits, no relabeling, no score-rule rewrites

2. **Candidate Lane (staging)**
   - new cases and metric refinements
   - must run alongside frozen lane
   - used to decide future frozen-lane promotion
   - transition-first candidate pack v0.1: `npm run eval:transition-candidate:v0.1` (cases in `DEBUGGING_TRANSITION_CANDIDATE_V01_CASES`, report includes `transition_cycle_metrics`)
   - expanded candidate pack v0.2: `npm run eval:transition-candidate:v0.2` (20 cases: `DEBUGGING_TRANSITION_CANDIDATE_V02_CASES`, mirrors + paraphrases + boundaries)

3. **Stress Lane (adversarial)**
   - harsh counterfactuals and deception-heavy cases
   - used for failure discovery, not headline claims

## Versioning Rules

- frozen suites use semantic tags: `frozen-debug-v1`, `frozen-media-v1`
- each run records:
  - suite id and git commit hash
  - router version and primitive toggles
  - metric schema version
- any metric-definition change increments metric schema version

## Ratified frozen lanes (v1)

Canonical pins, fixture paths, implementation SHA, and **pass thresholds** (including calibration-style gates) live in:

- `project-brain/echelon/frozen-lanes-manifest-v1.json` — machine-readable manifest
- `project-brain/echelon/frozen-debug-v1-lock.md` — debugging frozen lane
- `project-brain/echelon/frozen-media-v1-lock.md` — media frozen lane

Stable npm entrypoints: `eval:frozen:debug:v1`, `eval:frozen:media:v1`.

**Immutability:** do not edit v1 fixtures or thresholds in place to chase scores. Add `frozen-debug-v2` / `frozen-media-v2` (new files + manifest) when content or metric semantics must change.

## Invariants To Track Every Run

1. no unjustified overcommitment under underdetermination
2. partial fixes remain partial until disconfirming checks pass
3. confidence collapses when contradictions arrive
4. drift triggers recovery and reopening, not static persistence
5. transition behavior improves cost-quality tradeoff vs strong fixed baselines

## Primary Metrics (Transition-First)

- transition regret
- premature convergence rate
- confidence collapse quality
- drift recovery cost
- partial-resolution handling quality
- overconfidence penalty and underconfidence penalty

Secondary metrics:

- exact action match
- acceptable action match
- rationale completeness

## Minimum Reporting Table

Every report must include:

- frozen lane metrics (full table)
- candidate lane metrics (full table)
- deltas vs previous frozen-run baseline
- pass/fail against invariant thresholds
- failure slice list (case ids and reason tags)
- explicit "what this does not prove"

## Ablation Matrix

Local runner (v0.1 table JSON + primitive contribution summary):

- `npm run eval:ablation-matrix:v0.1` → `reports/ablation-matrix-v0.1/*.json`

Run one-factor ablations per cycle with all else fixed:

1. remove failed-path suppression
2. remove transition regulation
3. remove confidence gating
4. remove drift detection and recovery
5. remove exploration pressure adjustments
6. remove inspection-before-compound constraint

For each ablation, capture:

- delta on each primary metric
- invariant violations introduced
- case families most affected

## Causality Gate

A primitive is considered causally supported only if:

- removing it degrades at least one primary metric beyond threshold in frozen lane
- effect is reproducible across at least two runs
- effect appears in debugging and at least one adjacent-domain case family

## Promotion Rule (Candidate -> Frozen)

Promote a candidate suite only when all hold:

- metric definitions are stable for at least one full cycle
- no unresolved labeling disputes
- no case edits for one cycle
- ablation profile is complete
- at least one invariant becomes more discriminative without breaking comparability

## Adjacent Domain Transfer Rule

Add one new domain only after:

- frozen debugging lane remains stable across two consecutive cycles
- primitive-level ablations still show causal deltas
- domain uses same primitive set (no ontology explosion)

For now, media is the only adjacent transfer domain.

## Change Control

Any of the following requires explicit protocol note in run report:

- new metric
- changed threshold
- changed confidence-band mapping
- changed expected labels on existing cases
- added or removed primitive

## Execution Cadence

Per cycle:

1. run frozen lane (baseline)
2. run candidate lane (innovation)
3. run ablation matrix
4. run adjacent-domain transfer pack
5. publish findings with deltas and invariant status

## Stop Conditions

Pause broadening and investigate if any occur:

- frozen-lane headline metrics regress for two cycles
- ablations no longer produce clear primitive effects
- improvements appear only in mutable candidate lane
- calibration degrades while accuracy rises

## Positioning Guardrail

This protocol exists to keep the project in the "adaptive commitment control" category, not drifting into:

- broad framework expansion
- ontology inflation
- regime proliferation without causal evidence
