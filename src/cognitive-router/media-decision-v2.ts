import type {
  MediaAdLevelReadout,
  MediaAdMetricRow,
  MediaCreativeBreakdown,
  MediaCreativeComponentReadout,
  MediaDecisionInput,
  MediaDecisionRecommendation,
  MediaDecisionRunOptions,
  MediaDimensionSplits,
  MediaRecommendedAction,
  MediaReliabilityTier,
  MediaStatisticalReadout,
  MediaStatisticalReliability,
  MediaTestPlan,
} from "./types.js";

export function hasV2MediaInput(input: MediaDecisionInput): boolean {
  return !!(
    input.statistical_reliability ||
    (input.ad_level_metrics && input.ad_level_metrics.length > 0) ||
    input.creative_breakdown ||
    (input.dimension_splits && Object.keys(input.dimension_splits).length > 0)
  );
}

function inferReliabilityTier(rel: MediaStatisticalReliability | undefined, conversionVolume: number): MediaReliabilityTier {
  if (rel?.reliability_tier) {
    return rel.reliability_tier;
  }
  const imp = rel?.impressions;
  const conv = rel?.conversions ?? conversionVolume;
  if (imp !== undefined && imp < 3000) {
    return "weak";
  }
  if (conv < 25) {
    return "weak";
  }
  if (conv < 60 || (imp !== undefined && imp < 15000)) {
    return "moderate";
  }
  return "strong";
}

function pickCreativeBest(breakdown: MediaCreativeBreakdown): MediaCreativeComponentReadout {
  const entries: Array<["hook" | "body" | "cta", number]> = [
    ["hook", breakdown.hook.ctr],
    ["body", breakdown.body.ctr],
    ["cta", breakdown.cta.ctr],
  ];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const best = sorted[0];
  if (!best || sorted.every(([, v]) => v === sorted[0]?.[1])) {
    return {
      best_component: null,
      rationale: ["Hook, body, and CTA CTR are tied or degenerate; no single component dominates."],
    };
  }
  return {
    best_component: best[0],
    rationale: [
      `${best[0]} leads on CTR (${best[1].toFixed(4)} vs ${(sorted[1]?.[1] ?? 0).toFixed(4)} for ${sorted[1]?.[0] ?? "n/a"}).`,
    ],
  };
}

function buildAdLevelReadout(rows: MediaAdMetricRow[]): MediaAdLevelReadout {
  const sorted = [...rows].sort((a, b) => b.ctr - a.ctr);
  const winners = sorted.slice(0, Math.min(2, sorted.length)).map((row) => ({
    ad_id: row.ad_id,
    rationale: `CTR ${row.ctr.toFixed(4)}, CPC ${row.cpc.toFixed(2)}, CPA ${row.cpa.toFixed(2)}, spend ${row.spend.toFixed(0)}`,
  }));
  const losers = sorted.slice(-1).map((row) => ({
    ad_id: row.ad_id,
    rationale: `Lowest CTR in cohort (${row.ctr.toFixed(4)}).`,
  }));
  return { winners, losers };
}

function buildDimensionHighlights(splits: MediaDimensionSplits): string[] {
  const out: string[] = [];
  for (const [dim, inner] of Object.entries(splits)) {
    const ranked = Object.entries(inner).sort((a, b) => b[1].ctr - a[1].ctr);
    const top = ranked[0];
    if (top) {
      out.push(`${dim}: top slice "${top[0]}" ctr=${top[1].ctr.toFixed(4)}`);
    }
    if (out.length >= 6) {
      break;
    }
  }
  return out;
}

