import { buildMediaV2Attachment, mediaV2ConfidenceAdjustment } from "./media-decision-v2.js";
import { scoreTerrain } from "./scoring.js";
import type {
  MediaDecisionInput,
  MediaDecisionRecommendation,
  MediaDecisionRunOptions,
  MediaRecommendedAction,
  SearchRegime,
  TerrainProfile,
} from "./types.js";

const ACTION_EVIDENCE_REQUIREMENTS: Record<MediaRecommendedAction, string[]> = {
  explore: [
    "At least two plausible optimization paths remain unresolved.",
    "Signal quality or tracking confidence is not high.",
  ],
  prune: [
    "One or more branches consistently underperform target guardrails.",
    "Signal quality is medium or high for the narrowed scope.",
  ],
  hold: [
    "Performance is within acceptable band and no urgent degradation is detected.",
    "Tracking confidence is not low.",
  ],
  scale: [
    "CPL efficiency is at or better than target.",
    "Budget utilization has room or scaling path is explicit.",
  ],
  diagnose: [
    "Tracking confidence is low or evidence is contradictory.",
    "Core measurement or attribution integrity is uncertain.",
  ],
  reallocate: [
    "Relative performance differences across entities or channels are clear.",
    "Budget movement can improve expected outcome without violating constraints.",
  ],
  test_next: [
    "Current winner is not yet stable enough for broad scale.",
    "A concrete next experiment can reduce uncertainty quickly.",
  ],
};

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function textHints(items: string[] | undefined, patterns: string[]): boolean {
  if (!items || items.length === 0) {
    return false;
  }
  const haystack = items.join(" ").toLowerCase();
  return patterns.some((pattern) => haystack.includes(pattern));
}

function deriveModePressure(input: MediaDecisionInput): TerrainProfile["mode_pressure"] {
  if (input.tracking_confidence === "low" || input.signal_quality === "low") {
    return "explore";
  }
  if (input.primary_goal === "cleanup" || input.primary_goal === "efficiency") {
    return "prune";
  }
  if (input.primary_goal === "scale" && input.saturation_risk !== "high") {
    return "compound";
  }
  if (input.primary_goal === "learning") {
    return "explore";
  }
  if (input.primary_goal === "recovery") {
    return "coordinate";
  }
  return "prune";
}

export function inferTerrainFromMediaDecision(input: MediaDecisionInput): TerrainProfile {
  const uncertainty =
    input.signal_quality === "low" || input.tracking_confidence === "low"
      ? "high"
      : input.signal_quality === "medium" || input.tracking_confidence === "medium"
        ? "medium"
        : "low";

  const branchingFactor =
    input.entity_level === "account" || input.channel === "mixed"
      ? "high"
      : input.entity_level === "campaign" || input.entity_level === "audience"
        ? "medium"
        : "low";

  const feedbackLatency = input.conversion_volume >= 60 ? "fast" : input.conversion_volume >= 20 ? "medium" : "slow";
  const informationCost =
    input.signal_quality === "low" || input.tracking_confidence === "low"
      ? "high"
      : input.signal_quality === "medium"
        ? "medium"
        : "low";

  const ruggedness =
    input.saturation_risk === "high" || input.cpc_trend > 0.15 || input.ctr_trend < -0.1
      ? "high"
      : input.saturation_risk === "medium"
        ? "medium"
        : "low";

  const localMinimaRisk =
    input.saturation_risk === "high" || input.primary_goal === "scale"
      ? "high"
      : input.signal_quality === "medium"
        ? "medium"
        : "low";

  const environmentStability =
    Math.abs(input.cpc_trend) > 0.2 || Math.abs(input.ctr_trend) > 0.2 || input.primary_goal === "recovery"
      ? "shifting"
      : "stable";

  return {
    feedback_latency: feedbackLatency,
    reversibility: input.entity_level === "account" ? "low" : input.entity_level === "campaign" ? "medium" : "high",
    uncertainty,
    branching_factor: branchingFactor,
    adversariality: input.channel === "mixed" ? "some" : "none",
    ruggedness,
    local_minima_risk: localMinimaRisk,
    information_cost: informationCost,
    coordination_load:
      input.entity_level === "account" || input.channel === "mixed"
        ? "high"
        : input.entity_level === "campaign" || input.entity_level === "audience"
          ? "medium"
          : "low",
    environment_stability: environmentStability,
    time_horizon: "iterative",
    mode_pressure: deriveModePressure(input),
  };
}

