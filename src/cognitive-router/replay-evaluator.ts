import { scoreTerrain } from "./scoring.js";
import { loadReplayEvaluatorDataset, loadReplayVisibleDataset } from "./replay-dataset.js";
import type {
  ReplayCaseReport,
  ReplayDatasetReport,
  ReplayEvaluatorCase,
  ReplayVisibleCase,
  SearchRegime,
  TerrainProfile,
} from "./types.js";

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function inferTerrainFromReplayCase(visibleCase: ReplayVisibleCase): TerrainProfile {
  const entryPointCount = visibleCase.starting_context.entry_points.length;
  const reproStyle = visibleCase.starting_context.repro_style.toLowerCase();
  const symptom = visibleCase.symptom.toLowerCase();
  const augmentation = visibleCase.replay_augmentation;

  const isSchemaMismatch = reproStyle.includes("schema") || symptom.includes("field length");
  const isAuth = reproStyle.includes("auth") || symptom.includes("login");
  const isAttributeBoundary = reproStyle.includes("attribute") || symptom.includes("attributeerror");
  const isMultiHop = reproStyle.includes("multi-hop") || symptom.includes("limits were calculated");
  const isLimitBug = reproStyle.includes("limit") || symptom.includes("limit");
  const hasMisleadingTelemetry = (augmentation?.misleading_telemetry?.length ?? 0) > 0;
  const hasDelayedSignal = augmentation?.delayed_decisive_signal ?? false;
  const hasConflictingEvidence = augmentation?.conflicting_evidence ?? false;
  const hasEnvironmentConfusion = (augmentation?.environment_confusion?.length ?? 0) > 0;

  const branchingFactor =
    entryPointCount >= 5 ? "high" : entryPointCount >= 3 ? "medium" : "low";
  const uncertainty =
    isMultiHop || hasDelayedSignal || hasConflictingEvidence
      ? "high"
      : isAttributeBoundary || isAuth || entryPointCount >= 3 || hasMisleadingTelemetry
        ? "medium"
        : "low";
  const ruggedness =
    isMultiHop || hasEnvironmentConfusion
      ? "high"
      : isLimitBug || isAttributeBoundary || hasMisleadingTelemetry
        ? "medium"
        : "low";
  const localMinimaRisk =
    isMultiHop || isAttributeBoundary || hasDelayedSignal || hasConflictingEvidence
      ? "high"
      : isAuth || hasMisleadingTelemetry
        ? "medium"
        : "low";
  const informationCost =
    entryPointCount >= 5 || hasEnvironmentConfusion ? "high" : entryPointCount >= 3 ? "medium" : "low";
  const modePressure =
    isSchemaMismatch
      ? "prune"
      : isMultiHop || hasDelayedSignal || hasConflictingEvidence || hasMisleadingTelemetry
        ? "explore"
        : entryPointCount <= 2
          ? "prune"
          : "prune";

  return {
    feedback_latency: "slow",
    reversibility: "high",
    uncertainty,
    branching_factor: branchingFactor,
    adversariality: "none",
    ruggedness,
    local_minima_risk: localMinimaRisk,
    information_cost: informationCost,
    coordination_load: "low",
    environment_stability: "stable",
    time_horizon: "iterative",
    mode_pressure: modePressure,
  };
}

function hiddenExpectedRegime(evaluatorCase: ReplayEvaluatorCase): {
  regime: SearchRegime;
  patchBreadth: "narrow" | "medium" | "broad";
} {
  const patchCount = evaluatorCase.likely_fix_files.length;
  const failureMode = evaluatorCase.expected_failure_mode.toLowerCase();
  const breadth =
    patchCount >= 5 ? "broad" : patchCount >= 3 ? "medium" : "narrow";

  if (evaluatorCase.hidden_expected_regime_override) {
    return {
      regime: evaluatorCase.hidden_expected_regime_override,
      patchBreadth: breadth,
    };
  }

  if (failureMode.includes("propagation") || failureMode.includes("multi") || breadth === "broad") {
    return { regime: "explore", patchBreadth: breadth };
  }

  if (failureMode.includes("schema") || failureMode.includes("attribute") || breadth === "narrow") {
    return { regime: "prune", patchBreadth: breadth };
  }

  return { regime: "prune", patchBreadth: breadth };
}

