import {
  SEARCH_REGIMES,
  type SearchRegime,
  type RegimeRecommendation,
} from "./types.js";

export type StrategyFamilyId =
  | "prune_broad_discovery"
  | "prune_threshold_filtering"
  | "explore_hypothesis_search"
  | "explore_probe_learning"
  | "compound_incremental_refinement"
  | "compound_execution_momentum"
  | "coordinate_multi_actor_planning"
  | "coordinate_protocol_design";

export type StrategyParameterDefinition = {
  name: string;
  type: "number" | "integer" | "string" | "boolean" | "enum";
  required: boolean;
  description: string;
  allowed_values?: string[];
  default?: string | number | boolean;
};

export type AlgorithmDefinition = {
  id: string;
  name: string;
  family: StrategyFamilyId;
  description: string;
  best_for: string[];
  anti_pattern: string[];
  parameter_schema: StrategyParameterDefinition[];
};

export type StrategyFamilyDefinition = {
  id: StrategyFamilyId;
  regime: SearchRegime;
  name: string;
  description: string;
  operating_rules: string[];
  algorithms: string[];
  parameter_schema: StrategyParameterDefinition[];
};

export type RecommendationPath = {
  primary_regime: SearchRegime;
  secondary_regime: SearchRegime | null;
  opposing_regime: SearchRegime;
  strategy_family: StrategyFamilyId;
  primary_algorithm: string;
  secondary_algorithm: string | null;
  operating_rules: string[];
  rationale: string[];
  confidence: number;
};

export type RecommendationAlternative = RecommendationPath & {
  reason: string;
};

export type StrategyRecommendation = RecommendationPath & {
  alternatives: RecommendationAlternative[];
};

const PRUNE_BROAD_DISCOVERY_SCHEMA: StrategyParameterDefinition[] = [
  { name: "candidate_width", type: "integer", required: true, description: "How many branches or candidates to retain while widening the funnel." },
  { name: "keep_signal_floor", type: "number", required: false, description: "Minimum evidence score needed to keep a branch alive.", default: 0.4 },
];

const PRUNE_THRESHOLD_FILTERING_SCHEMA: StrategyParameterDefinition[] = [
  { name: "cutoff_score", type: "number", required: true, description: "Threshold below which a path is eliminated." },
  { name: "min_supporting_signals", type: "integer", required: false, description: "Supporting signals required before pruning is considered safe.", default: 2 },
];

const EXPLORE_HYPOTHESIS_SEARCH_SCHEMA: StrategyParameterDefinition[] = [
  { name: "hypothesis_budget", type: "integer", required: true, description: "Number of candidate hypotheses to test." },
  { name: "novelty_weight", type: "number", required: false, description: "Preference for distinct probes over nearby variants.", default: 0.6 },
];

const EXPLORE_PROBE_LEARNING_SCHEMA: StrategyParameterDefinition[] = [
  { name: "probe_budget", type: "integer", required: true, description: "Number of targeted probes to run before deciding." },
  { name: "expected_information_gain", type: "number", required: false, description: "Target gain required for another probe.", default: 0.7 },
];

const COMPOUND_INCREMENTAL_REFINEMENT_SCHEMA: StrategyParameterDefinition[] = [
  { name: "step_size", type: "number", required: false, description: "Magnitude of each refinement step.", default: 0.1 },
  { name: "stability_required", type: "boolean", required: true, description: "Whether conditions must be stable before deepening." },
];

const COMPOUND_EXECUTION_MOMENTUM_SCHEMA: StrategyParameterDefinition[] = [
  { name: "momentum_window", type: "integer", required: true, description: "Number of consecutive wins or stable steps to preserve." },
  { name: "course_correction_threshold", type: "number", required: false, description: "Signal drop that should trigger a recalibration.", default: 0.3 },
];

