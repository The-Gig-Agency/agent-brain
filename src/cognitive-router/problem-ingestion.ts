import {
  ADVERSARIALITY_VALUES,
  BRANCHING_FACTOR_VALUES,
  COORDINATION_LOAD_VALUES,
  ENVIRONMENT_STABILITY_VALUES,
  FEEDBACK_LATENCIES,
  INFORMATION_COST_VALUES,
  LOCAL_MINIMA_RISK_VALUES,
  MODE_PRESSURE_VALUES,
  REVERSIBILITY_VALUES,
  RUGGEDNESS_VALUES,
  SEARCH_REGIMES,
  TIME_HORIZON_VALUES,
  UNCERTAINTY_VALUES,
  type TerrainAssessment,
  type TerrainProfile,
  type SearchRegime,
} from "./types.js";

export type ProblemIngestionInput = {
  problem_summary: string;
  context?: string;
  signals?: string[];
};

export type TerrainClarificationQuestion = {
  field: keyof TerrainProfile;
  question: string;
  why_it_matters: string;
};

export type ProblemIngestionResult = {
  assessment: TerrainAssessment;
  clarification_questions: TerrainClarificationQuestion[];
  regime_hint: SearchRegime;
};

const DEFAULT_TERRAIN: TerrainProfile = {
  feedback_latency: "medium",
  reversibility: "medium",
  uncertainty: "medium",
  branching_factor: "medium",
  adversariality: "some",
  ruggedness: "medium",
  local_minima_risk: "medium",
  information_cost: "medium",
  coordination_load: "medium",
  environment_stability: "stable",
  time_horizon: "iterative",
  mode_pressure: "explore",
};

const QUESTION_BANK: Record<keyof TerrainProfile, TerrainClarificationQuestion> = {
  feedback_latency: {
    field: "feedback_latency",
    question: "How quickly do you get usable feedback after a move?",
    why_it_matters: "Fast feedback favors prune/compound, slow feedback pushes exploration.",
  },
  reversibility: {
    field: "reversibility",
    question: "Can you undo this cheaply if the first move is wrong?",
    why_it_matters: "Low reversibility needs more caution and stronger pruning.",
  },
  uncertainty: {
    field: "uncertainty",
    question: "How much of the terrain is still unknown?",
    why_it_matters: "Higher uncertainty increases the value of probe-style exploration.",
  },
  branching_factor: {
    field: "branching_factor",
    question: "How many plausible paths are on the table right now?",
    why_it_matters: "More branches favors pruning and structured search.",
  },
  adversariality: {
    field: "adversariality",
    question: "Are other actors strategically responding to your moves?",
    why_it_matters: "Strategic opponents increase the need for coordinate thinking.",
  },
  ruggedness: {
    field: "ruggedness",
    question: "Does the problem have lots of traps, false starts, or local optima?",
    why_it_matters: "Rugged terrain benefits from explicit search and counter-lenses.",
  },
  local_minima_risk: {
    field: "local_minima_risk",
    question: "How likely are you to get stuck in a good-enough-but-wrong path?",
    why_it_matters: "High risk calls for exploration or branch-and-bound style thinking.",
  },
  information_cost: {
    field: "information_cost",
    question: "How expensive is it to learn the next useful fact?",
    why_it_matters: "High information cost rewards cheap, targeted probes.",
  },
  coordination_load: {
    field: "coordination_load",
    question: "How much handoff or multi-actor coordination is involved?",
    why_it_matters: "More coordination pushes toward multi-actor or protocol design.",
  },
  environment_stability: {
    field: "environment_stability",
    question: "Is the terrain stable, or is it shifting under you?",
    why_it_matters: "Shifting terrain reduces confidence in one-shot optimization.",
  },
  time_horizon: {
    field: "time_horizon",
    question: "Is this a one-shot decision or an iterative process?",
    why_it_matters: "Iterative work can compound; one-shot work needs higher upfront confidence.",
  },
  mode_pressure: {
    field: "mode_pressure",
    question: "Are you mostly exploring, pruning, compounding, escaping, or coordinating?",
    why_it_matters: "Mode pressure is the clearest signal for regime selection.",
  },
};

