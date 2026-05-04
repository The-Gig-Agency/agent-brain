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

  const isSchemaMismatch = reproStyle.includes("schema") || symptom.includes("field length");
  const isAuth = reproStyle.includes("auth") || symptom.includes("login");
  const isAttributeBoundary = reproStyle.includes("attribute") || symptom.includes("attributeerror");
  const isMultiHop = reproStyle.includes("multi-hop") || symptom.includes("limits were calculated");
  const isLimitBug = reproStyle.includes("limit") || symptom.includes("limit");

  const branchingFactor =
    entryPointCount >= 5 ? "high" : entryPointCount >= 3 ? "medium" : "low";
  const uncertainty =
    isMultiHop ? "high" : isAttributeBoundary || isAuth || entryPointCount >= 3 ? "medium" : "low";
  const ruggedness = isMultiHop ? "high" : isLimitBug || isAttributeBoundary ? "medium" : "low";
  const localMinimaRisk = isMultiHop || isAttributeBoundary ? "high" : isAuth ? "medium" : "low";
  const informationCost = entryPointCount >= 5 ? "high" : entryPointCount >= 3 ? "medium" : "low";
  const modePressure =
    isSchemaMismatch || entryPointCount <= 2 ? "prune" : isMultiHop ? "explore" : "prune";

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

  if (failureMode.includes("propagation") || failureMode.includes("multi") || breadth === "broad") {
    return { regime: "explore", patchBreadth: breadth };
  }

  if (failureMode.includes("schema") || failureMode.includes("attribute") || breadth === "narrow") {
    return { regime: "prune", patchBreadth: breadth };
  }

  return { regime: "prune", patchBreadth: breadth };
}

function fixedHeuristicRegime(visibleCase: ReplayVisibleCase): SearchRegime {
  return visibleCase.starting_context.entry_points.length <= 3 ? "prune" : "explore";
}

function scoreThresholdRegime(visibleCase: ReplayVisibleCase): SearchRegime {
  const reproStyle = visibleCase.starting_context.repro_style.toLowerCase();
  if (reproStyle.includes("schema") || reproStyle.includes("migration")) {
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

export function runRealReplaysV1Suite(): ReplayDatasetReport {
  const visibleDataset = loadReplayVisibleDataset();
  const evaluatorDataset = loadReplayEvaluatorDataset();
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

  return {
    suite_id: "real-replays-v1",
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
      "The visible fixture is still somewhat truth-adjacent because it includes changed-file-derived entry points from the GitHub trail.",
      "A stronger v0.6+ replay pass should replace changed-file hints with issue text, logs, and reproduction signals only.",
      "This first replay set is currently useful as a substrate and sanity check, but not yet strongly discriminative against compact baselines.",
    ],
    cases,
  };
}