const COORDINATE_MULTI_ACTOR_PLANNING_SCHEMA: StrategyParameterDefinition[] = [
  { name: "actor_count", type: "integer", required: true, description: "Number of distinct actors or interfaces in play." },
  { name: "coordination_load", type: "string", required: false, description: "Primary coordination bottleneck.", allowed_values: ["low", "medium", "high"] },
];

const COORDINATE_PROTOCOL_DESIGN_SCHEMA: StrategyParameterDefinition[] = [
  { name: "protocol_strictness", type: "enum", required: true, description: "How prescriptive the interaction rules should be.", allowed_values: ["loose", "balanced", "strict"] },
  { name: "failure_mode_guardrails", type: "boolean", required: false, description: "Whether to explicitly define fallback behavior.", default: true },
];

const STRATEGY_FAMILIES: Record<StrategyFamilyId, StrategyFamilyDefinition> = {
  prune_broad_discovery: { id: "prune_broad_discovery", regime: "prune", name: "Broad Discovery Pruning", description: "Start wide, then cull weak branches without collapsing the search too early.", operating_rules: ["Retain enough breadth to avoid blind pruning.", "Use evidence floors, not gut feel.", "Prefer pruning after a meaningful sample exists."], algorithms: ["branch_and_bound", "beam_search"], parameter_schema: PRUNE_BROAD_DISCOVERY_SCHEMA },
  prune_threshold_filtering: { id: "prune_threshold_filtering", regime: "prune", name: "Threshold Filtering", description: "Apply hard cutoffs when the evidence is already strong enough.", operating_rules: ["Set a clean cutoff.", "Prune decisively when signals are clear.", "Do not keep dead weight for sentiment."], algorithms: ["hypothesis_elimination", "threshold_ranking"], parameter_schema: PRUNE_THRESHOLD_FILTERING_SCHEMA },
  explore_hypothesis_search: { id: "explore_hypothesis_search", regime: "explore", name: "Hypothesis Search", description: "Generate competing explanations and compare them actively.", operating_rules: ["Prefer distinct hypotheses over tiny variants.", "Keep probes cheap and targeted.", "Stop when the next test is low value."], algorithms: ["active_learning", "perturb_and_test"], parameter_schema: EXPLORE_HYPOTHESIS_SEARCH_SCHEMA },
  explore_probe_learning: { id: "explore_probe_learning", regime: "explore", name: "Probe Learning", description: "Use structured tests to learn quickly in uncertain terrain.", operating_rules: ["Spend budget on the most informative probe.", "Bias toward signal gain.", "Treat uncertainty as a prompt to sample."], algorithms: ["bayesian_optimization", "bandits"], parameter_schema: EXPLORE_PROBE_LEARNING_SCHEMA },
  compound_incremental_refinement: { id: "compound_incremental_refinement", regime: "compound", name: "Incremental Refinement", description: "Improve the current path in small, compounding steps.", operating_rules: ["Keep the winning path moving.", "Prefer small safe improvements.", "Avoid unnecessary resets."], algorithms: ["incremental_refinement", "gradient_descent"], parameter_schema: COMPOUND_INCREMENTAL_REFINEMENT_SCHEMA },
  compound_execution_momentum: { id: "compound_execution_momentum", regime: "compound", name: "Execution Momentum", description: "Preserve forward motion once the path is working.", operating_rules: ["Protect momentum once validated.", "Correct only when signal clearly degrades.", "Avoid oscillation between options."], algorithms: ["momentum", "curriculum_learning"], parameter_schema: COMPOUND_EXECUTION_MOMENTUM_SCHEMA },
  coordinate_multi_actor_planning: { id: "coordinate_multi_actor_planning", regime: "coordinate", name: "Multi-Actor Planning", description: "Reason across actors, dependencies, and handoffs.", operating_rules: ["Map actors before acting.", "Model second-order effects.", "Prefer plans that survive interface friction."], algorithms: ["multi_agent_planning", "mixture_of_experts"], parameter_schema: COORDINATE_MULTI_ACTOR_PLANNING_SCHEMA },
  coordinate_protocol_design: { id: "coordinate_protocol_design", regime: "coordinate", name: "Protocol Design", description: "Define the rules of coordination explicitly.", operating_rules: ["Make decision rules explicit.", "Document fallback behavior.", "Optimize the protocol, not just the outcome."], algorithms: ["game_theory", "protocol_design"], parameter_schema: COORDINATE_PROTOCOL_DESIGN_SCHEMA },
};

