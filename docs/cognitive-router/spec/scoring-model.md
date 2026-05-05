# Scoring Model

**Status:** Draft v1
**Purpose:** Define how the router maps terrain profiles to regime recommendations.

## Goal

Use deterministic scoring for final routing decisions.

The model may use an LLM to extract terrain from text, but the app should own:

- normalized terrain values
- regime ranking
- failure-mode attachment
- transition suggestions

## Scoring Strategy

Use weighted matching instead of hardcoded if/else trees.

This keeps the system:

- legible
- tunable
- benchmarkable

## Regime Preferences

### `explore`

Prefer when:

- `uncertainty` is high
- `information_cost` is low or medium
- `feedback_latency` is not too slow
- `branching_factor` is medium or high
- `time_horizon` is iterative

### `prune`

Prefer when:

- `branching_factor` is high
- `uncertainty` is medium
- too many paths remain active
- the problem needs narrowing more than ideation

### `compound`

Prefer when:

- evidence already favors one path
- `reversibility` is acceptable or the cost of delay is high
- `environment_stability` is stable
- execution consistency matters more than more search

Also read in light of **`regime-transitions.md`** (*Compound as transition behavior*): static weights approximate “deepen vs keep searching”; **momentary compound scores should not eclipse** situations where containment, obvious prune, or a stable narrow fix is the intellectually honest answer — transitions and asymmetric baselines carry that discrimination.

### `coordinate`

Prefer when:

- `adversariality` is high
- `coordination_load` is medium or high
- outcome depends on specialist interfaces or strategic actors

## Example Weight Table

| Dimension | Value | `explore` | `prune` | `compound` | `coordinate` |
| --- | --- | ---: | ---: | ---: | ---: |
| `uncertainty` | `high` | 3 | 0 | -2 | 0 |
| `uncertainty` | `medium` | 1 | 2 | 0 | 0 |
| `branching_factor` | `high` | 2 | 3 | -1 | 0 |
| `reversibility` | `high` | 2 | 1 | 0 | 0 |
| `reversibility` | `low` | -1 | 1 | -2 | 1 |
| `adversariality` | `high` | 0 | 0 | 0 | 4 |
| `coordination_load` | `high` | 0 | 0 | 0 | 3 |
| `environment_stability` | `stable` | 0 | 1 | 2 | 0 |
| `environment_stability` | `shifting` | 1 | 0 | -1 | 1 |
| `local_minima_risk` | `high` | 2 | 0 | -1 | 0 |

This table is illustrative rather than final.

## Secondary Outputs

The scorer should also determine:

- `confidence`
- `secondary_regime`
- `opposing_regime`
- `transition_candidate`

### Confidence

Confidence should be lower when:

- top two regimes score similarly
- key terrain dimensions were inferred with low confidence
- the terrain profile contains internal contradiction

### Opposing Regime

The system should return a counter-regime to reduce overfitting.

Examples:

- `explore` counter-regime: `compound`
- `compound` counter-regime: `explore`
- `prune` counter-regime: `explore`
- `coordinate` counter-regime: `prune` or `explore`, depending on cause

## Example Pseudocode

```ts
type Regime = "prune" | "explore" | "compound" | "coordinate";

function score(profile: TerrainProfile): Record<Regime, number> {
  const scores = {
    prune: 0,
    explore: 0,
    compound: 0,
    coordinate: 0,
  };

  if (profile.uncertainty === "high") scores.explore += 3;
  if (profile.branching_factor === "high") {
    scores.explore += 2;
    scores.prune += 3;
  }
  if (profile.adversariality === "high") scores.coordinate += 4;
  if (profile.environment_stability === "stable") scores.compound += 2;

  return scores;
}
```

## Tuning Strategy

Weights should be adjusted using benchmark cases, not only intuition.

Recommended process:

1. define canonical cases
2. label preferred regime and acceptable alternatives
3. run the scorer
4. review mismatches
5. update weights conservatively

## Design Rules

- Keep the first scoring model explainable by hand.
- Avoid hidden heuristics in the first version.
- Prefer weight changes over logic sprawl.
- Store enough detail to audit why a regime won.

## Open Questions

- Should domain context slightly bias weights, or stay separate from terrain?
- Should the first scorer be flat-weighted or normalized?
- Should failure-mode risk adjust regime rank directly?
