# Media Decision Contract

**Status:** Draft v1  
**Purpose:** Define a media-specific decision schema and deterministic action mapping on top of terrain scoring.

## Goal

This contract lets the router accept structured media buying state and return one actionable decision:

- `explore`
- `prune`
- `hold`
- `scale`
- `diagnose`
- `reallocate`
- `test_next`

The decision should be explicit, auditable, and confidence-scored.

## Input Schema

```json
{
  "entity_level": "account|campaign|adset|ad|keyword|audience|creative",
  "channel": "meta|google|mixed",
  "intent_layer": "brand|nonbrand|retargeting|prospecting|mixed",
  "primary_goal": "scale|efficiency|learning|cleanup|recovery",
  "spend_share": 0.34,
  "cpl_vs_target": 1.12,
  "cpc_trend": 0.08,
  "ctr_trend": -0.04,
  "conversion_volume": 57,
  "budget_utilization": 0.91,
  "signal_quality": "low|medium|high",
  "saturation_risk": "low|medium|high",
  "tracking_confidence": "low|medium|high",
  "blockers": ["string"],
  "missing_information": ["string"]
}
```

## Output Schema

```json
{
  "recommended_action": "explore|prune|hold|scale|diagnose|reallocate|test_next",
  "action_confidence": 0.0,
  "rationale": ["string"],
  "regime_alignment": {
    "primary_regime": "prune|explore|compound|coordinate",
    "secondary_regime": "prune|explore|compound|coordinate|null",
    "transition_candidate": "prune|explore|compound|coordinate|null"
  },
  "inferred_terrain": {},
  "evidence_requirements": ["string"],
  "blockers": ["string"],
  "missing_information": ["string"]
}
```

## Decision Rules (High Level)

- Infer terrain from media inputs (signal quality, tracking confidence, volatility, scope).
- Use deterministic regime scoring from the core router.
- Map regime and metrics to media actions.
- Penalize confidence when blockers or missing information accumulate.
- Always return exactly one action with rationale and evidence requirements.

## Media v2 (optional fields — TGA-243)

Implemented in `src/cognitive-router/types.ts`, `media-decision-v2.ts`, and `recommendMediaAction` output extensions.

**Optional inputs on `MediaDecisionInput`:**

- `statistical_reliability` — impressions/conversions/tier; weak tiers apply a deterministic confidence penalty.
- `ad_level_metrics[]` — per-ad `ctr`, `cpc`, `cpa`, `spend` for winner/loser readout.
- `creative_breakdown` — `hook` / `body` / `cta` each with at least `ctr` (optional `cpc`, `spend_share`).
- `dimension_splits` — nested map `dimensionLabel -> sliceKey -> { ctr, cpa?, spend_share? }` for highlights.

**Optional outputs on `MediaDecisionRecommendation`:**

- `statistical_readout` — tier, `sample_adequate`, operator-facing notes.
- `ad_level_readout` — `winners` / `losers` with short rationales.
- `creative_component_readout` — best component + rationale.
- `dimension_split_highlights` — short strings for top slices.
- `test_plan` — `hypotheses`, `next_variants`, `success_metrics`, `stop_rules`.

**`MediaDecisionRunOptions.v2_readouts`:** when `true`, emit readouts even with sparse v2 inputs (use for demos; frozen **v0.1** pack should keep default `false`).

**Fixture:** `fixtures/echelon/media-decision-v0.2.json` (v0.1 cases + structured reliability; case `media-01` includes ad/creative/split signals). Run `npm run eval:media:v0.2`.

Full product rationale: `project-brain/echelon/router-core-service-upgrades-v0.1.md` ([TGA-243](https://youtrack.thegig.agency/issue/TGA-243)).

## Worked Examples

1. **Explore**  
   - `primary_goal: learning`, `signal_quality: low`, `tracking_confidence: medium`  
   - Expected: `recommended_action = explore` or `test_next` with medium confidence.

2. **Prune**  
   - `primary_goal: efficiency`, `cpl_vs_target: 1.25`, `signal_quality: high`, `entity_level: adset`  
   - Expected: `recommended_action = prune` with high confidence.

3. **Scale**  
   - `primary_goal: scale`, `cpl_vs_target: 0.78`, `saturation_risk: low`, `budget_utilization: 0.72`  
   - Expected: `recommended_action = scale` with high confidence.

4. **Diagnose**  
   - `tracking_confidence: low`, `signal_quality: low`, `conversion_volume: 12`  
   - Expected: `recommended_action = diagnose` with explicit measurement-risk rationale.

5. **Reallocate**  
   - `entity_level: account`, `channel: mixed`, `primary_goal: efficiency`, `budget_utilization: 0.97`  
   - Expected: `recommended_action = reallocate` due to cross-surface budget pressure.

6. **Hold**  
   - `primary_goal: recovery`, `signal_quality: medium`, `tracking_confidence: medium`, `cpl_vs_target: 1.02`  
   - Expected: `recommended_action = hold` with containment-first rationale.

7. **Test Next**  
   - `primary_goal: learning`, `signal_quality: medium`, `cpc_trend: 0.11`, `ctr_trend: -0.08`  
   - Expected: `recommended_action = test_next` with experiment-driven evidence requirements.

## Validation Rules

- Reject payloads with missing required fields.
- Clamp confidence to `0..1`.
- Keep metric fields numeric and bounded by calling layer contracts.
- Include blockers and missing information in output for downstream skills.
