import { DEBUGGING_TRANSITION_CANDIDATE_V01_CASES } from "./debugging-world.js";
import { runMediaEvaluationSuite } from "./media-evaluator.js";
import { runDebugCase } from "./router-runner.js";
import { runReplaySuite } from "./replay-evaluator.js";
import type {
  DebugRunOptions,
  MediaDecisionRunOptions,
  MemoryScoringContext,
  ReplayDatasetReport,
  TerrainMemoryAblation,
} from "./types.js";

const REPLAY_V08_VISIBLE = "real-replays-v0.8.visible.json";
const REPLAY_V08_EVAL = "real-replays-v0.8.evaluator.json";

/** Synthetic memory so one-factor strips in `scoreTerrain` produce measurable replay deltas (analysis harness only). */
const REPLAY_SCORING_HARNESS_MEMORY: MemoryScoringContext = {
  repeated_failed_path_count: 1,
  disproven_family_count: 2,
  strong_signal_family_count: 1,
  drift_detected: true,
};

const MEDIA_SCORING_HARNESS_MEMORY: MemoryScoringContext = {
  repeated_failed_path_count: 1,
  disproven_family_count: 2,
  strong_signal_family_count: 1,
  drift_detected: true,
};

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function debuggingRoutedMetrics(options: DebugRunOptions = {}) {
  const cases = DEBUGGING_TRANSITION_CANDIDATE_V01_CASES;
  const results = cases.map((debugCase) => runDebugCase(debugCase, "routed_policy", options));
  return {
    case_count: cases.length,
    routed_success_rate: average(results.map((result) => (result.success ? 1 : 0))),
    average_total_cost: average(results.map((result) => result.total_cost)),
    average_transition_count: average(results.map((result) => result.transition_count)),
    average_false_convergence_rate: average(results.map((result) => (result.false_convergence ? 1 : 0))),
  };
}

function deltaNumber(baseline: number, ablated: number): number {
  return Math.round((ablated - baseline) * 10000) / 10000;
}

function replayKeyRates(report: ReplayDatasetReport) {
  return {
    case_count: report.summary.case_count,
    routed_hidden_regime_match_rate: report.summary.routed_hidden_regime_match_rate,
    overall_pass: report.overall_pass,
  };
}

function mediaKeyRates(report: ReturnType<typeof runMediaEvaluationSuite>) {
  return {
    case_count: report.summary.case_count,
    overall_pass: report.overall_pass,
    acceptable_action_match_rate: report.summary.acceptable_action_match_rate,
    confidence_band_match_rate: report.summary.confidence_band_match_rate,
  };
}

export type AblationPrimitiveId =
  | "failed_path_memory"
  | "transition_rules"
  | "confidence_gating"
  | "drift_recovery"
  | "inspection_before_compound";

const DEBUGGING_ABLATIONS: Array<{ id: AblationPrimitiveId; label: string; options: DebugRunOptions }> = [
  { id: "failed_path_memory", label: "Failed-path memory off", options: { disable_failed_path_memory: true } },
  { id: "transition_rules", label: "Transition rules off", options: { disable_transitions: true } },
  { id: "confidence_gating", label: "Confidence gating off", options: { disable_confidence_gating: true } },
  { id: "drift_recovery", label: "Drift recovery off", options: { disable_drift_recovery: true } },
  {
    id: "inspection_before_compound",
    label: "Inspection-before-compound off",
    options: { disable_inspection_before_compound: true },
  },
];

function replayHarnessReport(memoryAblation?: TerrainMemoryAblation): ReplayDatasetReport {
  return runReplaySuite(REPLAY_V08_VISIBLE, REPLAY_V08_EVAL, "replay-scoring-harness-v0.1", {
    memory: REPLAY_SCORING_HARNESS_MEMORY,
    ...(memoryAblation && Object.keys(memoryAblation).length > 0 ? { memory_ablation: memoryAblation } : {}),
  });
}

function mediaHarnessReport(mediaOptions: MediaDecisionRunOptions): ReturnType<typeof runMediaEvaluationSuite> {
  return runMediaEvaluationSuite("media-decision-v0.1.json", {
    ...mediaOptions,
    terrain_memory: mediaOptions.terrain_memory ?? MEDIA_SCORING_HARNESS_MEMORY,
  });
}

