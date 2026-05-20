import type { RecommendV1ErrorWire } from "./recommend-v1-types.js";
import type { IntakeRecommendV1RequestWire } from "./intake-recommend-v1-types.js";

const MAX_PROBLEM_SUMMARY_CHARS = 32_000;
const MAX_CONTEXT_CHARS = 16_000;
const MAX_SIGNALS = 32;
const MAX_SIGNAL_ITEM_CHARS = 1024;

function err(message: string, details?: unknown): { ok: false; error: RecommendV1ErrorWire } {
  const body: RecommendV1ErrorWire = { error: { code: "VALIDATION_ERROR", message } };
  if (details !== undefined) {
    body.error.details = details;
  }
  return { ok: false, error: body };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validate and normalize JSON body for POST /v1/intake-recommend.
 */
export function parseIntakeRecommendV1Request(parsed: unknown):
  | { ok: true; request: IntakeRecommendV1RequestWire }
  | { ok: false; error: RecommendV1ErrorWire } {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return err("Body must be a JSON object");
  }

  const record = parsed as Record<string, unknown>;
  const { problem_summary, context, signals } = record;

  if (!isNonEmptyString(problem_summary)) {
    return err("problem_summary is required and must be a non-empty string");
  }
  const summary = problem_summary.trim();
  if (summary.length > MAX_PROBLEM_SUMMARY_CHARS) {
    return err(`problem_summary must be at most ${MAX_PROBLEM_SUMMARY_CHARS} characters`);
  }

  let normalizedContext: string | undefined;
  if (context !== undefined) {
    if (typeof context !== "string") {
      return err("context must be a string when provided");
    }
    if (context.length > MAX_CONTEXT_CHARS) {
      return err(`context must be at most ${MAX_CONTEXT_CHARS} characters`);
    }
    if (context.length > 0) {
      normalizedContext = context;
    }
  }

  let normalizedSignals: string[] | undefined;
  if (signals !== undefined) {
    if (!Array.isArray(signals)) {
      return err("signals must be an array of strings when provided");
    }
    if (signals.length > MAX_SIGNALS) {
      return err(`signals must have at most ${MAX_SIGNALS} entries`);
    }
    const out: string[] = [];
    for (let i = 0; i < signals.length; i += 1) {
      const item = signals[i];
      if (typeof item !== "string") {
        return err(`signals[${i}] must be a string`);
      }
      if (item.length > MAX_SIGNAL_ITEM_CHARS) {
        return err(`signals[${i}] must be at most ${MAX_SIGNAL_ITEM_CHARS} characters`);
      }
      if (item.length > 0) {
        out.push(item);
      }
    }
    if (out.length > 0) {
      normalizedSignals = out;
    }
  }

  const request: IntakeRecommendV1RequestWire = { problem_summary: summary };
  if (normalizedContext !== undefined) {
    request.context = normalizedContext;
  }
  if (normalizedSignals !== undefined) {
    request.signals = normalizedSignals;
  }
  return { ok: true, request };
}