function actionScoresFromRegime(primary: SearchRegime, secondary: SearchRegime | null): Record<MediaRecommendedAction, number> {
  const scores: Record<MediaRecommendedAction, number> = {
    explore: 0,
    prune: 0,
    hold: 0,
    scale: 0,
    diagnose: 0,
    reallocate: 0,
    test_next: 0,
  };

  if (primary === "explore") {
    scores.explore += 3;
    scores.test_next += 2;
    scores.reallocate += 1;
  } else if (primary === "prune") {
    scores.prune += 3;
    scores.hold += 1;
    scores.diagnose += 1;
  } else if (primary === "compound") {
    scores.scale += 3;
    scores.hold += 1;
  } else if (primary === "coordinate") {
    scores.reallocate += 3;
    scores.diagnose += 2;
    scores.hold += 1;
  }

  if (secondary === "explore") {
    scores.test_next += 1;
  } else if (secondary === "prune") {
    scores.prune += 1;
  } else if (secondary === "compound") {
    scores.scale += 1;
  } else if (secondary === "coordinate") {
    scores.reallocate += 1;
  }

  return scores;
}

function applyMediaHeuristics(scores: Record<MediaRecommendedAction, number>, input: MediaDecisionInput): string[] {
  const rationale: string[] = [];
  const hasExpansionGap = textHints(input.missing_information, ["expansion", "inventory", "coverage", "new cohort"]);

  if (input.tracking_confidence === "low") {
    scores.diagnose += 4;
    scores.hold += 1;
    rationale.push("Tracking confidence is low, so measurement integrity must be stabilized first.");
  }

  if (input.signal_quality === "low") {
    scores.explore += 2;
    scores.test_next += 2;
    rationale.push("Signal quality is low, so controlled discovery or next-step testing is favored.");
  }

  if (input.cpl_vs_target <= 0.85 && input.saturation_risk !== "high") {
    scores.scale += 3;
    rationale.push("CPL is materially better than target with acceptable saturation risk.");
  } else if (input.cpl_vs_target >= 1.15) {
    scores.prune += 2;
    scores.reallocate += 2;
    rationale.push("CPL is above target, favoring branch elimination or budget shifts.");
  }

  if (input.cpc_trend > 0.12 && input.ctr_trend < -0.05) {
    scores.diagnose += 2;
    scores.prune += 1;
    rationale.push("Rising CPC with declining CTR suggests creative or audience fatigue diagnostics.");
  }

  if (input.budget_utilization >= 0.95 && input.primary_goal === "scale") {
    scores.reallocate += 2;
    rationale.push("Budget is near fully utilized, so scaling likely requires reallocating spend.");
  }

  if (
    input.channel === "google" &&
    input.intent_layer === "brand" &&
    input.primary_goal === "scale" &&
    input.cpl_vs_target <= 0.9 &&
    input.budget_utilization >= 0.9 &&
    input.conversion_volume <= 45 &&
    (hasExpansionGap || input.signal_quality !== "high")
  ) {
    scores.explore += 4;
    scores.test_next += 3;
    scores.scale -= 3;
    rationale.push("Brand search is efficient but capped, so expansion design should be explored before broad scale.");
  }

  if (input.primary_goal === "learning") {
    scores.test_next += 2;
    scores.explore += 1;
    rationale.push("Primary goal is learning, so test_next and explore actions get preference.");
  } else if (input.primary_goal === "cleanup") {
    scores.prune += 1;
    if (input.entity_level === "account" || input.entity_level === "campaign") {
      scores.reallocate += 3;
      rationale.push("Cleanup at broader entity scope usually needs spend and structure reallocation before hard cuts.");
    }
    if (
      input.entity_level === "account" &&
      input.budget_utilization >= 0.9 &&
      input.cpl_vs_target >= 1.1 &&
      input.signal_quality !== "low"
    ) {
      scores.reallocate += 2;
      scores.prune -= 1;
      rationale.push("Fragmented high-spend account cleanup favors budget reallocation before aggressive branch removal.");
    }
    scores.diagnose += 1;
    rationale.push("Primary goal is cleanup, favoring narrow remediation and diagnostics.");
  } else if (input.primary_goal === "recovery") {
    scores.hold += 2;
    scores.diagnose += 2;
    rationale.push("Recovery mode prefers containment and diagnostics before aggressive scaling.");
  }

  if (input.entity_level === "account" || input.entity_level === "campaign") {
    scores.reallocate += 1;
  } else if (input.entity_level === "ad" || input.entity_level === "creative") {
    scores.test_next += 1;
    scores.prune += 1;
  }

  return rationale;
}

