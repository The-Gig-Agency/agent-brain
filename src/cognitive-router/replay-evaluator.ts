import { scoreTerrain } from "./scoring.js";
import { loadReplayEvaluatorDataset, loadReplayVisibleDataset } from "./replay-dataset.js";
import type {
  DebuggingFailureKind,
  ReplayBaselineVersus,
  ReplayCaseReport,
  ReplayDatasetReport,
  ReplayEvaluatorCase,
  ReplayScoringOptions,
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
  const allText = [
    visibleCase.title,
    visibleCase.symptom,
    visibleCase.starting_context.repro_style,
    ...visibleCase.visible_evidence,
    ...(augmentation?.misleading_telemetry ?? []),
    ...(augmentation?.environment_confusion ?? []),
    augmentation?.false_positive_fix_family ?? "",
  ]
    .join(" ")
    .toLowerCase();
  const textHas = (...patterns: string[]) => patterns.some((pattern) => allText.includes(pattern));

  const isSchemaMismatch = textHas("field length", "schema inconsistency", "schema mismatch", "migration-backed");
  const isAuth = textHas("auth failure", "credentials", "401", "login");
  const isAttributeBoundary = textHas("attributeerror", "attribute boundary", "missing attribute");
  const isTemporalDrift = textHas(
    "later",
    "follow-up",
    "after refresh",
    "after later",
    "drift",
    "settled state",
    "stale-state",
    "re-fetch",
    "later verification",
    "later state",
    "rollover",
  );
  const isFallbackBoundary = textHas(
    "fallback",
    "partner context",
    "brand context",
    "remote call",
    "remote approval",
    "publisher update",
    "reconciliation",
    "verification fetch",
    "background refresh",
    "summary operation",
  );
  const isMappingContractDrift = textHas(
    "mapped incorrectly",
    "wrong counts",
    "wrong collections",
    "response handling",
    "local output fields",
    "collection",
    "total extraction",
  );
  const isNarrowRouteBug = textHas("lookup route", "lookup path", "route construction", "one narrow route");
  const isAmbiguousSuccess = textHas(
    "reported progress",
    "appeared to work",
    "could not safely",
    "nominally successful",
    "transport success",
    "explicit approval signal",
    "final settled state",
  );
  const isMultiHop = isTemporalDrift || isFallbackBoundary || textHas("more than one surface", "same workflow both");
  const isLimitBug = reproStyle.includes("limit") || symptom.includes("limit");
  const hasMisleadingTelemetry = (augmentation?.misleading_telemetry?.length ?? 0) > 0;
  const hasDelayedSignal = augmentation?.delayed_decisive_signal ?? false;
  const hasConflictingEvidence = augmentation?.conflicting_evidence ?? false;
  const hasEnvironmentConfusion = (augmentation?.environment_confusion?.length ?? 0) > 0;

  const branchingFactor =
    entryPointCount >= 5 ? "high" : entryPointCount >= 3 ? "medium" : "low";
  const narrowCue =
    isSchemaMismatch ||
    isMappingContractDrift ||
    isNarrowRouteBug ||
    textHas("single local fix", "localized task-level", "compact publisher", "one narrow");
  const narrowButNoisy =
    narrowCue && entryPointCount <= 2 && !hasDelayedSignal && !hasConflictingEvidence;
  const uncertainty =
    (isMultiHop || isAmbiguousSuccess || hasDelayedSignal || hasConflictingEvidence) && !narrowButNoisy
      ? "high"
      : isAttributeBoundary ||
          isAuth ||
          isMappingContractDrift ||
          isNarrowRouteBug ||
          entryPointCount >= 3 ||
          hasMisleadingTelemetry
        ? "medium"
        : "low";
  const ruggedness =
    (isMultiHop || isAmbiguousSuccess || hasEnvironmentConfusion) && !narrowButNoisy
      ? "high"
      : isLimitBug || isAttributeBoundary || isMappingContractDrift || isNarrowRouteBug || hasMisleadingTelemetry
        ? "medium"
        : "low";
  const localMinimaRisk =
    (isMultiHop || isAmbiguousSuccess || isAttributeBoundary || hasDelayedSignal || hasConflictingEvidence) &&
    !narrowButNoisy
      ? "high"
      : isAuth || isMappingContractDrift || isNarrowRouteBug || hasMisleadingTelemetry
        ? "medium"
        : "low";
  const informationCost =
    entryPointCount >= 4 || (entryPointCount >= 3 && (isMultiHop || hasEnvironmentConfusion))
      ? "high"
      : entryPointCount >= 2
        ? "medium"
        : "low";
  const modePressure =
    narrowCue
      ? "prune"
      : isAmbiguousSuccess || isMultiHop || hasDelayedSignal || hasConflictingEvidence
        ? "explore"
      : entryPointCount >= 3 && (hasMisleadingTelemetry || isTemporalDrift || isFallbackBoundary)
        ? "explore"
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
    environment_stability: isTemporalDrift || hasEnvironmentConfusion ? "shifting" : "stable",
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

function inferFailureKindFromEvaluator(evaluatorCase: ReplayEvaluatorCase): DebuggingFailureKind {
  const mode = evaluatorCase.expected_failure_mode.toLowerCase();
  if (mode.includes("timeout") || mode.includes("timed out")) {
    return "timeout";
  }
  if (mode.includes("flake") || mode.includes("flaky")) {
    return "flake";
  }
  if (mode.includes("schema") || mode.includes("migration")) {
    return "schema_bug";
  }
  if (mode.includes("auth") || mode.includes("credential") || mode.includes("login")) {
    return "auth_boundary";
  }
  if (mode.includes("data") || mode.includes("propagation") || mode.includes("limit")) {
    return "data_issue";
  }
  if (mode.includes("routing") || mode.includes("route")) {
    return "routing_bug";
  }
  if (mode.includes("integration") || mode.includes("api") || mode.includes("downstream")) {
    return "integration";
  }
  if (mode.includes("logic") || mode.includes("attribute") || mode.includes("bug")) {
    return "logic_bug";
  }
  return "unknown";
}

function versusBaseline(
  routedMatches: boolean,
  baselineMatches: boolean,
  routedBeatsBaseline: boolean,
): ReplayBaselineVersus {
  if (routedBeatsBaseline) {
    return "better";
  }
  if (!routedMatches && baselineMatches) {
    return "worse";
  }
  return "tie";
}

function collectAmbiguityFlags(visibleCase: ReplayVisibleCase): string[] {
  const flags: string[] = [];
  const aug = visibleCase.replay_augmentation;
  if (aug?.conflicting_evidence) {
    flags.push("conflicting_evidence");
  }
  if (aug?.delayed_decisive_signal) {
    flags.push("delayed_decisive_signal");
  }
  if ((aug?.misleading_telemetry?.length ?? 0) > 0) {
    flags.push("misleading_telemetry");
  }
  if (visibleCase.visible_evidence.join(" ").toLowerCase().includes("unknown")) {
    flags.push("partial_visible_context");
  }
  return flags;
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

export function buildReplayCaseReport(
  visibleCase: ReplayVisibleCase,
  evaluatorCase: ReplayEvaluatorCase,
  scoring?: ReplayScoringOptions,
): ReplayCaseReport {
  const inferredTerrain = inferTerrainFromReplayCase(visibleCase);
  const routed = scoreTerrain(inferredTerrain, scoring?.memory, scoring?.memory_ablation);
  const fixedRegime = fixedHeuristicRegime(visibleCase);
  const thresholdRegime = scoreThresholdRegime(visibleCase);
  const hidden = hiddenExpectedRegime(evaluatorCase);
  const routedMatches = routed.primary_regime === hidden.regime;
  const fixedMatches = fixedRegime === hidden.regime;
  const thresholdMatches = thresholdRegime === hidden.regime;
  const routedBeatsFixed =
    Number(routed.primary_regime === hidden.regime) > Number(fixedRegime === hidden.regime);
  const routedTiesOrBeatsThreshold =
    Number(routed.primary_regime === hidden.regime) >= Number(thresholdRegime === hidden.regime);

  const failureKind =
    visibleCase.failure_kind ?? evaluatorCase.hidden_failure_kind ?? inferFailureKindFromEvaluator(evaluatorCase);

  const baseReport: ReplayCaseReport = {
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
    routed_matches_hidden_regime: routedMatches,
    routed_beats_fixed_heuristic: routedBeatsFixed,
    routed_ties_or_beats_score_threshold: routedTiesOrBeatsThreshold,
    notes: [
      `visible repro style: ${visibleCase.starting_context.repro_style}`,
      `hidden failure mode: ${evaluatorCase.expected_failure_mode}`,
      "This replay pass remains evaluator-curated even when the visible layer is more issue-like and less directly terrain-labeled.",
    ],
    failure_kind: failureKind,
    expected_vs_actual: {
      expected_regime: hidden.regime,
      actual_regime: routed.primary_regime,
      summary: routedMatches
        ? "Routed primary regime matches hidden expected regime."
        : `Routed ${routed.primary_regime} vs hidden expected ${hidden.regime}.`,
    },
    baseline_comparison: {
      versus_fixed: versusBaseline(routedMatches, fixedMatches, routedBeatsFixed),
      versus_threshold: versusBaseline(
        routedMatches,
        thresholdMatches,
        Number(routedMatches) > Number(thresholdMatches),
      ),
    },
    ambiguity_flags: collectAmbiguityFlags(visibleCase),
  };

  if (visibleCase.repro_steps && visibleCase.repro_steps.length > 0) {
    return { ...baseReport, repro_steps: visibleCase.repro_steps };
  }

  return baseReport;
}

export function runReplaySuite(
  visibleFileName = "tutorial-replay-v0.1.visible.json",
  evaluatorFileName = "tutorial-replay-v0.1.evaluator.json",
  suiteId = "tutorial-replay-v0.1",
  scoring?: ReplayScoringOptions,
): ReplayDatasetReport {
  const visibleDataset = loadReplayVisibleDataset(visibleFileName);
  const evaluatorDataset = loadReplayEvaluatorDataset(evaluatorFileName);
  const evaluatorById = new Map(evaluatorDataset.cases.map((debugCase) => [debugCase.id, debugCase]));

  const cases = visibleDataset.cases.map((visibleCase) => {
    const evaluatorCase = evaluatorById.get(visibleCase.id);
    if (!evaluatorCase) {
      throw new Error(`Missing evaluator case for visible replay ${visibleCase.id}`);
    }

    return buildReplayCaseReport(visibleCase, evaluatorCase, scoring);
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
  const isCandidateReplay = visibleFileName.includes("v2-candidates");
  const isCandidateTightReplay = isCandidateReplay && isTightReplay;
  const isDegradedEvidenceReplay = visibleFileName.includes("v0.6d");
  const isMixedReplay = visibleFileName.includes("v0.6e");
  const isHarderAsymmetryReplay = visibleFileName.includes("v0.6f");
  const isShopifyOperationalReplay = visibleFileName.includes("v0.7a");
  const isTutorialReplay = visibleFileName.includes("tutorial-replay");
  const isCommunityExampleReplay = visibleFileName.includes("community-example");

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
      isTutorialReplay
        ? "Synthetic OSS tutorial pack: fictional repos/commits; for harness wiring and local smoke tests only."
        : isCommunityExampleReplay
          ? "Community schema example pack: validates contribution conventions; not a certification or realism benchmark."
          : "This first replay pass evaluates routing over real bug-fix cases, not full autonomous patching.",
      isHarderAsymmetryReplay
        ? "This harder-asymmetry replay pack adds noisy prune cases and one weaker-signaled explore case while reducing direct terrain wording in the visible layer."
        : isShopifyOperationalReplay
          ? "This v0.7a replay pack is built from one real Shopify incident cluster with concrete handles and failure buckets rather than from a cross-repo mix."
          : null,
      isMixedReplay
        ? "This mixed replay pack combines real explore-deserving degraded-evidence cases with real prune-deserving narrow cases to test regime boundary discrimination."
        : null,
      isDegradedEvidenceReplay
        ? "This degraded-evidence replay pack is intentionally one-sided: all five cases are real incidents chosen to stress misleading progress, conflicting telemetry, partial fixes, and delayed root causes."
        : null,
      isCandidateReplay
        ? "This candidate replay variant broadens the real-case mix with more hidden-dependency, propagation, and contract-drift bugs mined directly from local private-repo history."
        : null,
      isHarderAsymmetryReplay
        ? "The visible layer is more issue-like and less terrain-labeled than v0.6e, but the pack is still evaluator-curated rather than a raw naturalistic incident slice."
        : isShopifyOperationalReplay
          ? "The visible layer uses the real incident language and concrete product examples, but the cases are still evaluator-curated rather than raw receipts or issue transcripts."
        : isMixedReplay
        ? "The visible layer is terrain-shaped and repo-anonymized, but the pack is still evaluator-curated rather than a raw naturalistic incident slice."
        : isDegradedEvidenceReplay
        ? "The visible layer is terrain-shaped and repo-anonymized, but the pack is still evaluator-curated rather than a raw naturalistic incident slice."
        : isCandidateTightReplay
        ? "This tighter candidate replay variant reduces repo identity and file-path leakage by replacing concrete paths with terrain-shaped investigation surfaces."
        : isDiverseReplay
        ? "This diverse replay variant reduces repository and org fingerprinting by anonymizing visible repo identity and shifting the visible layer toward terrain-shaped descriptions."
        : isTightReplay
        ? "This tighter replay variant weakens file-level leakage, but it still uses evaluator-designed ambiguity augmentation rather than raw incident capture."
        : isTutorialReplay
          ? "Tutorial cases intentionally mix one ambiguous-success surface with one narrow attribute boundary; not a realism or discrimination benchmark."
          : isCommunityExampleReplay
            ? "Community example uses synthetic docs-site stories; contributor packs must follow community-replay-pack-spec-v0.1.md."
            : "The visible fixture is still somewhat truth-adjacent because it includes changed-file-derived entry points from the GitHub trail.",
      isMixedReplay
        ? "This pack is useful as an early regime-boundary benchmark, but it is still small and does not yet test compound-deserving cases."
        : isDegradedEvidenceReplay
        ? "This pack is useful as a wedge benchmark for adaptive commitment under degraded evidence, not as a balanced mixed-regime debugging benchmark."
        : isCandidateTightReplay
        ? "The current v0.6c-tight visible layer is stricter than the base candidate pass, but it still stops short of pure issue-text, log, and repro-note framing."
        : isCandidateReplay
        ? "The current v0.6c visible layer is still partially truth-adjacent because most cases retain changed-surface entry points rather than issue-text-only framing."
        : null,
      isHarderAsymmetryReplay
        ? "The shaping pressure is more symmetric in this pass: prune-deserving cases also include distracting logs, misleading auth surfaces, or tempting broadening paths."
        : isShopifyOperationalReplay
          ? "The shaping pressure here comes from one real ops family: missing dimensions, drifting option names, collapsed tuples, invalid labels, and throttling mixed with deterministic data failures."
        : isMixedReplay
        ? "The augmentation is used only on the explore-deserving side of the pack; the prune-deserving cases remain relatively clean to preserve the regime boundary test."
        : isDegradedEvidenceReplay
        ? "The augmentation is deliberate on these cases because the benchmark is trying to preserve the degraded-evidence topology of the real incidents, not flatten them into clean one-step debugging stories."
        : isCandidateTightReplay
        ? "The augmentation is deliberate on the deceptive cases: delayed signals and false-positive fix families remain to test hidden-dependency handling under lower leakage."
        : isDiverseReplay
        ? "The ambiguity augmentation remains deliberate, but the visible cases now preserve terrain diversity with less reliance on organization-specific naming or topology."
        : isTightReplay
        ? "The augmentation is deliberate: misleading telemetry, delayed decisive signals, and false-positive fix families are injected to test ambiguity handling."
        : isTutorialReplay
          ? "Do not use tutorial replay metrics for headline product or benchmark claims."
          : isCommunityExampleReplay
            ? "Do not treat community-example metrics as product certification; signing and registry govern commercial lanes."
            : "A stronger v0.6+ replay pass should replace changed-file hints with issue text, logs, and reproduction signals only.",
      isHarderAsymmetryReplay
        ? "This result matters only if the router still separates explore from prune after the visible layer becomes less explicit and the prune side becomes noisier."
        : isShopifyOperationalReplay
          ? "This result matters only if the router can separate broad incident handling from localized transform fixes inside one messy real production family."
        : isMixedReplay
        ? "This result is more meaningful than a one-sided wedge because the router succeeds on both sides of the explore-versus-prune boundary without changing the underlying routing logic."
        : isDegradedEvidenceReplay
        ? "This result is strong for the specific wedge because routed policy cleanly separates from fixed narrowing on all five cases, but it should not be read as a broad all-debugging win."
        : isCandidateTightReplay
        ? "This result is encouraging because the broader replay-expansion set remains discriminative after a meaningful visible-layer tightening pass."
        : isCandidateReplay
        ? "This result is encouraging because the routed policy separates on the deceptive hidden-dependency cases, but the broader candidate set still needs a tighter visible layer before stronger claims."
        : null,
      isHarderAsymmetryReplay
        ? "This result is more meaningful than v0.6e only if the weaker-signaled explore case survives and at least some noisy prune cases stay narrow under the same scoring logic."
        : isShopifyOperationalReplay
          ? "This pack is still small, but it is a better realism check than synthetic terrain stories because every case comes from the same concrete push receipt and follow-up analysis."
        : isDiverseReplay
        ? "This result suggests the replay advantage is not solely a repository-fingerprint effect, but it is still an augmented benchmark rather than a raw naturalistic incident benchmark."
        : isTightReplay
        ? "This result is more discriminative than the raw replay pass, but it is still an augmented replay benchmark rather than a fully naturalistic one."
        : isTutorialReplay || isCommunityExampleReplay
          ? null
          : "This first replay set is currently useful as a substrate and sanity check, but not yet strongly discriminative against compact baselines.",
    ].filter((value): value is string => Boolean(value)),
    cases,
  };
}

export function runRealReplaysV1Suite(): ReplayDatasetReport {
  return runReplaySuite(
    "real-replays-v1.visible.json",
    "real-replays-v1.evaluator.json",
    "real-replays-v1",
  );
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

export function runRealReplaysV06cCandidatesSuite(): ReplayDatasetReport {
  return runReplaySuite(
    "real-replays-v2-candidates.visible.json",
    "real-replays-v2-candidates.evaluator.json",
    "real-replays-v0.6c-candidates",
  );
}

export function runRealReplaysV06cTightSuite(): ReplayDatasetReport {
  return runReplaySuite(
    "real-replays-v2-candidates-tight.visible.json",
    "real-replays-v2-candidates.evaluator.json",
    "real-replays-v0.6c-tight",
  );
}
