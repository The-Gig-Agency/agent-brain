# Regime Failure Modes

**Status:** Draft v1
**Purpose:** Define how each search regime commonly fails when overused or misapplied.

## Goal

The router should never recommend a regime without also surfacing its likely failure pattern.

This makes the framework:

- more rigorous
- more psychologically resonant
- easier to critique
- safer to operationalize

## Why Failure Modes Matter

Failure modes prevent the system from behaving like a decorative taxonomy.

They support:

- counter-lens generation
- self-critique in outputs
- transition triggers
- evaluation of whether a regime stayed active too long

## Failure Mode Table

| Regime | Common failure mode | Symptom |
| --- | --- | --- |
| `prune` | Over-pruning too early | Good options are discarded before enough evidence exists |
| `explore` | Endless searching | Learning continues without convergence pressure |
| `compound` | Doubling down too long | Team keeps scaling after the signal has degraded |
| `coordinate` | Over-strategizing | Effort shifts from action to recursive modeling of other actors |

## Fine-Grained Inspirations

These help the long-term ontology, even if the MVP routes at the broader regime layer.

| Lens | Common failure mode |
| --- | --- |
| Momentum | Doubles down too long after initial signal |
| Bayesian Optimization | Analysis paralysis from over-valuing uncertainty reduction |
| Simulated Annealing | Wandering without enough cooling or convergence pressure |
| Game Theory | Paranoia and over-modeling of strategic actors |
| Gradient Descent | Trapped in a local minimum |
| Diffusion | High novelty without convergence |
| Branch and Bound | Premature elimination of branches |
| Evolutionary Search | Resource burn across too many weak variants |

## Output Requirement

Every recommendation should include:

- selected regime
- why it fits
- likely failure mode
- warning signs that the regime is overstaying
- counter-regime or opposing lens

Example:

- selected regime: `explore`
- likely failure mode: continuing to run tests after the winner is already obvious
- counter-regime: `compound`

## Detection Signals

The system should detect when a regime may be failing.

Examples:

- `prune` failure signals
  - eliminations rely on weak evidence
  - branches are rejected faster than signal quality improves
- `explore` failure signals
  - no reduction in uncertainty after repeated experiments
  - variant count stays high while action stalls
- `compound` failure signals
  - investment grows while marginal returns fall
  - contradictory signals are ignored
- `coordinate` failure signals
  - too much energy goes into adversarial simulation
  - coordination overhead eclipses forward progress

## Design Rules

- Failure modes should be concrete enough to observe in behavior.
- The system should describe failure in plain language, not only algorithmic jargon.
- A failure mode should connect naturally to a transition recommendation.

## Open Questions

- Should failure-mode severity be scored separately from fit score?
- Should the product show one failure mode or a ranked list?