export function runAblationMatrixV01() {
  const generated_at = new Date().toISOString();

  const frozenReplayProduction = runReplaySuite(REPLAY_V08_VISIBLE, REPLAY_V08_EVAL, "real-replays-v0.8");
  const frozenMediaProduction = runMediaEvaluationSuite("media-decision-v0.1.json");

  const debuggingBaseline = debuggingRoutedMetrics({});
  const replayHarnessBaseline = replayHarnessReport(undefined);
  const replayHarnessBaselineRates = replayKeyRates(replayHarnessBaseline);
  const mediaHarnessBaselineReport = mediaHarnessReport({});
  const mediaHarnessBaselineRates = mediaKeyRates(mediaHarnessBaselineReport);

  const debuggingAblations = DEBUGGING_ABLATIONS.map((entry) => {
    const metrics = debuggingRoutedMetrics(entry.options);
    return {
      primitive: entry.id,
      label: entry.label,
      options: entry.options,
      metrics,
      delta_vs_debugging_baseline: {
        routed_success_rate: deltaNumber(debuggingBaseline.routed_success_rate, metrics.routed_success_rate),
        average_total_cost: deltaNumber(debuggingBaseline.average_total_cost, metrics.average_total_cost),
        average_transition_count: deltaNumber(
          debuggingBaseline.average_transition_count,
          metrics.average_transition_count,
        ),
        average_false_convergence_rate: deltaNumber(
          debuggingBaseline.average_false_convergence_rate,
          metrics.average_false_convergence_rate,
        ),
      },
    };
  });

  const replayAblations = DEBUGGING_ABLATIONS.map((entry) => {
    const strip: TerrainMemoryAblation = {};
    if (entry.id === "failed_path_memory") {
      strip.skip_failed_path_memory = true;
    }
    if (entry.id === "confidence_gating") {
      strip.skip_strong_signal_memory = true;
      strip.skip_disproven_memory = true;
    }
    if (entry.id === "drift_recovery") {
      strip.skip_drift_memory = true;
    }

    const hasStrip = Object.keys(strip).length > 0;
    const applicableReplay =
      entry.id !== "transition_rules" && entry.id !== "inspection_before_compound" && hasStrip;
    const rates = applicableReplay
      ? replayKeyRates(replayHarnessReport(strip))
      : replayHarnessBaselineRates;

    return {
      primitive: entry.id,
      label: entry.label,
      applicable: applicableReplay,
      metrics: rates,
      delta_vs_replay_harness_baseline: applicableReplay
        ? {
            routed_hidden_regime_match_rate: deltaNumber(
              replayHarnessBaselineRates.routed_hidden_regime_match_rate,
              rates.routed_hidden_regime_match_rate,
            ),
          }
        : null,
      note:
        entry.id === "transition_rules" || entry.id === "inspection_before_compound"
          ? "Replay lane is single-shot scoreTerrain routing; no explicit transition or inspect-before-compound mechanics."
          : !hasStrip
            ? "No memory strip mapped for this primitive on the replay harness."
            : undefined,
    };
  });

  const mediaAblations = DEBUGGING_ABLATIONS.map((entry) => {
    const extra: MediaDecisionRunOptions = {};
    let note: string | undefined;
    if (entry.id === "failed_path_memory") {
      extra.terrain_memory_ablation = { skip_failed_path_memory: true };
    } else if (entry.id === "confidence_gating") {
      extra.terrain_memory_ablation = {
        skip_strong_signal_memory: true,
        skip_disproven_memory: true,
      };
      extra.disable_calibration = true;
    } else if (entry.id === "drift_recovery") {
      extra.terrain_memory_ablation = { skip_drift_memory: true };
    } else if (entry.id === "transition_rules") {
      extra.disable_heuristics = true;
    } else if (entry.id === "inspection_before_compound") {
      note = "No direct inspect-before-compound gate in media router v0.1; marked n/a.";
    }

    const applicableMedia = entry.id !== "inspection_before_compound";
    const report = applicableMedia ? mediaHarnessReport(extra) : mediaHarnessBaselineReport;
    const rates = mediaKeyRates(report);
    return {
      primitive: entry.id,
      label: entry.label,
      applicable: applicableMedia,
      metrics: rates,
      delta_vs_media_harness_baseline: applicableMedia
        ? {
            acceptable_action_match_rate: deltaNumber(
              mediaHarnessBaselineRates.acceptable_action_match_rate,
              rates.acceptable_action_match_rate,
            ),
            confidence_band_match_rate: deltaNumber(
              mediaHarnessBaselineRates.confidence_band_match_rate,
              rates.confidence_band_match_rate,
            ),
          }
        : null,
      note,
    };
  });

  const primitive_contribution_table = DEBUGGING_ABLATIONS.map((entry, index) => {
    const d = debuggingAblations[index];
    const r = replayAblations[index];
    const m = mediaAblations[index];
    return {
      primitive: entry.id,
      label: entry.label,
      transition_candidate_debugging: d?.delta_vs_debugging_baseline,
      replay_v08_scoring_harness: r?.delta_vs_replay_harness_baseline,
      replay_v08_note: r?.note,
      media_v01_scoring_harness: m?.delta_vs_media_harness_baseline,
      media_v01_note: m?.note,
    };
  });

  return {
    generated_at,
    matrix_version: "ablation-matrix-v0.1",
    frozen_lanes_unmodified: {
      replay_v08_production: replayKeyRates(frozenReplayProduction),
      media_v01_production: mediaKeyRates(frozenMediaProduction),
    },
    harness_baselines: {
      transition_candidate_debugging: debuggingBaseline,
      replay_v08_scoring_harness: replayHarnessBaselineRates,
      media_v01_scoring_harness: mediaHarnessBaselineRates,
    },
    debugging_ablations: debuggingAblations,
    replay_ablations: replayAblations,
    media_ablations: mediaAblations,
    primitive_contribution_table,
  };
}
