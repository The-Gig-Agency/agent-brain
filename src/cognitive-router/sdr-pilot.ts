import { buildStrategyRecommendation, recommendStrategyForSurface, type StrategyRecommendation } from "./strategy-layer.js";
import { recommendRegime } from "./scoring.js";
import type { RegimeRecommendation, TerrainAssessment, TerrainProfile } from "./types.js";
import type { RecommendV1RequestWire } from "../server/recommend-v1-types.js";

export const SDR_PILOT_SURFACES = [
  "icp_definition",
  "list_building",
  "enrichment",
  "message_drafting",
  "sequence_design",
  "objection_handling",
  "pipeline_review",
  "territory_segmentation",
] as const;

export const SDR_SIGNAL_LEVELS = ["low", "medium", "high"] as const;
export const SDR_EXECUTION_SCOPES = ["org", "seat"] as const;
export const SDR_CAPACITY_STATES = ["available", "constrained", "full"] as const;

export const SDR_PROSPECTING_MODES = [
  "broad_discovery",
  "territory_refinement",
  "title_expansion",
  "industry_expansion",
  "enrichment_first",
  "contact_recovery",
  "pipeline_harvest",
  "hold_and_refine_icp",
] as const;

export type SdrPilotSurface = (typeof SDR_PILOT_SURFACES)[number];
export type SdrSignalLevel = (typeof SDR_SIGNAL_LEVELS)[number];
export type SdrExecutionScope = (typeof SDR_EXECUTION_SCOPES)[number];
export type SdrCapacityState = (typeof SDR_CAPACITY_STATES)[number];
export type SdrProspectingMode = (typeof SDR_PROSPECTING_MODES)[number];

export type SdrPilotInput = {
  org_id: string;
  seat_id?: string;
  execution_scope: SdrExecutionScope;
  surface: SdrPilotSurface;
  icp_completeness: SdrSignalLevel;
  recent_prospect_yield: SdrSignalLevel;
  fit_quality: SdrSignalLevel;
  contact_coverage: SdrSignalLevel;
  territory_saturation: SdrSignalLevel;
  downstream_capacity: SdrCapacityState;
  active_pipeline_inventory?: SdrSignalLevel;
  operator_note?: string;
  missing_information?: string[];
};

export type SdrPilotRecommendation = {
  recommended_mode: SdrProspectingMode;
  mode_confidence: number;
  rationale: string[];
  regime_alignment: RegimeRecommendation;
  strategy_recommendation: StrategyRecommendation;
  inferred_terrain: TerrainProfile;
  terrain_assessment: TerrainAssessment;
  candidate_algorithms: string[];
  failure_modes: string[];
  next_review_triggers: string[];
  blockers: string[];
};

export type SdrPilotWireContext = {
  request: RecommendV1RequestWire;
  trace_summary: {
    org_id: string;
    seat_id?: string;
    execution_scope: SdrExecutionScope;
    surface: SdrPilotSurface;
  };
};

type ModeDecision = {
  mode: SdrProspectingMode;
  confidence: number;
  rationale: string[];
};

const MODE_FAILURE_MODES: Record<SdrProspectingMode, string[]> = {
  broad_discovery: [
    "Broadening before ICP ambiguity is contained can flood the system with low-fit accounts.",
    "Discovery without downstream capacity can create inventory that the SDR system cannot absorb.",
  ],
  territory_refinement: [
    "Refinement too early can hide real whitespace and make yield collapse look like fit improvement.",
    "Over-tightening territory before title or industry expansion can stall account growth.",
  ],
  title_expansion: [
    "Title expansion without fit guardrails can turn contact scarcity into persona drift.",
    "Expanding titles when territory is already noisy can increase low-fit enrichment spend.",
  ],
  industry_expansion: [
    "Industry expansion before ICP repair can mask a weak core target with adjacent noise.",
    "Broadening industry while territory is saturated can multiply irrelevant surface area.",
  ],
  enrichment_first: [
    "Enrichment-first burns budget if the underlying account list is still low quality.",
    "Contact enrichment without yield review can keep weak lists alive longer than they deserve.",
  ],
  contact_recovery: [
    "Recovery loops can over-focus on a few accounts if account yield is already too low.",
    "Contact recovery without sequencing discipline can overfit to stale account hypotheses.",
  ],
  pipeline_harvest: [
    "Harvesting too early can starve top-of-funnel learning if inventory is not actually healthy.",
    "Pipeline focus during low-fit periods can hide the need for upstream discovery changes.",
  ],
  hold_and_refine_icp: [
    "Holding too long can become analysis paralysis if enough signal already exists to test the market.",
    "Refinement without a clear next review trigger can stall progress instead of improving fit.",
  ],
};

