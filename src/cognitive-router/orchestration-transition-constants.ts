/**
 * Fixed v1 transition and loop bounds for debugging-world orchestration.
 * Per AB-39: constants live in one module — not a user-facing config surface.
 */
export const ORCHESTRATION_V1 = {
  /** Maximum routed steps before forced stop (matches prior router-runner behavior). */
  MAX_STEPS_PER_RUN: 12,
  /** Minimum scoreTerrain confidence before dynamic primary can override active regime. */
  MIN_PRIMARY_CONFIDENCE_FOR_REGIME_SWITCH: 0.45,
  /** Margin between top and second clue family to treat as a “strong” family signal. */
  STRONG_FAMILY_SIGNAL_MARGIN: 2,
} as const;
