import {
  SEARCH_REGIMES,
  type FieldConfidence,
  type SearchRegime,
  type TerrainAssessment,
  type TerrainField,
  type TerrainProfile,
} from "./types.js";

export type ProblemIngestionInput = {
  problem_summary: string;
  context?: string;
  signals?: string[];
};

export type TerrainClarificationQuestion = {
  field: TerrainField;
  question: string;
  why_it_matters: string;
};

export type TerrainFieldEvidence = {
  field: TerrainField;
  value: TerrainProfile[TerrainField];
  confidence: number;
  evidence: string[];
};

export type ProblemIngestionResult = {
  assessment: TerrainAssessment;
  clarification_questions: TerrainClarificationQuestion[];
  regime_hint: SearchRegime;
  field_evidence: TerrainFieldEvidence[];
};

type FieldPattern<T extends TerrainField> = {
  value: TerrainProfile[T];
  confidence: number;
  patterns: RegExp[];
  evidence: string;
};

const TERRAIN_FIELDS = [
  "feedback_latency",
  "reversibility",
  "uncertainty",
  "branching_factor",
  "adversariality",
  "ruggedness",
  "local_minima_risk",
  "information_cost",
  "coordination_load",
  "environment_stability",
  "time_horizon",
  "mode_pressure",
] as const satisfies readonly TerrainField[];

const DEFAULT_TERRAIN: TerrainProfile = {
  feedback_latency: "medium",
  reversibility: "medium",
  uncertainty: "medium",
  branching_factor: "medium",
  adversariality: "none",
  ruggedness: "medium",
  local_minima_risk: "medium",
  information_cost: "medium",
  coordination_load: "low",
  environment_stability: "stable",
  time_horizon: "iterative",
  mode_pressure: "explore",
};