function normalizeNote(note: string | undefined): string | null {
  const cleaned = note?.trim();
  return cleaned ? cleaned.toLowerCase() : null;
}

function dedupe(items: Array<string | null | undefined>): string[] {
  return [...new Set(items.filter((item): item is string => Boolean(item && item.trim())))];
}

function isSparse(input: SdrPilotInput): boolean {
  return (
    input.icp_completeness === "low" ||
    input.fit_quality === "low" ||
    (input.missing_information?.length ?? 0) >= 2
  );
}

function deriveModePressure(input: SdrPilotInput): TerrainProfile["mode_pressure"] {
  if (input.downstream_capacity === "full") {
    return "compound";
  }
  if (input.icp_completeness === "low" || input.missing_information?.length) {
    return "explore";
  }
  if (input.contact_coverage === "low" && input.fit_quality !== "low") {
    return "coordinate";
  }
  if (input.recent_prospect_yield === "high" && input.fit_quality === "low") {
    return "prune";
  }
  if (input.recent_prospect_yield === "high" && input.fit_quality === "high") {
    return "compound";
  }
  return "explore";
}

export function inferTerrainFromSdrPilot(input: SdrPilotInput): TerrainProfile {
  const sparse = isSparse(input);
  const note = normalizeNote(input.operator_note);
  const hasOperatorFriction =
    note !== null && /(stuck|blocked|saturated|narrow|quality|junk|contacts|empty)/.test(note);

  return {
    feedback_latency:
      input.recent_prospect_yield === "high"
        ? "fast"
        : input.recent_prospect_yield === "medium"
          ? "medium"
          : "slow",
    reversibility:
      input.surface === "message_drafting" || input.surface === "sequence_design"
        ? "high"
        : input.surface === "territory_segmentation" || input.surface === "pipeline_review"
          ? "medium"
          : "low",
    uncertainty:
      sparse || input.contact_coverage === "low"
        ? "high"
        : input.icp_completeness === "medium" || input.fit_quality === "medium"
          ? "medium"
          : "low",
    branching_factor:
      input.surface === "list_building" || input.surface === "territory_segmentation"
        ? "high"
        : input.surface === "icp_definition" || input.surface === "sequence_design"
          ? "medium"
          : "low",
    adversariality:
      input.surface === "objection_handling" || input.surface === "pipeline_review" ? "some" : "none",
    ruggedness:
      input.territory_saturation === "high" || (input.recent_prospect_yield === "low" && input.fit_quality === "high")
        ? "high"
        : input.fit_quality === "medium" || input.contact_coverage === "medium"
          ? "medium"
          : "low",
    local_minima_risk:
      input.fit_quality === "high" &&
      (input.recent_prospect_yield === "low" || input.contact_coverage === "low")
        ? "high"
        : input.territory_saturation === "medium" || input.recent_prospect_yield === "medium"
          ? "medium"
          : "low",
    information_cost:
      input.contact_coverage === "low" || sparse
        ? "high"
        : input.contact_coverage === "medium" || input.icp_completeness === "medium"
          ? "medium"
          : "low",
    coordination_load:
      input.execution_scope === "seat" || input.downstream_capacity !== "available" || hasOperatorFriction
        ? "high"
        : input.surface === "pipeline_review" || input.surface === "objection_handling"
          ? "medium"
          : "low",
    environment_stability:
      input.territory_saturation === "high" || input.downstream_capacity === "full" || hasOperatorFriction
        ? "shifting"
        : "stable",
    time_horizon: "iterative",
    mode_pressure: deriveModePressure(input),
  };
}

