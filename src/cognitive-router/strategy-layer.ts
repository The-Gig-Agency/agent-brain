import {
  SEARCH_REGIMES,
  type SearchRegime,
  type RegimeRecommendation,
  type TerrainProfile,
} from "./types.js";

export type StrategyFamilyId = "prune" | "explore" | "compound" | "coordinate";

export type AlgorithmDefinition = {
  id: string;
  name: string;
  family: StrategyFamilyId;
  description: string;
  best_for: string[];
  anti_pattern: string[];
};

export type StrategyFamilyDefinition = {
  id: StrategyFamilyId;
  name: string;
  description: string;
  operating_rules: string[];
  algorithms: string[];
};

export type StrategyRecommendation = {
  primary_regime: SearchRegime;
  secondary_regime: SearchRegime | null;
  opposing_regime: SearchRegime;
  strategy_family: StrategyFamilyId;
  primary_algorithm: string;
  secondary_algorithm: string | null;
  operating_rules: string[];
  rationale: string[];
  alternatives: string[];
  confidence: number;
};

const STRATEGY_FAMILIES: Record<StrategyFamilyId, StrategyFamilyDefinition> = {
  prune: {
    id: "prune",
    name: "Pruning And Elimination",
    description: "Reduce the search space and remove weak branches early.",
    operating_rules: [
      "Cut obvious losers quickly.",
      "Prefer evidence over intuition when the branch count is high.",
      "Stop broad exploration once the candidate set is narrow enough.",
    ],
    algorithms: ["branch_and_bound", "beam_search", "hypothesis_elimination", "threshold_ranking"],
  },
  explore: {
    id: "explore",
    name: "Exploratory Search",
    description: "Learn the terrain before committing hard.",
    operating_rules: [
      "Optimize for information gain first.",
      "Run small probes instead of large commitments.",
      "Treat uncertainty as a reason to sample, not stall.",
    ],
    algorithms: ["bayesian_optimization", "bandits", "active_learning", "perturb_and_test"],
  },
  compound: {
    id: "compound",
    name: "Exploitation And Compounding",
    description: "Double down on the strongest known path.",
    operating_rules: [
      "Keep the winning path moving.",
      "Increase depth only after signal is stable.",
      "Avoid reopening settled decisions unless the environment shifts.",
    ],
    algorithms: ["gradient_descent", "momentum", "curriculum_learning", "incremental_refinement"],
  },
  coordinate: {
    id: "coordinate",
    name: "Adversarial Or Multi-Agent Reasoning",
    description: "Explicitly model strategic actors, incentives, and interfaces.",
    operating_rules: [
      "Map actors and incentives before optimizing actions.",
      "Check second-order effects and responses.",
      "Use coordination-aware recommendations when multiple parties interact.",
    ],
    algorithms: ["game_theory", "mixture_of_experts", "multi_agent_planning", "protocol_design"],
  },
};

const ALGORITHMS: Record<string, AlgorithmDefinition> = {
  branch_and_bound: {
    id: "branch_and_bound",
    name: "Branch and Bound",
    family: "prune",
    description: "Search broadly, then eliminate branches whose bound is too weak.",
    best_for: ["high branching factor", "clear eliminators", "crowded search space"],
    anti_pattern: ["premature narrowing", "low-evidence pruning"],
  },
  beam_search: {
    id: "beam_search",
    name: "Beam Search",
    family: "prune",
    description: "Keep a fixed number of promising candidates and discard the rest.",
    best_for: ["many options", "need bounded exploration", "comparative ranking"],
    anti_pattern: ["over-trimming before signal forms"],
  },
  hypothesis_elimination: {
    id: "hypothesis_elimination",
    name: "Hypothesis Elimination",
    family: "prune",
    description: "Remove hypotheses contradicted by evidence.",
    best_for: ["debugging", "diagnosis", "stateful failure analysis"],
    anti_pattern: ["ignoring weak but important counterevidence"],
  },
  threshold_ranking: {
    id: "threshold_ranking",
    name: "Threshold Ranking",
    family: "prune",
    description: "Rank options and cut below a decision threshold.",
    best_for: ["list filtering", "scoring", "qualifying decisions"],
    anti_pattern: ["thresholds with weak calibration"],
  },
  bayesian_optimization: {
    id: "bayesian_optimization",
    name: "Bayesian Optimization",
    family: "explore",
    description: "Probe efficiently when feedback is sparse or costly.",
    best_for: ["unknown landscape", "few trials", "expensive feedback"],
    anti_pattern: ["rapid commitment in unstable terrain"],
  },
  bandits: {
    id: "bandits",
    name: "Bandits",
    family: "explore",
    description: "Balance exploration and exploitation across competing options.",
    best_for: ["A/B-like choice sets", "adaptive selection", "early experimentation"],
    anti_pattern: ["sticking to the first idea too long"],
  },
  active_learning: {
    id: "active_learning",
    name: "Active Learning",
    family: "explore",
    description: "Ask the most informative next question or test.",
    best_for: ["uncertainty reduction", "classification", "cheap targeted probes"],
    anti_pattern: ["asking broad questions when one sharp probe would do"],
  },
  perturb_and_test: {
    id: "perturb_and_test",
    name: "Perturb and Test",
    family: "explore",
    description: "Change one variable and observe the effect.",
    best_for: ["debugging", "sensitivity analysis", "root-cause isolation"],
    anti_pattern: ["changing too many things at once"],
  },
  gradient_descent: {
    id: "gradient_descent",
    name: "Gradient Descent",
    family: "compound",
    description: "Make incremental improvements along the strongest signal.",
    best_for: ["clear objective", "stable environment", "continuous improvement"],
    anti_pattern: ["trying to optimize a moving target as if it were fixed"],
  },
  momentum: {
    id: "momentum",
    name: "Momentum",
    family: "compound",
    description: "Carry forward useful progress and avoid oscillation.",
    best_for: ["execution depth", "repeated improvements", "building on wins"],
    anti_pattern: ["accelerating down a path after the signal has changed"],
  },
  curriculum_learning: {
    id: "curriculum_learning",
    name: "Curriculum Learning",
    family: "compound",
    description: "Solve easier subproblems first, then increase difficulty.",
    best_for: ["skill building", "process design", "layered adoption"],
    anti_pattern: ["starting with the hardest constraint first"],
  },
  incremental_refinement: {
    id: "incremental_refinement",
    name: "Incremental Refinement",
    family: "compound",
    description: "Refine the current path in small, compounding steps.",
    best_for: ["copy", "ops", "workflow tuning", "repeatable systems"],
    anti_pattern: ["thrashing the system with full resets"],
  },
  game_theory: {
    id: "game_theory",
    name: "Game Theory",
    family: "coordinate",
    description: "Reason explicitly about strategic actors and responses.",
    best_for: ["incentives", "negotiation", "competitive environments"],
    anti_pattern: ["treating strategic players like passive variables"],
  },
  mixture_of_experts: {
    id: "mixture_of_experts",
    name: "Mixture of Experts",
    family: "coordinate",
    description: "Route subproblems to specialized experts.",
    best_for: ["multi-skill systems", "specialized subdomains", "mixed workloads"],
    anti_pattern: ["forcing one monolith to handle everything"],
  },
  multi_agent_planning: {
    id: "multi_agent_planning",
    name: "Multi-Agent Planning",
    family: "coordinate",
    description: "Plan with multiple actors, dependencies, and handoffs in view.",
    best_for: ["team workflows", "handoffs", "distributed execution"],
    anti_pattern: ["ignoring interface friction"],
  },
  protocol_design: {
    id: "protocol_design",
    name: "Protocol Design",
    family: "coordinate",
    description: "Define communication and decision rules between actors.",
    best_for: ["governance", "collaboration rules", "workflow design"],
    anti_pattern: ["assuming cooperation without explicit structure"],
  },
};