const ALGORITHMS: Record<string, AlgorithmDefinition> = {
  branch_and_bound: { id: "branch_and_bound", name: "Branch and Bound", family: "prune_broad_discovery", description: "Search broadly, then eliminate branches whose bound is too weak.", best_for: ["high branching factor", "clear eliminators"], anti_pattern: ["premature narrowing"], parameter_schema: PRUNE_BROAD_DISCOVERY_SCHEMA },
  beam_search: { id: "beam_search", name: "Beam Search", family: "prune_broad_discovery", description: "Keep a fixed number of promising candidates and discard the rest.", best_for: ["many options", "bounded exploration"], anti_pattern: ["over-trimming before signal forms"], parameter_schema: PRUNE_BROAD_DISCOVERY_SCHEMA },
  hypothesis_elimination: { id: "hypothesis_elimination", name: "Hypothesis Elimination", family: "prune_threshold_filtering", description: "Remove hypotheses contradicted by evidence.", best_for: ["debugging", "diagnosis"], anti_pattern: ["ignoring weak counterevidence"], parameter_schema: PRUNE_THRESHOLD_FILTERING_SCHEMA },
  threshold_ranking: { id: "threshold_ranking", name: "Threshold Ranking", family: "prune_threshold_filtering", description: "Rank options and cut below a decision threshold.", best_for: ["list filtering", "scoring"], anti_pattern: ["weak calibration"], parameter_schema: PRUNE_THRESHOLD_FILTERING_SCHEMA },
  active_learning: { id: "active_learning", name: "Active Learning", family: "explore_hypothesis_search", description: "Ask the most informative next question or test.", best_for: ["uncertainty reduction", "cheap probes"], anti_pattern: ["asking broad questions when one sharp probe would do"], parameter_schema: EXPLORE_HYPOTHESIS_SEARCH_SCHEMA },
  perturb_and_test: { id: "perturb_and_test", name: "Perturb and Test", family: "explore_hypothesis_search", description: "Change one variable and observe the effect.", best_for: ["debugging", "sensitivity analysis"], anti_pattern: ["changing too many things at once"], parameter_schema: EXPLORE_HYPOTHESIS_SEARCH_SCHEMA },
  bayesian_optimization: { id: "bayesian_optimization", name: "Bayesian Optimization", family: "explore_probe_learning", description: "Probe efficiently when feedback is sparse or costly.", best_for: ["unknown landscape", "few trials"], anti_pattern: ["rapid commitment in unstable terrain"], parameter_schema: EXPLORE_PROBE_LEARNING_SCHEMA },
  bandits: { id: "bandits", name: "Bandits", family: "explore_probe_learning", description: "Balance exploration and exploitation across competing options.", best_for: ["adaptive selection", "early experimentation"], anti_pattern: ["sticking to the first idea too long"], parameter_schema: EXPLORE_PROBE_LEARNING_SCHEMA },
  incremental_refinement: { id: "incremental_refinement", name: "Incremental Refinement", family: "compound_incremental_refinement", description: "Refine the current path in small, compounding steps.", best_for: ["copy", "ops", "workflow tuning"], anti_pattern: ["thrashing the system with full resets"], parameter_schema: COMPOUND_INCREMENTAL_REFINEMENT_SCHEMA },
  gradient_descent: { id: "gradient_descent", name: "Gradient Descent", family: "compound_incremental_refinement", description: "Make incremental improvements along the strongest signal.", best_for: ["clear objective", "stable environment"], anti_pattern: ["optimizing a moving target as if it were fixed"], parameter_schema: COMPOUND_INCREMENTAL_REFINEMENT_SCHEMA },
  momentum: { id: "momentum", name: "Momentum", family: "compound_execution_momentum", description: "Carry forward useful progress and avoid oscillation.", best_for: ["execution depth", "repeated improvements"], anti_pattern: ["accelerating after the signal has changed"], parameter_schema: COMPOUND_EXECUTION_MOMENTUM_SCHEMA },
  curriculum_learning: { id: "curriculum_learning", name: "Curriculum Learning", family: "compound_execution_momentum", description: "Solve easier subproblems first, then increase difficulty.", best_for: ["skill building", "layered adoption"], anti_pattern: ["starting with the hardest constraint first"], parameter_schema: COMPOUND_EXECUTION_MOMENTUM_SCHEMA },
  multi_agent_planning: { id: "multi_agent_planning", name: "Multi-Agent Planning", family: "coordinate_multi_actor_planning", description: "Plan with multiple actors, dependencies, and handoffs in view.", best_for: ["team workflows", "handoffs"], anti_pattern: ["ignoring interface friction"], parameter_schema: COORDINATE_MULTI_ACTOR_PLANNING_SCHEMA },
  mixture_of_experts: { id: "mixture_of_experts", name: "Mixture of Experts", family: "coordinate_multi_actor_planning", description: "Route subproblems to specialized experts.", best_for: ["multi-skill systems", "mixed workloads"], anti_pattern: ["forcing one monolith to handle everything"], parameter_schema: COORDINATE_MULTI_ACTOR_PLANNING_SCHEMA },
  game_theory: { id: "game_theory", name: "Game Theory", family: "coordinate_protocol_design", description: "Reason explicitly about strategic actors and responses.", best_for: ["incentives", "negotiation"], anti_pattern: ["treating strategic players like passive variables"], parameter_schema: COORDINATE_PROTOCOL_DESIGN_SCHEMA },
  protocol_design: { id: "protocol_design", name: "Protocol Design", family: "coordinate_protocol_design", description: "Define communication and decision rules between actors.", best_for: ["governance", "collaboration rules"], anti_pattern: ["assuming cooperation without explicit structure"], parameter_schema: COORDINATE_PROTOCOL_DESIGN_SCHEMA },
};