function decideProspectingMode(input: SdrPilotInput): ModeDecision {
  const rationale: string[] = [];

  if (input.icp_completeness === "low" || input.missing_information?.length) {
    rationale.push("ICP completeness is low or key information is missing.");
    return { mode: "hold_and_refine_icp", confidence: 0.82, rationale };
  }

  if (
    input.downstream_capacity === "full" ||
    (input.active_pipeline_inventory === "high" && input.fit_quality !== "low")
  ) {
    rationale.push("Downstream capacity is full or pipeline inventory is already healthy.");
    return { mode: "pipeline_harvest", confidence: 0.8, rationale };
  }

  if (input.fit_quality === "high" && input.contact_coverage === "low") {
    rationale.push("Accounts look promising, but contact coverage is weak.");
    if (input.recent_prospect_yield === "high" || input.surface === "enrichment") {
      return { mode: "enrichment_first", confidence: 0.76, rationale };
    }
    return { mode: "contact_recovery", confidence: 0.73, rationale };
  }

  if (input.recent_prospect_yield === "high" && input.fit_quality === "low") {
    rationale.push("Prospect volume exists, but fit quality is poor.");
    return {
      mode: input.surface === "territory_segmentation" ? "territory_refinement" : "industry_expansion",
      confidence: 0.74,
      rationale,
    };
  }

  if (input.recent_prospect_yield === "low" && input.fit_quality === "high") {
    rationale.push("Fit quality is strong, but prospect yield is too thin.");
    return {
      mode: input.territory_saturation === "high" ? "title_expansion" : "broad_discovery",
      confidence: 0.71,
      rationale,
    };
  }

  if (input.territory_saturation === "high" && input.fit_quality !== "low") {
    rationale.push("Territory is saturated, so narrower or adjacent search lanes are needed.");
    return { mode: "territory_refinement", confidence: 0.69, rationale };
  }

  if (input.recent_prospect_yield === "low") {
    rationale.push("Yield is low without a stronger contrary signal.");
    return { mode: "broad_discovery", confidence: 0.65, rationale };
  }

  rationale.push("Signals are mixed, so default to a bounded expansion path.");
  return { mode: "industry_expansion", confidence: 0.58, rationale };
}

function deriveBlockers(input: SdrPilotInput): string[] {
  const blockers: string[] = [];

  if (input.icp_completeness === "low") {
    blockers.push("ICP completeness is low enough that search expansion may amplify noise.");
  }
  if (input.downstream_capacity === "full") {
    blockers.push("Downstream SDR capacity is full, so new discovery work should be throttled.");
  }
  if (input.contact_coverage === "low" && input.fit_quality === "low") {
    blockers.push("Both account fit and contact coverage are weak, so enrichment alone is not enough.");
  }

  return blockers;
}

function deriveNextReviewTriggers(input: SdrPilotInput, mode: SdrProspectingMode): string[] {
  const triggers = [
    "Re-evaluate when fit quality changes by one band.",
    "Re-evaluate when contact coverage changes by one band.",
  ];

  if (mode === "hold_and_refine_icp") {
    triggers.push("Re-run after ICP completeness reaches medium or high.");
  }
  if (mode === "pipeline_harvest") {
    triggers.push("Re-run when downstream capacity returns to available or inventory drops.");
  }
  if (mode === "enrichment_first" || mode === "contact_recovery") {
    triggers.push("Re-run after contact coverage improves or stalls.");
  }
  if (input.territory_saturation === "high") {
    triggers.push("Re-run when territory saturation falls or new whitespace is identified.");
  }

  return dedupe(triggers);
}