const QUESTION_BANK: Record<TerrainField, TerrainClarificationQuestion> = {
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

const FIELD_PATTERNS: { [K in TerrainField]: Array<FieldPattern<K>> } = {
  feedback_latency: [
    { value: "fast", confidence: 0.82, patterns: [/fast feedback|real[- ]time|immediate signal|live metric|same day/], evidence: "fast feedback signal" },
    { value: "slow", confidence: 0.82, patterns: [/slow feedback|weeks?|months?|lagging|long sales cycle|delayed signal/], evidence: "slow feedback signal" },
  ],
  reversibility: [
    { value: "high", confidence: 0.8, patterns: [/rollback|reversible|undo|cheap to revert|easy to reverse/], evidence: "reversible move" },
    { value: "low", confidence: 0.84, patterns: [/irreversible|hard to undo|cannot undo|can't undo|lock[- ]in|one[- ]way door/], evidence: "low reversibility signal" },
  ],
  uncertainty: [
    { value: "high", confidence: 0.84, patterns: [/unknown|uncertain|ambiguous|not sure|weak signal|sparse evidence|messy input/], evidence: "high uncertainty signal" },
    { value: "low", confidence: 0.78, patterns: [/clear evidence|known cause|well understood|confirmed|instrumented|works|working/], evidence: "clear evidence signal" },
  ],
  branching_factor: [
    { value: "high", confidence: 0.82, patterns: [/many options|lots of paths|too many choices|branching|multiple possible|five .*segments|several .*segments/], evidence: "many plausible paths" },
    { value: "low", confidence: 0.74, patterns: [/single path|one option|only path|narrow fix|narrow failing path|failing path is narrow/], evidence: "few plausible paths" },
  ],
  adversariality: [
    { value: "high", confidence: 0.84, patterns: [/competitor|adversarial|negotiat|strategic actor|auction|bid pressure/], evidence: "strategic actor signal" },
    { value: "some", confidence: 0.7, patterns: [/stakeholder|other team|partner|sales and support|legal/], evidence: "multi-actor influence signal" },
    { value: "none", confidence: 0.72, patterns: [/passive system|no stakeholders|purely technical|local script/], evidence: "passive environment signal" },
  ],
  ruggedness: [
    { value: "high", confidence: 0.82, patterns: [/stuck|trap|false start|local minimum|thrash|keeps failing|deceptive/], evidence: "rugged search signal" },
    { value: "low", confidence: 0.72, patterns: [/straightforward|smooth|incremental improvement|known workflow/], evidence: "smooth terrain signal" },
  ],
  local_minima_risk: [
    { value: "high", confidence: 0.82, patterns: [/stuck|local minimum|false confidence|good enough but wrong|premature convergence/], evidence: "local-minimum risk signal" },
    { value: "low", confidence: 0.72, patterns: [/simple hill[- ]climb|obvious next step|known fix/], evidence: "low local-minimum risk signal" },
  ],
  information_cost: [
    { value: "high", confidence: 0.82, patterns: [/expensive to learn|costly to test|few shots|limited budget|hard to measure|privacy review/], evidence: "high information cost signal" },
    { value: "low", confidence: 0.76, patterns: [/cheap test|quick probe|easy to measure|low-cost experiment/], evidence: "low information cost signal" },
  ],
  coordination_load: [
    { value: "high", confidence: 0.84, patterns: [/handoff|multiple teams|cross[- ]team|approval chain|stakeholder|legal|sales and support|partner/], evidence: "high coordination signal" },
    { value: "low", confidence: 0.72, patterns: [/solo|single owner|local change|self-contained/], evidence: "low coordination signal" },
  ],
  environment_stability: [
    { value: "shifting", confidence: 0.82, patterns: [/changing|shifting|moving target|volatile|market moving|rules changed/], evidence: "shifting environment signal" },
    { value: "stable", confidence: 0.7, patterns: [/stable|unchanged|fixed contract|known invariant/], evidence: "stable environment signal" },
  ],
  time_horizon: [
    { value: "one_shot", confidence: 0.78, patterns: [/one[- ]shot|single decision|once|launch decision|publish decision/], evidence: "one-shot decision signal" },
    { value: "iterative", confidence: 0.78, patterns: [/iterate|ongoing|loop|over time|sprint|pilot|sequence|campaign/], evidence: "iterative process signal" },
  ],
  mode_pressure: [
    { value: "prune", confidence: 0.86, patterns: [/debug|bug|root cause|diagnos|filter|eliminate|triage|narrow down|bad leads|low fit/], evidence: "prune pressure signal" },
    { value: "explore", confidence: 0.84, patterns: [/explore|discover|research|experiment|hypothesis|probe|unknown market|new segment/], evidence: "explore pressure signal" },
    { value: "compound", confidence: 0.84, patterns: [/refine|iterate|improve|polish|optimize working|scale what works|compound/], evidence: "compound pressure signal" },
    { value: "escape", confidence: 0.84, patterns: [/stuck|escape|local minimum|thrash|same failed path/], evidence: "escape pressure signal" },
    { value: "coordinate", confidence: 0.84, patterns: [/coordinate|align|handoff|multi[- ]actor|stakeholder|approval/], evidence: "coordinate pressure signal" },
    { value: "create", confidence: 0.78, patterns: [/create|invent|draft from scratch|ideate|generate concepts/], evidence: "create pressure signal" },
  ],
};

function setTerrainField<T extends TerrainField>(
  terrain: TerrainProfile,
  field: T,
  value: TerrainProfile[T],
): void {
  (terrain as Record<TerrainField, TerrainProfile[TerrainField]>)[field] = value;
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function textBlob(input: ProblemIngestionInput): string {
  return [input.problem_summary, input.context ?? "", ...(input.signals ?? [])]
    .join(" \n")
    .toLowerCase();
}

function matchedEvidence<T extends TerrainField>(field: T, text: string): FieldPattern<T> | null {
  const matches = FIELD_PATTERNS[field].filter((pattern) => pattern.patterns.some((regex) => regex.test(text)));
  return matches.sort((left, right) => right.confidence - left.confidence)[0] ?? null;
}

function inferRegime(profile: TerrainProfile, text: string): SearchRegime {
  const score: Record<SearchRegime, number> = { prune: 0, explore: 0, compound: 0, coordinate: 0 };
  const add = (regime: SearchRegime, n: number): void => {
    score[regime] += n;
  };

  if (profile.mode_pressure === "prune") add("prune", 4);
  if (profile.mode_pressure === "explore" || profile.mode_pressure === "escape" || profile.mode_pressure === "create") add("explore", 4);
  if (profile.mode_pressure === "compound") add("compound", 4);
  if (profile.mode_pressure === "coordinate") add("coordinate", 4);
  if (profile.uncertainty === "high" || profile.branching_factor === "high") add("explore", 2);
  if (profile.feedback_latency === "fast" && profile.uncertainty === "low") add("compound", 2);
  if (profile.coordination_load === "high" || profile.adversariality === "high") add("coordinate", 2);
  if (/debug|bug|error|broken|root cause|diagnos|triage/.test(text)) add("prune", 3);

  return SEARCH_REGIMES.reduce((best, regime) => (score[regime] > score[best] ? regime : best), "explore");
}

function inferTerrain(input: ProblemIngestionInput): {
  terrain: TerrainProfile;
  confidence: FieldConfidence;
  evidence: TerrainFieldEvidence[];
} {
  const text = textBlob(input);
  const terrain = { ...DEFAULT_TERRAIN };
  const confidence: FieldConfidence = {};
  const evidence: TerrainFieldEvidence[] = [];

  for (const field of TERRAIN_FIELDS) {
    const match = matchedEvidence(field, text);
    if (match) {
      setTerrainField(terrain, field, match.value);
      confidence[field] = match.confidence;
      evidence.push({
        field,
        value: match.value,
        confidence: match.confidence,
        evidence: [match.evidence],
      });
    } else {
      confidence[field] = field === "time_horizon" || field === "environment_stability" ? 0.6 : 0.52;
    }
  }

  if (terrain.ruggedness === "high" && (confidence.local_minima_risk ?? 0) < 0.75) {
    terrain.local_minima_risk = "high";
    confidence.local_minima_risk = 0.7;
    evidence.push({
      field: "local_minima_risk",
      value: "high",
      confidence: 0.7,
      evidence: ["derived from ruggedness=high"],
    });
  }

  if (terrain.uncertainty === "high" && (confidence.branching_factor ?? 0) < 0.7) {
    terrain.branching_factor = "high";
    confidence.branching_factor = 0.68;
    evidence.push({
      field: "branching_factor",
      value: "high",
      confidence: 0.68,
      evidence: ["derived from uncertainty=high"],
    });
  }

  if (terrain.adversariality === "high" && (confidence.coordination_load ?? 0) < 0.75) {
    terrain.coordination_load = "high";
    confidence.coordination_load = 0.7;
    evidence.push({
      field: "coordination_load",
      value: "high",
      confidence: 0.7,
      evidence: ["derived from adversariality=high"],
    });
  }

  return { terrain, confidence, evidence };
}

function missingFields(confidence: FieldConfidence): TerrainField[] {
  return TERRAIN_FIELDS.filter((field) => (confidence[field] ?? 0) < 0.65);
}

function clarificationQuestions(confidence: FieldConfidence): TerrainClarificationQuestion[] {
  const priority: TerrainField[] = [
    "mode_pressure",
    "uncertainty",
    "feedback_latency",
    "reversibility",
    "information_cost",
    "coordination_load",
    "branching_factor",
    "ruggedness",
    "environment_stability",
    "time_horizon",
    "adversariality",
    "local_minima_risk",
  ];

  const missing = new Set(missingFields(confidence));
  return priority.filter((field) => missing.has(field)).map((field) => QUESTION_BANK[field]).slice(0, 6);
}

export function ingestProblem(input: ProblemIngestionInput): ProblemIngestionResult {
  const { terrain, confidence, evidence } = inferTerrain(input);
  const regimeHint = inferRegime(terrain, textBlob(input));

  if (regimeHint === "coordinate") {
    terrain.mode_pressure = "coordinate";
    confidence.mode_pressure = Math.max(confidence.mode_pressure ?? 0, 0.72);
  }

  return {
    assessment: {
      problem_summary: input.problem_summary,
      terrain_profile: terrain,
      field_confidence: confidence,
      missing_information: missingFields(confidence),
    },
    clarification_questions: clarificationQuestions(confidence),
    regime_hint: regimeHint,
    field_evidence: evidence,
  };
}