const FAMILY_BY_REGIME: Record<SearchRegime, StrategyFamilyId[]> = {
  prune: ["prune_broad_discovery", "prune_threshold_filtering"],
  explore: ["explore_hypothesis_search", "explore_probe_learning"],
  compound: ["compound_incremental_refinement", "compound_execution_momentum"],
  coordinate: ["coordinate_multi_actor_planning", "coordinate_protocol_design"],
};

const SDR_SURFACE_DEFAULTS: Record<string, { primary: SearchRegime; secondary: SearchRegime | null; family_index?: 0 | 1 }> = {
  icp_definition: { primary: "explore", secondary: "prune", family_index: 0 },
  list_building: { primary: "prune", secondary: null, family_index: 1 },
  enrichment: { primary: "prune", secondary: null, family_index: 1 },
  message_drafting: { primary: "compound", secondary: null, family_index: 0 },
  sequence_design: { primary: "explore", secondary: "compound", family_index: 0 },
  objection_handling: { primary: "coordinate", secondary: null, family_index: 1 },
  pipeline_review: { primary: "prune", secondary: "coordinate", family_index: 0 },
  territory_segmentation: { primary: "explore", secondary: "prune", family_index: 1 },
};

function pickFamily(regime: SearchRegime, preferredIndex = 0): StrategyFamilyId {
  const families = FAMILY_BY_REGIME[regime];
  return families[Math.min(preferredIndex, families.length - 1)]!;
}

