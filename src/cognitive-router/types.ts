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

export type DebugFamily =
  | "dependency"
  | "version"
  | "test_flake"
  | "regression"
  | "env"
  | "secret_scope"
  | "cache"
  | "logic"
  | "validation"
  | "downstream_api"
  | "race"
  | "stale_state"
  | "retry_policy"
  | "outage"
  | "schema"
  | "serialization"
  | "permission"
  | "artifact"
  | "observability";

export type DebugActionKind = "inspect" | "fix" | "stabilize";

export type VisibleDebugAction = {
  id: string;
  label: string;
  family: DebugFamily;
  kind: DebugActionKind;
  cost: number;
};

export type DebugObservation = {
  id: string;
  text: string;
  family: DebugFamily;
  polarity: "positive" | "negative";
  strength: 1 | 2 | 3;
};

export type HiddenDebugActionEffect = {
  action_id: string;
  observations: DebugObservation[];
  success: boolean;
  retryable: boolean;
  signal_threshold?: number;
};

export type DebugVisibleInput = {
  case_id: string;
  title: string;
  prompt: string;
  terrain: TerrainProfile;
  budget: number;
  available_actions: VisibleDebugAction[];
};

export type DebugHiddenTruth = {
  root_cause: DebugFamily;
  effects: Record<string, HiddenDebugActionEffect>;
};

export type DebugEvalCase = {
  case_id: string;
  title: string;
  stratum: "train" | "holdout";
  input_context: DebugVisibleInput;
  hidden_truth: DebugHiddenTruth;
  expected_primary: SearchRegime;
  acceptable_regimes: SearchRegime[];
};

export type FailedPathRecord = {
  action_id: string;
  family: DebugFamily;
  reason: "failed_fix" | "negative_signal" | "budget_burn";
  count: number;
};

export type MemoryScoringContext = {
  repeated_failed_path_count?: number;
  disproven_family_count?: number;
  strong_signal_family_count?: number;
  drift_detected?: boolean;
};

export type RouterTraceEvent =
  | {
      type: "regime_selected";
      step: number;
      regime: SearchRegime;
      confidence: number;
      reasons: string[];
    }
  | {
      type: "action";
      step: number;
      action_id: string;
      label: string;
      family: DebugFamily;
      kind: DebugActionKind;
      repeated: boolean;
      cost: number;
    }
  | {
      type: "observation";
      step: number;
      observation: DebugObservation;
    }
  | {
      type: "failed_path";
      step: number;
      action_id: string;
      family: DebugFamily;
      reason: FailedPathRecord["reason"];
      count: number;
    }
  | {
      type: "transition";
      step: number;
      from: SearchRegime;
      to: SearchRegime;
      reason: string;
    }
  | {
      type: "drift_detected";
      step: number;
      regime: SearchRegime;
      reason: string;
    };

export type DebugRunResult = {
  case_id: string;
  title: string;
  policy_id: string;
  predicted_regime: SearchRegime;
  final_regime: SearchRegime;
  confidence: number;
  transition_recommendation: SearchRegime | null;
  success: boolean;
  total_cost: number;
  repeated_failed_paths: number;
  retries_before_success: number;
  transition_count: number;
  hysteresis_count: number;
  dead_end_persistence: number;
  false_convergence: boolean;
  action_count: number;
  trace: RouterTraceEvent[];
};

export type BaselinePolicyId =
  | "naive_retry"
  | "always_explore"
  | "always_prune"
  | "always_compound"
  | "fixed_heuristic"
  | "routed_policy";

export type DebuggingSuiteReport = {
  suite_id: string;
  generated_at: string;
  summary: {
    case_count: number;
    routed_success_rate: number;
    strongest_baseline_id: BaselinePolicyId | null;
    strongest_baseline_success_rate: number;
    routed_beats_strongest_baseline: boolean;
  };
  per_policy: Array<{
    policy_id: BaselinePolicyId;
    success_rate: number;
    average_cost: number;
    average_repeated_failed_paths: number;
    average_retries_before_success: number;
    average_transition_count: number;
    average_hysteresis_count: number;
    average_dead_end_persistence: number;
  }>;
  cases: Array<{
    case_id: string;
    routed: DebugRunResult;
    baselines: DebugRunResult[];
    pass: boolean;
  }>;
};

export type DebuggingCoreV01Report = {
  suite_id: string;
  generated_at: string;
  go_no_go: boolean;
  criteria: {
    routed_not_worse_than_fixed_heuristic_on_success: boolean;
    routed_beats_naive_retry_on_failed_paths: boolean;
    routed_beats_naive_retry_on_cost: boolean;
    routed_beats_always_compound_on_failed_paths: boolean;
  };
  summary: {
    case_count: number;
    routed_success_rate: number;
    fixed_heuristic_success_rate: number;
    routed_average_cost: number;
    naive_retry_average_cost: number;
    routed_average_repeated_failed_paths: number;
    naive_retry_average_repeated_failed_paths: number;
    always_compound_average_repeated_failed_paths: number;
    routed_average_hysteresis_count: number;
    routed_average_dead_end_persistence: number;
  };
  per_policy: Array<{
    policy_id: BaselinePolicyId;
    success_rate: number;
    average_cost: number;
    average_repeated_failed_paths: number;
    average_retries_before_success: number;
    average_transition_count: number;
    average_hysteresis_count: number;
    average_dead_end_persistence: number;
  }>;
  cases: Array<{
    case_id: string;
    routed: DebugRunResult;
    baselines: DebugRunResult[];
    diagnostics: {
      routed_first_three_actions: string[];
      fixed_heuristic_first_three_actions: string[];
      routed_cost_before_first_strong_signal: number | null;
      fixed_heuristic_cost_before_first_strong_signal: number | null;
    };
  }>;
};