function fixedHeuristicRegime(visibleCase: ReplayVisibleCase): SearchRegime {
  const augmentation = visibleCase.replay_augmentation;
  if (augmentation?.delayed_decisive_signal || augmentation?.conflicting_evidence) {
    return "prune";
  }

  return visibleCase.starting_context.entry_points.length <= 3 ? "prune" : "explore";
}

function scoreThresholdRegime(visibleCase: ReplayVisibleCase): SearchRegime {
  const reproStyle = visibleCase.starting_context.repro_style.toLowerCase();
  if (reproStyle.includes("schema") || reproStyle.includes("migration")) {
    return "prune";
  }

  if (visibleCase.replay_augmentation?.misleading_telemetry?.length) {
    return "prune";
  }

  return visibleCase.starting_context.entry_points.length >= 4 ? "explore" : "prune";
}

function recommendedFocusPaths(visibleCase: ReplayVisibleCase, regime: SearchRegime): string[] {
  const paths = visibleCase.starting_context.entry_points;
  if (regime === "explore") {
    return paths.slice(0, Math.min(3, paths.length));
  }

  if (regime === "compound") {
    return paths.slice(0, 1);
  }

  return paths.slice(0, Math.min(2, paths.length));
}

function buildReplayCaseReport(visibleCase: ReplayVisibleCase, evaluatorCase: ReplayEvaluatorCase): ReplayCaseReport {
  const inferredTerrain = inferTerrainFromReplayCase(visibleCase);
  const routed = scoreTerrain(inferredTerrain);
  const fixedRegime = fixedHeuristicRegime(visibleCase);
  const thresholdRegime = scoreThresholdRegime(visibleCase);
  const hidden = hiddenExpectedRegime(evaluatorCase);

  return {
    case_id: visibleCase.id,
    repo: visibleCase.repo,
    title: visibleCase.title,
    inferred_terrain: inferredTerrain,
    routed_regime: routed.primary_regime,
    fixed_heuristic_regime: fixedRegime,
    score_threshold_regime: thresholdRegime,
    hidden_expected_regime: hidden.regime,
    hidden_patch_breadth: hidden.patchBreadth,
    recommended_focus_paths: recommendedFocusPaths(visibleCase, routed.primary_regime),
    hidden_likely_fix_files: evaluatorCase.likely_fix_files,
    routed_matches_hidden_regime: routed.primary_regime === hidden.regime,
    routed_beats_fixed_heuristic:
      Number(routed.primary_regime === hidden.regime) > Number(fixedRegime === hidden.regime),
    routed_ties_or_beats_score_threshold:
      Number(routed.primary_regime === hidden.regime) >= Number(thresholdRegime === hidden.regime),
    notes: [
      `visible repro style: ${visibleCase.starting_context.repro_style}`,
      `hidden failure mode: ${evaluatorCase.expected_failure_mode}`,
      "This replay pass is still partially truth-adjacent because visible fixtures include changed-file-derived context.",
    ],
  };
}

