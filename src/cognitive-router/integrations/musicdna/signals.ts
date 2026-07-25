// Pure signal extractors for MusicDNA session state → terrain inputs.
// Thresholds marked "shared" mirror finalizeSession / shouldStop in music-dna.

import {
  MUSICDNA_DIMS,
  type ArtistBias,
  type SessionConfidence,
  type SkipPressure,
  type SnapPicks,
  type VectorVolatility,
} from "./types.js";

/** Mirrors `shouldStop` axis_confidence_threshold default of 30. */
export const DEFAULT_AXIS_CONFIDENCE_THRESHOLD = 30;

/** Shared with finalizeSession artist-bias counterargument (`n >= 3`). */
export const DEFAULT_ARTIST_BIAS_THRESHOLD = 3;

/** Shared with finalizeSession snap-decision flag (`ms_to_decide < 2000`). */
export const DEFAULT_SNAP_THRESHOLD_MS = 2000;

/** Shared with finalizeSession (`snap_rate >= 0.6`). */
export const DEFAULT_SNAP_RATE_THRESHOLD = 0.6;

export const DEFAULT_VOLATILITY_THRESHOLD = 15;

export function sessionConfidence(
  vector: Record<string, number>,
  axisThreshold = DEFAULT_AXIS_CONFIDENCE_THRESHOLD,
): SessionConfidence {
  const confident_axes = MUSICDNA_DIMS.filter((d) => Math.abs(vector[d] ?? 0) >= axisThreshold).length;
  return {
    confidence: confident_axes / MUSICDNA_DIMS.length,
    confident_axes,
    total_axes: MUSICDNA_DIMS.length,
  };
}

export function detectArtistBias(
  freq: Record<string, number>,
  threshold = DEFAULT_ARTIST_BIAS_THRESHOLD,
): ArtistBias {
  const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  if (!top || top[1] < threshold) {
    return { biased: false, top_artist: null, count: 0 };
  }
  return { biased: true, top_artist: top[0], count: top[1] };
}

/**
 * Vector volatility from recent choice deltas.
 * Fewer than 3 deltas → unknown (`known: false`), not "not volatile".
 */
export function detectVectorVolatility(
  deltas: Array<Record<string, number>> | undefined | null,
  threshold = DEFAULT_VOLATILITY_THRESHOLD,
): VectorVolatility {
  if (!deltas || deltas.length < 3) {
    return { known: false, volatile: null, avgMagnitude: 0 };
  }

  const magnitudes = deltas.map((d) => Object.values(d).reduce((sum, v) => sum + Math.abs(v), 0));
  const avgMagnitude = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  return {
    known: true,
    volatile: avgMagnitude > threshold,
    avgMagnitude,
  };
}

export function detectSnapPicks(
  choices: Array<{ ms_to_decide: number | null }> | undefined | null,
  slowThresholdMs = DEFAULT_SNAP_THRESHOLD_MS,
  rateThreshold = DEFAULT_SNAP_RATE_THRESHOLD,
): SnapPicks {
  const valid = (choices ?? []).filter((c) => c.ms_to_decide != null);
  if (valid.length === 0) {
    return { snap_rate: 0, snapping: false, valid_count: 0 };
  }
  const snap = valid.filter((c) => (c.ms_to_decide as number) < slowThresholdMs).length;
  const snap_rate = snap / valid.length;
  return {
    snap_rate,
    snapping: snap_rate >= rateThreshold,
    valid_count: valid.length,
  };
}

/**
 * Skip pressure — strongest recognition-failure signal in MusicDNA.
 * `round` should be `rounds_shown` (answered + skipped).
 */
export function detectSkipPressure(skipped: string[], roundsShown: number): SkipPressure {
  const skip_count = skipped.length;
  const skip_rate = roundsShown > 0 ? skip_count / roundsShown : 0;
  return {
    skip_count,
    skip_rate,
    recognition_failing: skip_count >= 2 || skip_rate > 0.25,
  };
}