const REGIME_TO_FAMILY: Record<SearchRegime, StrategyFamilyId> = {
  prune: "prune",
  explore: "explore",
  compound: "compound",
  coordinate: "coordinate",
};

const SDR_SURFACE_DEFAULTS: Record<string, { primary: SearchRegime; secondary: SearchRegime | null }> = {
  icp_definition: { primary: "explore", secondary: "prune" },
  list_building: { primary: "prune", secondary: null },
  enrichment: { primary: "prune", secondary: null },
  message_drafting: { primary: "compound", secondary: null },
  sequence_design: { primary: "explore", secondary: "compound" },
  objection_handling: { primary: "coordinate", secondary: null },
  pipeline_review: { primary: "prune", secondary: "coordinate" },
  territory_segmentation: { primary: "explore", secondary: "prune" },
};

function pickAlgorithm(family: StrategyFamilyId, preferredIndex = 0): string {
  const algorithms = STRATEGY_FAMILIES[family].algorithms;
  return algorithms[Math.min(preferredIndex, algorithms.length - 1)]!;
}

export function getStrategyFamilies(): StrategyFamilyDefinition[] {
  return Object.values(STRATEGY_FAMILIES);
}

export function getAlgorithmRegistry(): AlgorithmDefinition[] {
  return Object.values(ALGORITHMS);
}

export function getSdrSurfaceDefaults() {
  return { ...SDR_SURFACE_DEFAULTS };
}

export function buildStrategyRecommendation(recommendation: RegimeRecommendation): StrategyRecommendation {
  const family = REGIME_TO_FAMILY[recommendation.primary_regime];
  const secondaryFamily = recommendation.secondary_regime ? REGIME_TO_FAMILY[recommendation.secondary_regime] : null;
  const primaryAlgorithm = pickAlgorithm(family, 0);
  const secondaryAlgorithm = secondaryFamily ? pickAlgorithm(secondaryFamily, 0) : null;

  const rationale = [
    `primary_regime=${recommendation.primary_regime}`,
    `secondary_regime=${recommendation.secondary_regime ?? "none"}`,
    `opposing_regime=${recommendation.opposing_regime}`,
  ];

  const alternatives = recommendation.breakdown
    .filter((entry) => entry.regime !== recommendation.primary_regime)
    .slice(0, 2)
    .map((entry) => `${entry.regime}: ${entry.reasons[0] ?? "lower score"}`);

  return {
    primary_regime: recommendation.primary_regime,
    secondary_regime: recommendation.secondary_regime,
    opposing_regime: recommendation.opposing_regime,
    strategy_family: family,
    primary_algorithm: primaryAlgorithm,
    secondary_algorithm: secondaryAlgorithm,
    operating_rules: STRATEGY_FAMILIES[family].operating_rules,
    rationale,
    alternatives,
    confidence: recommendation.confidence,
  };
}

export function recommendStrategyForSurface(surface: string) {
  const key = surface.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return SDR_SURFACE_DEFAULTS[key] ?? null;
}

export function explainStrategyRecommendation(recommendation: StrategyRecommendation): string[] {
  const primary = ALGORITHMS[recommendation.primary_algorithm];
  const secondary = recommendation.secondary_algorithm ? ALGORITHMS[recommendation.secondary_algorithm] : null;
  const rules = [...recommendation.operating_rules];

  if (primary) {
    rules.unshift(primary.description);
  }
  if (secondary) {
    rules.push(`Counter-lens: ${secondary.name} (${secondary.description})`);
  }

  return rules;
}

export function isKnownSurface(surface: string): boolean {
  const key = surface.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return key in SDR_SURFACE_DEFAULTS;
}
