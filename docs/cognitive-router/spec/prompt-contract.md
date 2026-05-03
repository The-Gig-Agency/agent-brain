# Prompt Contract

**Status:** Draft v1
**Purpose:** Define the LLM extraction contract for the cognitive router.

## Goal

The model should help interpret a free-text problem description, but it should not decide the final regime alone.

The prompt contract should produce:

- normalized terrain estimates
- confidence levels
- missing information
- concise problem summary

The deterministic scorer then uses that output.

## Model Responsibilities

The model should:

- summarize the problem
- infer likely terrain values
- note ambiguity explicitly
- propose follow-up questions when needed

The model should not:

- skip uncertain fields silently
- output a final regime as authoritative truth
- invent evidence that is not present in the input

## Required JSON Shape

```json
{
  "problem_summary": "string",
  "terrain_profile": {
    "feedback_latency": "fast|medium|slow",
    "reversibility": "high|medium|low",
    "uncertainty": "low|medium|high",
    "branching_factor": "low|medium|high",
    "adversariality": "none|some|high",
    "ruggedness": "low|medium|high",
    "local_minima_risk": "low|medium|high",
    "information_cost": "low|medium|high",
    "coordination_load": "low|medium|high",
    "environment_stability": "stable|shifting",
    "time_horizon": "one_shot|iterative",
    "mode_pressure": "explore|prune|compound|escape|coordinate|create"
  },
  "field_confidence": {
    "feedback_latency": 0.0,
    "reversibility": 0.0
  },
  "missing_information": ["string"],
  "follow_up_questions": ["string"]
}
```

## Extraction Prompt Requirements

The prompt should tell the model to:

- classify terrain rather than problem category
- choose only allowed enum values
- state uncertainty instead of guessing too hard
- prefer conservative inference over decorative confidence

## Example Guidance

Given:

- "We have five possible customer segments, limited budget, and weak early signal."

The model should infer things like:

- `branching_factor: high`
- `uncertainty: high`
- `information_cost: medium`
- `time_horizon: iterative`

It should also ask questions like:

- "How expensive is each segment experiment?"
- "How reversible is a bet on one segment?"

## Validation Rules

Before the output reaches scoring:

- reject non-enum values
- reject missing required keys
- clamp confidence to `0..1`
- keep a record of which fields came from model inference vs user confirmation

## Design Rules

- The prompt should optimize for structured honesty, not rhetorical polish.
- Missing information is a feature, not a failure.
- The router should be able to re-run extraction after clarification without losing provenance.

## Open Questions

- Should the model return an initial regime guess for debugging only?
- Should follow-up questions be ranked by expected information gain?