function clampQuestions(assessment: TerrainAssessment): TerrainClarificationQuestion[] {
  const missing = new Set(assessment.missing_information ?? []);
  return Object.values(QUESTION_BANK).filter((q) => missing.has(q.field) || (assessment.field_confidence?.[q.field] ?? 0) < 0.65).slice(0, 6);
}

function textBlob(input: ProblemIngestionInput): string {
  return [input.problem_summary, input.context ?? "", ...(input.signals ?? [])].join(" \n").toLowerCase();
}

function inferRegime(text: string): SearchRegime {
  const score: Record<SearchRegime, number> = { prune: 0, explore: 0, compound: 0, coordinate: 0 };
  const add = (regime: SearchRegime, n: number) => { score[regime] += n; };

  if (/debug|bug|error|broken|root cause|diagnos/.test(text)) add("prune", 3);
  if (/option|unknown|discover|research|experiment|hypothesis|probe/.test(text)) add("explore", 3);
  if (/draft|refine|iterate|copy|workflow|polish/.test(text)) add("compound", 3);
  if (/team|handoff|stakeholder|cross-functional|approve|align|coordinate/.test(text)) add("coordinate", 3);

  return SEARCH_REGIMES.reduce((best, regime) => (score[regime] > score[best] ? regime : best), "explore");
}

function inferTerrain(input: ProblemIngestionInput): TerrainProfile {
  const text = textBlob(input);
  const terrain = { ...DEFAULT_TERRAIN };

  if (/urgent|immediate|fast feedback|live|real-time/.test(text)) terrain.feedback_latency = "fast";
  if (/days|weeks|slow feedback|lagging/.test(text)) terrain.feedback_latency = "slow";
  if (/irreversible|hard to undo|can't undo|cannot undo/.test(text)) terrain.reversibility = "low";
  if (/cheap to revert|undo|rollback|reversible/.test(text)) terrain.reversibility = "high";
  if (/unknown|uncertain|not sure|ambiguous/.test(text)) terrain.uncertainty = "high";
  if (/many options|lots of paths|branch|menu/.test(text)) terrain.branching_factor = "high";
  if (/other team|competitor|strategic|negotiat|adversar/.test(text)) terrain.adversariality = "high";
  if (/traps|false start|local minimum|stuck|thrash/.test(text)) terrain.ruggedness = "high";
  if (/learn expensive|costly to test|expensive to learn|few shots/.test(text)) terrain.information_cost = "high";
  if (/handoff|multiple teams|cross-team|approval chain/.test(text)) terrain.coordination_load = "high";
  if (/changing|shifting|moving target|volatile/.test(text)) terrain.environment_stability = "shifting";
  if (/one-shot|single decision|once/.test(text)) terrain.time_horizon = "one_shot";
  if (/explore|discover|probe/.test(text)) terrain.mode_pressure = "explore";
  if (/prune|filter|eliminate/.test(text)) terrain.mode_pressure = "prune";
  if (/refine|iterate|improve|draft/.test(text)) terrain.mode_pressure = "compound";
  if (/coordinate|align|handoff|multi-actor/.test(text)) terrain.mode_pressure = "coordinate";

  terrain.local_minima_risk = terrain.ruggedness === "high" ? "high" : terrain.local_minima_risk;
  terrain.branching_factor = terrain.uncertainty === "high" ? "high" : terrain.branching_factor;
  terrain.coordination_load = terrain.adversariality === "high" ? "high" : terrain.coordination_load;
  return terrain;
}

export function ingestProblem(input: ProblemIngestionInput): ProblemIngestionResult {
  const assessment: TerrainAssessment = {
    problem_summary: input.problem_summary,
    terrain_profile: inferTerrain(input),
    field_confidence: Object.fromEntries(Object.keys(DEFAULT_TERRAIN).map((key) => [key, 0.55])) as Partial<Record<keyof TerrainProfile, number>>,
    missing_information: Object.keys(DEFAULT_TERRAIN),
  };

  const regime_hint = inferRegime(textBlob(input));
  assessment.terrain_profile.mode_pressure = regime_hint === "coordinate" ? "coordinate" : assessment.terrain_profile.mode_pressure;

  return {
    assessment,
    clarification_questions: clampQuestions(assessment),
    regime_hint,
  };
}