function pickAlgorithm(family: StrategyFamilyId, preferredIndex = 0): string {
  const algorithms = STRATEGY_FAMILIES[family].algorithms;
  return algorithms[Math.min(preferredIndex, algorithms.length - 1)]!;
}

function buildPath(primary_regime: SearchRegime, secondary_regime: SearchRegime | null, family_index = 0, rationale: string[] = [], confidence = 0.6): RecommendationPath {
  const strategy_family = pickFamily(primary_regime, family_index);
  const secondaryFamily = secondary_regime ? pickFamily(secondary_regime, 0) : null;
  return {
    primary_regime,
    secondary_regime,
    opposing_regime: secondary_regime ?? primary_regime,
    strategy_family,
    primary_algorithm: pickAlgorithm(strategy_family, 0),
    secondary_algorithm: secondaryFamily ? pickAlgorithm(secondaryFamily, 0) : null,
    operating_rules: STRATEGY_FAMILIES[strategy_family].operating_rules,
    rationale,
    confidence,
  };
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
  const family = pickFamily(recommendation.primary_regime, 0);
  const secondaryFamily = recommendation.secondary_regime ? pickFamily(recommendation.secondary_regime, 0) : null;
  const rationale = [
    `primary_regime=${recommendation.primary_regime}`,
    `secondary_regime=${recommendation.secondary_regime ?? "none"}`,
    `opposing_regime=${recommendation.opposing_regime}`,
  ];

  const alternatives = recommendation.breakdown
    .filter((entry) => entry.regime !== recommendation.primary_regime)
    .slice(0, 2)
    .map((entry, index) => ({
      ...buildPath(entry.regime, null, index === 0 ? 0 : 1, [
        `alternative_regime=${entry.regime}`,
        `score=${entry.score}`,
      ], Math.max(0.2, recommendation.confidence - 0.15 * (index + 1))),
      reason: entry.reasons[0] ?? "lower score",
    }));

  return {
    primary_regime: recommendation.primary_regime,
    secondary_regime: recommendation.secondary_regime,
    opposing_regime: recommendation.opposing_regime,
    strategy_family: family,
    primary_algorithm: pickAlgorithm(family, 0),
    secondary_algorithm: secondaryFamily ? pickAlgorithm(secondaryFamily, 0) : null,
    operating_rules: STRATEGY_FAMILIES[family].operating_rules,
    rationale,
    alternatives,
    confidence: recommendation.confidence,
  };
}

export function recommendStrategyForSurface(surface: string) {
  const key = surface.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const match = SDR_SURFACE_DEFAULTS[key];
  if (!match) return null;
  const primary = buildPath(match.primary, match.secondary, match.family_index ?? 0, [
    `surface=${key}`,
    `primary_regime=${match.primary}`,
    `secondary_regime=${match.secondary ?? "none"}`,
  ], 0.6);

  const alternatives: RecommendationAlternative[] = [
    {
      ...buildPath(match.secondary ?? match.primary, null, 1, [`surface=${key}`, "fallback_counterpath"], 0.45),
      reason: "counterpath or fallback path",
    },
  ];

  return {
    ...primary,
    alternatives,
  } satisfies StrategyRecommendation;
}

export function explainStrategyRecommendation(recommendation: StrategyRecommendation): string[] {
  const primary = ALGORITHMS[recommendation.primary_algorithm];
  const secondary = recommendation.secondary_algorithm ? ALGORITHMS[recommendation.secondary_algorithm] : null;
  const rules = [...recommendation.operating_rules];

  if (primary) rules.unshift(primary.description);
  if (secondary) rules.push(`Counter-lens: ${secondary.name} (${secondary.description})`);
  return rules;
}

export function isKnownSurface(surface: string): boolean {
  const key = surface.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return key in SDR_SURFACE_DEFAULTS;
}