export function buildSdrPilotTerrainAssessment(input: SdrPilotInput): TerrainAssessment {
  const inferredTerrain = inferTerrainFromSdrPilot(input);

  return {
    problem_summary: `SDR prospecting surface=${input.surface} scope=${input.execution_scope}`,
    terrain_profile: inferredTerrain,
    ...(input.missing_information ? { missing_information: input.missing_information } : {}),
  };
}

export function buildSdrPilotRecommendRequest(input: SdrPilotInput): SdrPilotWireContext {
  const assessment = buildSdrPilotTerrainAssessment(input);

  return {
    request: {
      problem_summary: assessment.problem_summary,
      terrain: assessment.terrain_profile,
      ...(assessment.field_confidence ? { field_confidence: assessment.field_confidence } : {}),
      ...(assessment.missing_information ? { missing_information: assessment.missing_information } : {}),
    },
    trace_summary: {
      org_id: input.org_id,
      ...(input.seat_id ? { seat_id: input.seat_id } : {}),
      execution_scope: input.execution_scope,
      surface: input.surface,
    },
  };
}

function chooseStrategyRecommendation(
  input: SdrPilotInput,
  regimeAlignment: RegimeRecommendation,
): StrategyRecommendation {
  const surfaceRecommendation = recommendStrategyForSurface(input.surface);
  const terrainRecommendation = buildStrategyRecommendation(regimeAlignment);

  if (!surfaceRecommendation) {
    return terrainRecommendation;
  }

  if (surfaceRecommendation.primary_regime === regimeAlignment.primary_regime) {
    return {
      ...surfaceRecommendation,
      confidence: Math.max(surfaceRecommendation.confidence, regimeAlignment.confidence),
      rationale: dedupe([
        ...surfaceRecommendation.rationale,
        `terrain_primary_regime=${regimeAlignment.primary_regime}`,
      ]),
    };
  }

  return {
    ...terrainRecommendation,
    rationale: dedupe([
      ...terrainRecommendation.rationale,
      `surface_default_primary=${surfaceRecommendation.primary_regime}`,
      "terrain_surface_divergence=terrain recommendation kept as primary",
    ]),
    alternatives: dedupe([
      ...terrainRecommendation.alternatives.map((item) => item.primary_algorithm),
      surfaceRecommendation.primary_algorithm,
    ]).includes(surfaceRecommendation.primary_algorithm)
      ? terrainRecommendation.alternatives
      : [
          {
            ...surfaceRecommendation,
            reason: "surface default differed from terrain-driven regime scoring",
          },
          ...terrainRecommendation.alternatives,
        ].slice(0, 3),
  };
}

export function recommendSdrProspectingMode(input: SdrPilotInput): SdrPilotRecommendation {
  const terrainAssessment = buildSdrPilotTerrainAssessment(input);
  const inferredTerrain = terrainAssessment.terrain_profile;
  const regimeAlignment = recommendRegime(terrainAssessment);
  const strategyRecommendation = chooseStrategyRecommendation(input, regimeAlignment);
  const modeDecision = decideProspectingMode(input);
  const candidateAlgorithms = dedupe([
    strategyRecommendation.primary_algorithm,
    strategyRecommendation.secondary_algorithm,
    ...strategyRecommendation.alternatives.map((item) => item.primary_algorithm),
  ]);
  const blockers = deriveBlockers(input);

  return {
    recommended_mode: modeDecision.mode,
    mode_confidence: Math.min(1, Math.max(modeDecision.confidence, strategyRecommendation.confidence - 0.05)),
    rationale: dedupe([
      ...modeDecision.rationale,
      ...strategyRecommendation.rationale,
      `surface=${input.surface}`,
      `primary_regime=${regimeAlignment.primary_regime}`,
    ]),
    regime_alignment: regimeAlignment,
    strategy_recommendation: strategyRecommendation,
    inferred_terrain: inferredTerrain,
    terrain_assessment: terrainAssessment,
    candidate_algorithms: candidateAlgorithms,
    failure_modes: MODE_FAILURE_MODES[modeDecision.mode],
    next_review_triggers: deriveNextReviewTriggers(input, modeDecision.mode),
    blockers,
  };
}
