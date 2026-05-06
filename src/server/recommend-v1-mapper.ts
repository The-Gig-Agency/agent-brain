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
  TIME_HORIZON_VALUES,
  UNCERTAINTY_VALUES,
  type FieldConfidence,
  type TerrainField,
  type TerrainProfile,
} from "../cognitive-router/types.js";

import type { RecommendV1ErrorWire, RecommendV1RequestWire } from "./recommend-v1-types.js";

const TERRAIN_KEYS: (keyof TerrainProfile)[] = [
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
];

const ENUM_BY_FIELD: Record<keyof TerrainProfile, readonly string[]> = {
  feedback_latency: FEEDBACK_LATENCIES,
  reversibility: REVERSIBILITY_VALUES,
  uncertainty: UNCERTAINTY_VALUES,
  branching_factor: BRANCHING_FACTOR_VALUES,
  adversariality: ADVERSARIALITY_VALUES,
  ruggedness: RUGGEDNESS_VALUES,
  local_minima_risk: LOCAL_MINIMA_RISK_VALUES,
  information_cost: INFORMATION_COST_VALUES,
  coordination_load: COORDINATION_LOAD_VALUES,
  environment_stability: ENVIRONMENT_STABILITY_VALUES,
  time_horizon: TIME_HORIZON_VALUES,
  mode_pressure: MODE_PRESSURE_VALUES,
};

export const RECOMMEND_V1_MAX_REASONS_PER_REGIME = 24;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationError(message: string, details?: unknown): RecommendV1ErrorWire {
  return { error: { code: "VALIDATION_ERROR", message, details } };
}

function expectEnum(field: keyof TerrainProfile, value: unknown): string | null {
  if (typeof value !== "string") {
    return `${String(field)} must be a string`;
  }
  const allowed = ENUM_BY_FIELD[field];
  if (!allowed.includes(value)) {
    return `${String(field)} must be one of: ${allowed.join(", ")}`;
  }
  return null;
}

function parseFieldConfidence(raw: unknown): RecommendV1ErrorWire | FieldConfidence | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!isRecord(raw)) {
    return validationError("field_confidence must be an object");
  }
  const out: FieldConfidence = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!TERRAIN_KEYS.includes(key as TerrainField)) {
      return validationError(`field_confidence has unknown terrain field: ${key}`);
    }
    if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
      return validationError(`field_confidence.${key} must be a number in [0, 1]`);
    }
    out[key as TerrainField] = value;
  }
  return out;
}

function parseMissingInformation(raw: unknown): RecommendV1ErrorWire | string[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!Array.isArray(raw)) {
    return validationError("missing_information must be an array of strings");
  }
  for (const item of raw) {
    if (typeof item !== "string") {
      return validationError("missing_information entries must be strings");
    }
  }
  return raw as string[];
}

/**
 * Parse and validate an unknown JSON body into a v1 wire request.
 */
export function parseRecommendV1Request(body: unknown): { ok: true; request: RecommendV1RequestWire } | { ok: false; error: RecommendV1ErrorWire } {
  if (!isRecord(body)) {
    return { ok: false, error: validationError("Request body must be a JSON object") };
  }

  const summary = body.problem_summary;
  if (typeof summary !== "string" || summary.trim().length === 0) {
    return { ok: false, error: validationError("problem_summary is required and must be a non-empty string") };
  }

  const terrainRaw = body.terrain;
  if (!isRecord(terrainRaw)) {
    return { ok: false, error: validationError("terrain is required and must be an object") };
  }

  const terrainFields: Record<string, string> = {};
  for (const key of TERRAIN_KEYS) {
    const err = expectEnum(key, terrainRaw[key]);
    if (err) {
      return { ok: false, error: validationError(err) };
    }
    terrainFields[key] = terrainRaw[key] as string;
  }
  const terrain = terrainFields as TerrainProfile;

  const fc = parseFieldConfidence(body.field_confidence);
  if (fc !== undefined && "error" in fc) {
    return { ok: false, error: fc };
  }

  const mi = parseMissingInformation(body.missing_information);
  if (mi !== undefined && "error" in mi) {
    return { ok: false, error: mi };
  }

  const request: RecommendV1RequestWire = {
    problem_summary: summary.trim(),
    terrain: terrain as TerrainProfile,
    ...(fc ? { field_confidence: fc } : {}),
    ...(mi ? { missing_information: mi } : {}),
  };

  return { ok: true, request };
}