function calibrateActionConfidence(
  input: MediaDecisionInput,
  action: MediaRecommendedAction,
  regimeConfidence: number,
  margin: number,
): number {
  let confidence = regimeConfidence * 0.55 + Math.max(0, margin) * 0.06;
  const hasExpansionGap = textHints(input.missing_information, ["expansion", "inventory", "coverage", "new cohort"]);

  if (input.signal_quality === "high" && input.tracking_confidence === "high") {
    confidence += 0.12;
  } else if (input.signal_quality === "low" || input.tracking_confidence === "low") {
    confidence -= 0.1;
  }

  if ((action === "prune" || action === "scale") && input.conversion_volume >= 50) {
    confidence += 0.08;
  }

  if (
    action === "prune" &&
    input.cpl_vs_target >= 1.3 &&
    input.signal_quality === "high" &&
    input.tracking_confidence === "high" &&
    input.conversion_volume >= 60
  ) {
    confidence += 0.14;
  }

  if (
    action === "explore" &&
    input.intent_layer === "brand" &&
    input.primary_goal === "scale" &&
    input.budget_utilization >= 0.9 &&
    input.cpl_vs_target <= 0.9 &&
    (hasExpansionGap || input.signal_quality !== "high")
  ) {
    confidence = Math.max(confidence, 0.5);
  }

  if (action === "test_next" && input.primary_goal === "learning" && input.signal_quality === "medium") {
    confidence = Math.max(confidence, 0.5);
  }

  if (action === "explore" || action === "test_next" || action === "reallocate") {
    confidence = Math.min(confidence, 0.69);
  }

  if (action === "diagnose" && input.tracking_confidence === "low") {
    confidence = Math.max(confidence, 0.52);
  }

  return clampConfidence(confidence);
}

export function recommendMediaAction(
  input: MediaDecisionInput,
  options: MediaDecisionRunOptions = {},
): MediaDecisionRecommendation {
  const inferredTerrain = inferTerrainFromMediaDecision(input);
  const regime = scoreTerrain(inferredTerrain, options.terrain_memory, options.terrain_memory_ablation);
  const scores = actionScoresFromRegime(regime.primary_regime, regime.secondary_regime);
  const rationale = options.disable_heuristics ? [] : applyMediaHeuristics(scores, input);

  const ranked = (Object.entries(scores) as Array<[MediaRecommendedAction, number]>).sort((a, b) => b[1] - a[1]);
  const top = ranked[0] ?? ["diagnose", 0];
  const second = ranked[1] ?? ["hold", 0];
  const margin = top[1] - second[1];

  const blockerList = input.blockers ?? [];
  const missing = input.missing_information ?? [];
  const blockerPenalty = Math.min(0.2, blockerList.length * 0.03 + missing.length * 0.02);
  const rawConfidence = options.disable_calibration
    ? clampConfidence(regime.confidence * 0.55)
    : calibrateActionConfidence(input, top[0], regime.confidence, margin);
  let actionConfidence = options.disable_calibration
    ? rawConfidence
    : clampConfidence(rawConfidence - blockerPenalty);
  actionConfidence = clampConfidence(actionConfidence - mediaV2ConfidenceAdjustment(input, options));

  if (top[0] === "scale" && input.cpl_vs_target <= 0.9) {
    rationale.push("Performance efficiency supports controlled scaling in the current winner path.");
  }
  if (top[0] === "test_next" && input.primary_goal === "learning") {
    rationale.push("Learning objective favors a constrained next experiment over immediate broad action.");
  }
  if (rationale.length < 2) {
    rationale.push(`Current routing aligns with ${regime.primary_regime} regime behavior under observed media signals.`);
  }

  return {
    recommended_action: top[0],
    action_confidence: actionConfidence,
    rationale,
    regime_alignment: {
      primary_regime: regime.primary_regime,
      secondary_regime: regime.secondary_regime,
      transition_candidate: regime.transition_candidate,
    },
    inferred_terrain: inferredTerrain,
    evidence_requirements: ACTION_EVIDENCE_REQUIREMENTS[top[0]],
    blockers: blockerList,
    missing_information: missing,
    ...buildMediaV2Attachment(input, top[0], options),
  };
}
