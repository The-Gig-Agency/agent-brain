export const FEEDBACK_LATENCIES = ["fast", "medium", "slow"] as const;
export const REVERSIBILITY_VALUES = ["high", "medium", "low"] as const;
export const UNCERTAINTY_VALUES = ["low", "medium", "high"] as const;
export const BRANCHING_FACTOR_VALUES = ["low", "medium", "high"] as const;
export const ADVERSARIALITY_VALUES = ["none", "some", "high"] as const;
export const RUGGEDNESS_VALUES = ["low", "medium", "high"] as const;
export const LOCAL_MINIMA_RISK_VALUES = ["low", "medium", "high"] as const;
export const INFORMATION_COST_VALUES = ["low", "medium", "high"] as const;
export const COORDINATION_LOAD_VALUES = ["low", "medium", "high"] as const;
export const ENVIRONMENT_STABILITY_VALUES = ["stable", "shifting"] as const;
export const TIME_HORIZON_VALUES = ["one_shot", "iterative"] as const;
export const MODE_PRESSURE_VALUES = [
  "explore",
  "prune",
  "compound",
  "escape",
  "coordinate",
  "create",
] as const;
export const SEARCH_REGIMES = ["prune", "explore", "compound", "coordinate"] as const;

export type FeedbackLatency = (typeof FEEDBACK_LATENCIES)[number];
export type Reversibility = (typeof REVERSIBILITY_VALUES)[number];
export type Uncertainty = (typeof UNCERTAINTY_VALUES)[number];
export type BranchingFactor = (typeof BRANCHING_FACTOR_VALUES)[number];
export type Adversariality = (typeof ADVERSARIALITY_VALUES)[number];
export type Ruggedness = (typeof RUGGEDNESS_VALUES)[number];
export type LocalMinimaRisk = (typeof LOCAL_MINIMA_RISK_VALUES)[number];
export type InformationCost = (typeof INFORMATION_COST_VALUES)[number];
export type CoordinationLoad = (typeof COORDINATION_LOAD_VALUES)[number];
export type EnvironmentStability = (typeof ENVIRONMENT_STABILITY_VALUES)[number];
export type TimeHorizon = (typeof TIME_HORIZON_VALUES)[number];
export type ModePressure = (typeof MODE_PRESSURE_VALUES)[number];
export type SearchRegime = (typeof SEARCH_REGIMES)[number];

export type TerrainProfile = {
  feedback_latency: FeedbackLatency;
  reversibility: Reversibility;
  uncertainty: Uncertainty;
  branching_factor: BranchingFactor;
  adversariality: Adversariality;
  ruggedness: Ruggedness;
  local_minima_risk: LocalMinimaRisk;
  information_cost: InformationCost;
  coordination_load: CoordinationLoad;
  environment_stability: EnvironmentStability;
  time_horizon: TimeHorizon;
  mode_pressure: ModePressure;
};

export type TerrainField = keyof TerrainProfile;

export type FieldConfidence = Partial<Record<TerrainField, number>>;

export type TerrainAssessment = {
  problem_summary: string;
  terrain_profile: TerrainProfile;
  field_confidence?: FieldConfidence;
  missing_information?: string[];
};

export type RegimeDefinition = {
  id: SearchRegime;
  name: string;
  description: string;
  failure_modes: string[];
  counter_regimes: SearchRegime[];
};

export type ScoreBreakdown = {
  regime: SearchRegime;
  score: number;
  reasons: string[];
};

export type RegimeRecommendation = {
  primary_regime: SearchRegime;
  secondary_regime: SearchRegime | null;
  opposing_regime: SearchRegime;
  confidence: number;
  breakdown: ScoreBreakdown[];
  transition_candidate: SearchRegime | null;
};

export type BenchmarkCase = {
  id: string;
  title: string;
  domain: "debugging" | "gtm" | "product" | "org" | "agent" | "career";
  summary: string;
  terrain: TerrainProfile;
  expected_primary: SearchRegime;
  acceptable_regimes: SearchRegime[];
  notes: string;
};
