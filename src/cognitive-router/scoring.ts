import {
  SEARCH_REGIMES,
  type FieldConfidence,
  type MemoryScoringContext,
  type RegimeDefinition,
  type RegimeRecommendation,
  type SearchRegime,
  type TerrainAssessment,
  type TerrainProfile,
} from "./types.js";

type DimensionWeightTable = Partial<
  Record<keyof TerrainProfile, Partial<Record<string, Partial<Record<SearchRegime, number>>>>>
>;

type TransitionRule = {
  candidate: SearchRegime;
  when: (profile: TerrainProfile, topRegime: SearchRegime) => boolean;
};

const REGIME_DEFINITIONS: Record<SearchRegime, RegimeDefinition> = {
  prune: {
    id: "prune",
    name: "Pruning And Elimination",
    description: "Narrow a crowded search space and remove weak branches quickly.",
    failure_modes: ["Over-prunes before enough evidence exists."],
    counter_regimes: ["explore", "compound"],
  },
  explore: {
    id: "explore",
    name: "Exploratory Search",
    description: "Prioritize learning and information gain before converging.",
    failure_modes: ["Keeps searching after signal is already good enough."],
    counter_regimes: ["compound", "prune"],
  },
  compound: {
    id: "compound",
    name: "Exploitation And Compounding",
    description: "Deepen investment in the strongest known path.",
    failure_modes: ["Doubles down too long after the environment changes."],
    counter_regimes: ["explore", "coordinate"],
  },
  coordinate: {
    id: "coordinate",
    name: "Adversarial Or Multi-Agent Reasoning",
    description: "Model incentives, interfaces, and strategic actors explicitly.",
    failure_modes: ["Over-strategizes instead of learning or executing."],
    counter_regimes: ["explore", "prune"],
  },
};

const DIMENSION_WEIGHTS: DimensionWeightTable = {
  feedback_latency: {
    fast: { explore: 2, prune: 1 },
    medium: { explore: 1, prune: 1, compound: 1 },
    slow: { coordinate: 1, compound: -1, explore: -1 },
  },
  reversibility: {
    high: { explore: 2, prune: 1 },
    medium: { prune: 1, compound: 1 },
    low: { compound: -2, coordinate: 1, prune: 1 },
  },
  uncertainty: {
    low: { compound: 2, prune: 1, explore: -1 },
    medium: { prune: 2, explore: 1, coordinate: 1 },
    high: { explore: 3, coordinate: 1, compound: -2 },
  },
  branching_factor: {
    low: { compound: 2, coordinate: 1 },
    medium: { explore: 1, prune: 1, compound: 1 },
    high: { prune: 3, explore: 2, compound: -1 },
  },
  adversariality: {
    none: { compound: 1, prune: 1 },
    some: { coordinate: 2, prune: 1 },
    high: { coordinate: 4, compound: -1 },
  },
  ruggedness: {
    low: { compound: 2, prune: 1 },
    medium: { explore: 1, prune: 1, coordinate: 1 },
    high: { explore: 2, coordinate: 1, compound: -1 },
  },
  local_minima_risk: {
    low: { compound: 1, prune: 1 },
    medium: { explore: 1, prune: 1 },
    high: { explore: 2, compound: -1 },
  },
  information_cost: {
    low: { explore: 2, prune: 1 },
    medium: { explore: 1, prune: 1 },
    high: { compound: 1, coordinate: 1, explore: -2 },
  },
  coordination_load: {
    low: { compound: 1, prune: 1 },
    medium: { coordinate: 2, prune: 1 },
    high: { coordinate: 3, compound: -1 },
  },
  environment_stability: {
    stable: { compound: 2, prune: 1 },
    shifting: { explore: 1, coordinate: 1, compound: -1 },
  },
  time_horizon: {
    one_shot: { prune: 1, coordinate: 1, explore: -1 },
    iterative: { explore: 2, compound: 1 },
  },
  mode_pressure: {
    explore: { explore: 4 },
    prune: { prune: 4 },
    compound: { compound: 4 },
    escape: { explore: 2, prune: 1, compound: -1 },
    coordinate: { coordinate: 4 },
    create: { explore: 2, prune: -1, compound: -1 },
  },
};