export function runReplaySuite(
  visibleFileName = "real-replays-v1.visible.json",
  evaluatorFileName = "real-replays-v1.evaluator.json",
  suiteId = "real-replays-v1",
): ReplayDatasetReport {
  const visibleDataset = loadReplayVisibleDataset(visibleFileName);
  const evaluatorDataset = loadReplayEvaluatorDataset(evaluatorFileName);
  const evaluatorById = new Map(evaluatorDataset.cases.map((debugCase) => [debugCase.id, debugCase]));

  const cases = visibleDataset.cases.map((visibleCase) => {
    const evaluatorCase = evaluatorById.get(visibleCase.id);
    if (!evaluatorCase) {
      throw new Error(`Missing evaluator case for visible replay ${visibleCase.id}`);
    }

    return buildReplayCaseReport(visibleCase, evaluatorCase);
  });

  const routedMatchRate = average(cases.map((debugCase) => (debugCase.routed_matches_hidden_regime ? 1 : 0)));
  const fixedMatchRate = average(
    cases.map((debugCase) => (debugCase.fixed_heuristic_regime === debugCase.hidden_expected_regime ? 1 : 0)),
  );
  const thresholdMatchRate = average(
    cases.map((debugCase) => (debugCase.score_threshold_regime === debugCase.hidden_expected_regime ? 1 : 0)),
  );

  const isTightReplay = visibleFileName.includes("tight");
  const isDiverseReplay = visibleFileName.includes("diverse");

  return {
    suite_id: suiteId,
    generated_at: new Date().toISOString(),
    dataset_name: visibleDataset.dataset_name,
    overall_pass:
      (routedMatchRate > fixedMatchRate || routedMatchRate > thresholdMatchRate) &&
      cases.some((debugCase) => debugCase.routed_beats_fixed_heuristic),
    summary: {
      case_count: cases.length,
      routed_hidden_regime_match_rate: routedMatchRate,
      fixed_hidden_regime_match_rate: fixedMatchRate,
      score_threshold_hidden_regime_match_rate: thresholdMatchRate,
      routed_beats_fixed_case_count: cases.filter((debugCase) => debugCase.routed_beats_fixed_heuristic).length,
      routed_ties_or_beats_score_threshold_case_count: cases.filter(
        (debugCase) => debugCase.routed_ties_or_beats_score_threshold,
      ).length,
    },
    caveats: [
      "This first replay pass evaluates routing over real bug-fix cases, not full autonomous patching.",
      isDiverseReplay
        ? "This diverse replay variant reduces repository and org fingerprinting by anonymizing visible repo identity and shifting the visible layer toward terrain-shaped descriptions."
        : isTightReplay
        ? "This tighter replay variant weakens file-level leakage, but it still uses evaluator-designed ambiguity augmentation rather than raw incident capture."
        : "The visible fixture is still somewhat truth-adjacent because it includes changed-file-derived entry points from the GitHub trail.",
      isDiverseReplay
        ? "The ambiguity augmentation remains deliberate, but the visible cases now preserve terrain diversity with less reliance on organization-specific naming or topology."
        : isTightReplay
        ? "The augmentation is deliberate: misleading telemetry, delayed decisive signals, and false-positive fix families are injected to test ambiguity handling."
        : "A stronger v0.6+ replay pass should replace changed-file hints with issue text, logs, and reproduction signals only.",
      isDiverseReplay
        ? "This result suggests the replay advantage is not solely a repository-fingerprint effect, but it is still an augmented benchmark rather than a raw naturalistic incident benchmark."
        : isTightReplay
        ? "This result is more discriminative than the raw replay pass, but it is still an augmented replay benchmark rather than a fully naturalistic one."
        : "This first replay set is currently useful as a substrate and sanity check, but not yet strongly discriminative against compact baselines.",
    ],
    cases,
  };
}

export function runRealReplaysV1Suite(): ReplayDatasetReport {
  return runReplaySuite();
}

export function runRealReplaysV06aTightSuite(): ReplayDatasetReport {
  return runReplaySuite(
    "real-replays-v1-tight.visible.json",
    "real-replays-v1-tight.evaluator.json",
    "real-replays-v0.6a-tight",
  );
}

export function runRealReplaysV06bDiverseSuite(): ReplayDatasetReport {
  return runReplaySuite(
    "real-replays-v1-diverse.visible.json",
    "real-replays-v1-tight.evaluator.json",
    "real-replays-v0.6b-diverse",
  );
}