function buildTestPlan(action: MediaRecommendedAction, input: MediaDecisionInput): MediaTestPlan {
  const baseStop = [
    "Pause variant if spend exceeds test cell budget without primary conversion.",
    "Stop if statistical reliability stays weak after 2× planned sample window.",
  ];
  if (action === "test_next" || action === "explore") {
    return {
      hypotheses: [
        "Controlled variant reduces uncertainty on the dominant loss driver.",
        "Winner path is stable under audience/placement splits when available.",
      ],
      next_variants: [
        "Clone current winner with single-factor change (hook OR audience OR placement).",
        "Hold a capped challenger cell against baseline spend share.",
      ],
      success_metrics: [
        "CPA within ±10% of control at equal spend velocity",
        "CTR not regressing more than 0.02 vs control over 7d",
      ],
      stop_rules: baseStop,
    };
  }
  if (action === "prune" || action === "reallocate") {
    return {
      hypotheses: ["Removing or shifting spend from losers improves blended CPA."],
      next_variants: ["Gradual budget shift with guardrailed CPA ceiling", "Hard pause lowest-CTR ad after confirmation window"],
      success_metrics: ["Blended CPA improves vs pre-change baseline", "No single slice exceeds saturation risk threshold"],
      stop_rules: baseStop,
    };
  }
  return {
    hypotheses: ["Stabilize measurement before scaling or cutting."],
    next_variants: ["Add tracking verification checklist", "Narrow to single channel slice for cleaner read"],
    success_metrics: ["Tracking_confidence medium+ on primary KPI", "Contradiction count trending down"],
    stop_rules: baseStop,
  };
}

export function buildMediaV2Attachment(
  input: MediaDecisionInput,
  chosen: MediaRecommendedAction,
  options: MediaDecisionRunOptions,
): Partial<
  Pick<
    MediaDecisionRecommendation,
    | "statistical_readout"
    | "ad_level_readout"
    | "creative_component_readout"
    | "dimension_split_highlights"
    | "test_plan"
  >
> {
  const emit = hasV2MediaInput(input) || options.v2_readouts;
  if (!emit) {
    return {};
  }

  const tier = inferReliabilityTier(input.statistical_reliability, input.conversion_volume);
  const notes: string[] = [];
  if (tier === "weak") {
    notes.push("Statistical reliability is weak — avoid aggressive budget moves on thin samples.");
  }
  if (input.statistical_reliability?.impressions !== undefined) {
    notes.push(`Impressions context: ${input.statistical_reliability.impressions}`);
  }
  if (input.statistical_reliability?.conversions !== undefined) {
    notes.push(`Conversion events context: ${input.statistical_reliability.conversions}`);
  }
  if (options.v2_readouts && !hasV2MediaInput(input) && notes.length === 0) {
    notes.push("v2 readouts enabled with sparse inputs — rely on conversion_volume heuristics only.");
  }

  const statistical_readout: MediaStatisticalReadout = {
    reliability_tier: tier,
    sample_adequate: tier !== "weak",
    notes,
  };

  const out: Partial<
    Pick<
      MediaDecisionRecommendation,
      | "statistical_readout"
      | "ad_level_readout"
      | "creative_component_readout"
      | "dimension_split_highlights"
      | "test_plan"
    >
  > = {
    statistical_readout,
    test_plan: buildTestPlan(chosen, input),
  };

  if (input.ad_level_metrics && input.ad_level_metrics.length > 0) {
    out.ad_level_readout = buildAdLevelReadout(input.ad_level_metrics);
  }
  if (input.creative_breakdown) {
    out.creative_component_readout = pickCreativeBest(input.creative_breakdown);
  }
  if (input.dimension_splits && Object.keys(input.dimension_splits).length > 0) {
    out.dimension_split_highlights = buildDimensionHighlights(input.dimension_splits);
  }

  return out;
}

/** Confidence penalty when reliability is weak (deterministic). */
export function mediaV2ConfidenceAdjustment(input: MediaDecisionInput, options: MediaDecisionRunOptions): number {
  if (!hasV2MediaInput(input) && !options.v2_readouts) {
    return 0;
  }
  const tier = inferReliabilityTier(input.statistical_reliability, input.conversion_volume);
  if (tier === "weak") {
    return 0.1;
  }
  if (tier === "moderate") {
    return 0.04;
  }
  return 0;
}
