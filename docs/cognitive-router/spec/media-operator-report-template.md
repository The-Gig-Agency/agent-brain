# Media Operator Report Template

**Status:** Draft v1  
**Purpose:** Provide a reusable operator-facing report format that combines metric read, router recommendation, and concrete actions.

## Report Header

- **Account / Entity:** `<account or scope>`
- **Window:** `<date range>`
- **Channel Mix:** `<meta/google/mixed>`
- **Primary Goal:** `<scale|efficiency|learning|cleanup|recovery>`
- **Prepared By:** `<operator or agent>`

## Input Snapshot

```json
{
  "entity_level": "campaign",
  "channel": "google",
  "intent_layer": "brand",
  "primary_goal": "scale",
  "spend_share": 0.62,
  "cpl_vs_target": 0.78,
  "cpc_trend": 0.05,
  "ctr_trend": 0.01,
  "conversion_volume": 28,
  "budget_utilization": 0.97,
  "signal_quality": "medium",
  "saturation_risk": "medium",
  "tracking_confidence": "high",
  "missing_information": [
    "nonbrand expansion inventory by match type"
  ]
}
```

## Router Output

- **Recommended Action:** `explore`
- **Action Confidence:** `0.62`
- **Regime Alignment:** `primary=explore, secondary=prune`
- **Rationale (top):**
  - Budget is near fully utilized, so scaling likely requires budget movement and expansion design.
  - Signal quality is not yet high enough for blind scale in a capped structure.

## Operator Decision Layer

### Keep

- protect branded winner budget floor
- retain top branded keyword cluster and existing conversion path

### Cut

- stop unstructured broad expansion spend without clear CPA guardrails
- stop manual overrides that hide saturation effects

### Test Next

- launch one nonbrand expansion cell with fixed budget cap and CPA stop-loss
- run creative-variant test for expansion cohort with 7-day review gate

## Risk And Data Notes

- **Blockers:** `<tracking gaps, policy limits, feed delays>`
- **Missing Information:** `<what is still needed for higher confidence>`
- **Fail-Safe:** `<what should happen if metrics degrade>`

## Final Operator Call

- **Decision to Execute:** `<selected actions>`
- **Review Date:** `<date>`
- **Success Metric:** `<single primary outcome metric>`