const TRANSITION_RULES: TransitionRule[] = [
  {
    candidate: "prune",
    when: (profile, topRegime) =>
      topRegime === "explore" &&
      profile.uncertainty !== "high" &&
      profile.branching_factor === "high",
  },
  {
    candidate: "compound",
    when: (profile, topRegime) =>
      topRegime === "prune" &&
      profile.uncertainty === "low" &&
      profile.environment_stability === "stable",
  },
  {
    candidate: "explore",
    when: (profile, topRegime) =>
      topRegime === "compound" &&
      (profile.environment_stability === "shifting" || profile.local_minima_risk === "high"),
  },
  {
    candidate: "coordinate",
    when: (profile, topRegime) =>
      topRegime !== "coordinate" &&
      (profile.adversariality === "high" || profile.coordination_load === "high"),
  },
];

function createEmptyScoreMap(): Record<SearchRegime, number> {
  return {
    prune: 0,
    explore: 0,
    compound: 0,
    coordinate: 0,
  };
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function averageFieldConfidence(fieldConfidence?: FieldConfidence): number {
  if (!fieldConfidence) {
    return 1;
  }

  const values = Object.values(fieldConfidence);
  if (values.length === 0) {
    return 1;
  }

  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
}

export function getRegimeDefinitions(): RegimeDefinition[] {
  return SEARCH_REGIMES.map((regime) => REGIME_DEFINITIONS[regime]);
}

function applyMemoryAdjustments(
  scores: Record<SearchRegime, number>,
  reasons: Record<SearchRegime, string[]>,
  context?: MemoryScoringContext,
) {
  if (!context) {
    return;
  }

  if ((context.repeated_failed_path_count ?? 0) > 0) {
    scores.explore += 1;
    scores.compound -= 1;
    reasons.explore.push("memory: repeated_failed_path_count (+1)");
    reasons.compound.push("memory: repeated_failed_path_count (-1)");
  }

  if ((context.disproven_family_count ?? 0) >= 2) {
    scores.prune += 2;
    reasons.prune.push("memory: disproven_family_count (+2)");
  }

  if ((context.strong_signal_family_count ?? 0) >= 1) {
    scores.compound += 2;
    scores.explore -= 1;
    reasons.compound.push("memory: strong_signal_family_count (+2)");
    reasons.explore.push("memory: strong_signal_family_count (-1)");
  }

  if (context.drift_detected) {
    scores.explore += 1;
    scores.compound -= 1;
    reasons.explore.push("memory: drift_detected (+1)");
    reasons.compound.push("memory: drift_detected (-1)");
  }
}

export function scoreTerrain(profile: TerrainProfile, context?: MemoryScoringContext): RegimeRecommendation {
  const scores = createEmptyScoreMap();
  const reasons: Record<SearchRegime, string[]> = {
    prune: [],
    explore: [],
    compound: [],
    coordinate: [],
  };

  for (const field of Object.keys(DIMENSION_WEIGHTS) as (keyof TerrainProfile)[]) {
    const fieldWeights = DIMENSION_WEIGHTS[field];
    if (!fieldWeights) {
      continue;
    }

    const fieldValue = profile[field];
    const appliedWeights = fieldWeights[fieldValue];
    if (!appliedWeights) {
      continue;
    }

    for (const regime of SEARCH_REGIMES) {
      const weight = appliedWeights[regime];
      if (!weight) {
        continue;
      }

      scores[regime] += weight;
      reasons[regime].push(`${field}=${String(fieldValue)} (${weight > 0 ? "+" : ""}${weight})`);
    }
  }

  applyMemoryAdjustments(scores, reasons, context);

  const breakdown = SEARCH_REGIMES.map((regime) => ({
    regime,
    score: scores[regime],
    reasons: reasons[regime],
  })).sort((left, right) => right.score - left.score);

  const primary = breakdown[0]?.regime ?? "explore";
  const secondary = breakdown[1]?.regime ?? null;
  const opposing = REGIME_DEFINITIONS[primary].counter_regimes[0] ?? "explore";
  const transition =
    TRANSITION_RULES.find((rule) => rule.when(profile, primary) && rule.candidate !== primary)?.candidate ?? null;

  const topScore = breakdown[0]?.score ?? 0;
  const secondScore = breakdown[1]?.score ?? 0;
  const margin = topScore - secondScore;
  const confidence = clampConfidence(0.4 + Math.max(0, margin) * 0.08);

  return {
    primary_regime: primary,
    secondary_regime: secondary,
    opposing_regime: opposing,
    confidence,
    breakdown,
    transition_candidate: transition,
  };
}

export function recommendRegime(assessment: TerrainAssessment): RegimeRecommendation {
  const baseRecommendation = scoreTerrain(assessment.terrain_profile);
  const confidenceAdjustment = averageFieldConfidence(assessment.field_confidence);

  return {
    ...baseRecommendation,
    confidence: clampConfidence(baseRecommendation.confidence * confidenceAdjustment),
  };
}
