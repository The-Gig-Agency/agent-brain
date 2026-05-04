import type {
  DebugEvalCase,
  DebugFamily,
  DebugHiddenTruth,
  DebugObservation,
  HiddenDebugActionEffect,
  TerrainProfile,
  VisibleDebugAction,
} from "./types.js";

type CaseSpec = {
  caseId: string;
  title: string;
  prompt: string;
  rootCause: DebugFamily;
  distractors: [DebugFamily, DebugFamily];
  budget: number;
  terrain: TerrainProfile;
  stratum?: "train" | "holdout";
  logSignalFamily?: DebugFamily;
  logSignalStrength?: 1 | 2;
  falsePositiveInspectFamilies?: DebugFamily[];
  successSignalThreshold?: number;
  familyOrder?: DebugFamily[];
};

const DEBUG_FAMILY_POOL: DebugFamily[] = [
  "dependency",
  "version",
  "test_flake",
  "regression",
  "env",
  "secret_scope",
  "cache",
  "logic",
  "validation",
  "downstream_api",
  "race",
  "stale_state",
  "retry_policy",
  "outage",
  "schema",
  "serialization",
  "permission",
  "artifact",
  "observability",
];

function familyLabel(family: DebugFamily): string {
  return family.replaceAll("_", " ");
}

function createObservation(
  id: string,
  family: DebugFamily,
  polarity: "positive" | "negative",
  strength: 1 | 2 | 3,
  text: string,
): DebugObservation {
  return { id, family, polarity, strength, text };
}

function createCase(spec: CaseSpec): DebugEvalCase {
  const families: DebugFamily[] = spec.familyOrder ?? [...spec.distractors, spec.rootCause];
  const availableActions: VisibleDebugAction[] = [
    { id: "inspect:logs", label: "Inspect logs and error traces", family: spec.rootCause, kind: "inspect", cost: 1 },
    ...families.flatMap((family) => [
      {
        id: `inspect:${family}`,
        label: `Inspect ${familyLabel(family)} path`,
        family,
        kind: "inspect" as const,
        cost: 2,
      },
      {
        id: `fix:${family}`,
        label: `Attempt ${familyLabel(family)} fix`,
        family,
        kind: "fix" as const,
        cost: 3,
      },
    ]),
  ];

  const effects: Record<string, HiddenDebugActionEffect> = {};
  const logSignalFamily = spec.logSignalFamily ?? spec.rootCause;
  const logSignalStrength = spec.logSignalStrength ?? 1;

  effects["inspect:logs"] = {
    action_id: "inspect:logs",
    success: false,
    retryable: true,
    observations: [
      createObservation(
        `${spec.caseId}:logs:root`,
        logSignalFamily,
        "positive",
        logSignalStrength,
        `Logs weakly implicate ${familyLabel(logSignalFamily)} behavior.`,
      ),
    ],
  };

  for (const family of families) {
    const inspectId = `inspect:${family}`;
    const fixId = `fix:${family}`;

    effects[inspectId] = {
      action_id: inspectId,
      success: false,
      retryable: true,
      observations:
        family === spec.rootCause
          ? [
              createObservation(
                `${spec.caseId}:${family}:positive`,
                family,
                "positive",
                3,
                `Inspection shows strong evidence of ${familyLabel(family)} as the failing path.`,
              ),
            ]
          : spec.falsePositiveInspectFamilies?.includes(family)
            ? [
                createObservation(
                  `${spec.caseId}:${family}:false-positive`,
                  family,
                  "positive",
                  1,
                  `Inspection produces weak but misleading evidence for ${familyLabel(family)}.`,
                ),
              ]
          : [
              createObservation(
                `${spec.caseId}:${family}:negative`,
                family,
                "negative",
                2,
                `Inspection rules out ${familyLabel(family)} as the primary issue.`,
              ),
            ],
    };

    const fixEffect: HiddenDebugActionEffect = {
      action_id: fixId,
      success: family === spec.rootCause,
      retryable: family !== spec.rootCause,
      observations:
        family === spec.rootCause
          ? [
              createObservation(
                `${spec.caseId}:${family}:resolved`,
                family,
                "positive",
                2,
                `The ${familyLabel(family)} fix resolves the failure.`,
              ),
            ]
          : [
              createObservation(
                `${spec.caseId}:${family}:failed-fix`,
                family,
                "negative",
                2,
                `The ${familyLabel(family)} fix does not change the failing behavior.`,
              ),
            ],
    };
    if (family === spec.rootCause) {
      fixEffect.signal_threshold = spec.successSignalThreshold ?? 1;
    }
    effects[fixId] = fixEffect;
  }

  const hiddenTruth: DebugHiddenTruth = {
    root_cause: spec.rootCause,
    effects,
  };

  return {
    case_id: spec.caseId,
    title: spec.title,
    stratum: spec.stratum ?? "train",
    input_context: {
      case_id: spec.caseId,
      title: spec.title,
      prompt: spec.prompt,
      terrain: spec.terrain,
      budget: spec.budget,
      available_actions: availableActions,
    },
    hidden_truth: hiddenTruth,
    expected_primary: spec.terrain.mode_pressure === "compound" ? "compound" : "explore",
    acceptable_regimes:
      spec.terrain.mode_pressure === "compound" ? ["compound", "prune"] : ["explore", "prune"],
  };
}

const debuggingTerrain = (
  modePressure: TerrainProfile["mode_pressure"],
  uncertainty: TerrainProfile["uncertainty"],
  localMinimaRisk: TerrainProfile["local_minima_risk"],
): TerrainProfile => ({
  feedback_latency: "fast",
  reversibility: "high",
  uncertainty,
  branching_factor: "high",
  adversariality: "none",
  ruggedness: "medium",
  local_minima_risk: localMinimaRisk,
  information_cost: "low",
  coordination_load: "low",
  environment_stability: "stable",
  time_horizon: "iterative",
  mode_pressure: modePressure,
});

/** Same as debuggingTerrain but marks shifting production context (drift / recovery pressure). */
const debuggingTerrainShifting = (
  modePressure: TerrainProfile["mode_pressure"],
  uncertainty: TerrainProfile["uncertainty"],
  localMinimaRisk: TerrainProfile["local_minima_risk"],
): TerrainProfile => ({
  ...debuggingTerrain(modePressure, uncertainty, localMinimaRisk),
  environment_stability: "shifting",
});

const antiBroadeningTerrain = (): TerrainProfile => ({
  feedback_latency: "fast",
  reversibility: "high",
  uncertainty: "low",
  branching_factor: "medium",
  adversariality: "none",
  ruggedness: "low",
  local_minima_risk: "low",
  information_cost: "high",
  coordination_load: "low",
  environment_stability: "stable",
  time_horizon: "one_shot",
  mode_pressure: "prune",
});

export const DEBUGGING_V1_CASES: DebugEvalCase[] = [
  createCase({
    caseId: "debug-v1-01",
    title: "Missing dependency vs wrong dependency version",
    prompt: "A build started failing after a package refresh. It may be missing a package or resolving the wrong version.",
    rootCause: "version",
    distractors: ["dependency", "artifact"],
    budget: 10,
    terrain: debuggingTerrain("explore", "high", "medium"),
  }),
  createCase({
    caseId: "debug-v1-02",
    title: "Flaky test vs real regression",
    prompt: "A test fails intermittently in CI. The team is split between a flaky harness issue and a real regression.",
    rootCause: "test_flake",
    distractors: ["regression", "race"],
    budget: 10,
    terrain: debuggingTerrain("explore", "high", "high"),
  }),
  createCase({
    caseId: "debug-v1-03",
    title: "Env var mismatch vs bad secret scope",
    prompt: "Production requests fail after deploy. The likely causes are a bad env var value or secret scope mismatch.",
    rootCause: "secret_scope",
    distractors: ["env", "permission"],
    budget: 10,
    terrain: debuggingTerrain("explore", "high", "medium"),
  }),
  createCase({
    caseId: "debug-v1-04",
    title: "Cache issue vs logic bug",
    prompt: "Users see stale content. The team suspects cache invalidation or a logic bug in recomputation.",
    rootCause: "cache",
    distractors: ["logic", "stale_state"],
    budget: 9,
    terrain: debuggingTerrain("prune", "medium", "medium"),
  }),
  createCase({
    caseId: "debug-v1-05",
    title: "Bad input validation vs downstream API failure",
    prompt: "Checkout requests fail for some payloads. It may be local validation or a downstream API contract problem.",
    rootCause: "validation",
    distractors: ["downstream_api", "serialization"],
    budget: 10,
    terrain: debuggingTerrain("explore", "high", "medium"),
  }),
  createCase({
    caseId: "debug-v1-06",
    title: "Race condition vs stale state",
    prompt: "A user session breaks under rapid repeated actions. Engineers suspect a race or stale state read.",
    rootCause: "race",
    distractors: ["stale_state", "logic"],
    budget: 11,
    terrain: debuggingTerrain("explore", "high", "high"),
  }),
  createCase({
    caseId: "debug-v1-07",
    title: "Broken retry policy vs transient outage",
    prompt: "Workers are timing out. The team is split between transient outage and a broken retry policy causing collapse.",
    rootCause: "retry_policy",
    distractors: ["outage", "downstream_api"],
    budget: 10,
    terrain: debuggingTerrain("prune", "medium", "medium"),
  }),
  createCase({
    caseId: "debug-v1-08",
    title: "Schema drift vs serialization bug",
    prompt: "A consumer cannot parse produced events. Likely schema drift or a serialization bug in the producer.",
    rootCause: "schema",
    distractors: ["serialization", "artifact"],
    budget: 10,
    terrain: debuggingTerrain("explore", "high", "medium"),
  }),
  createCase({
    caseId: "debug-v1-09",
    title: "Permission issue vs missing deployment artifact",
    prompt: "A background job fails only in prod. It may be missing permissions or a deployment artifact.",
    rootCause: "permission",
    distractors: ["artifact", "env"],
    budget: 9,
    terrain: debuggingTerrain("prune", "medium", "medium"),
  }),
  createCase({
    caseId: "debug-v1-10",
    title: "Silent failure vs observability gap",
    prompt: "A workflow stops progressing with no obvious error. It may be a silent internal failure or a missing observability path.",
    rootCause: "observability",
    distractors: ["logic", "retry_policy"],
    budget: 11,
    terrain: debuggingTerrain("explore", "high", "high"),
  }),
];

export const DEBUGGING_V1_HOLDOUT_CASES: DebugEvalCase[] = [
  createCase({
    caseId: "debug-v1-holdout-01",
    title: "Dependency path vs permission path in release packaging",
    prompt: "A release build breaks in staging after packaging changes. The likely causes are dependency pathing or permission handling.",
    rootCause: "dependency",
    distractors: ["permission", "artifact"],
    budget: 10,
    terrain: debuggingTerrain("explore", "high", "medium"),
    stratum: "holdout",
  }),
  createCase({
    caseId: "debug-v1-holdout-02",
    title: "Regression vs stale state after queue refactor",
    prompt: "A queue refactor introduced odd processing order. The likely causes are a real regression or stale state assumptions.",
    rootCause: "regression",
    distractors: ["stale_state", "race"],
    budget: 10,
    terrain: debuggingTerrain("prune", "medium", "medium"),
    stratum: "holdout",
  }),
];

export const DEBUGGING_CORE_V01_CASES: DebugEvalCase[] = DEBUGGING_V1_CASES.filter((debugCase) =>
  ["debug-v1-01", "debug-v1-02", "debug-v1-03", "debug-v1-06", "debug-v1-10"].includes(debugCase.case_id),
);

export const DEBUGGING_CORE_V02_CASES: DebugEvalCase[] = [
  ...DEBUGGING_CORE_V01_CASES,
  createCase({
    caseId: "debug-core-v02-01",
    title: "Misleading dependency clue hides version failure",
    prompt: "The logs point at a dependency problem, but the real breakage may come from a version mismatch deeper in the stack.",
    rootCause: "version",
    distractors: ["dependency", "artifact"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "high"),
    logSignalFamily: "dependency",
    falsePositiveInspectFamilies: ["dependency"],
    successSignalThreshold: 3,
  }),
  createCase({
    caseId: "debug-core-v02-02",
    title: "Cache-looking signal masks stale-state bug",
    prompt: "Users see stale behavior and the first clue points at cache invalidation, but that clue may be misleading.",
    rootCause: "stale_state",
    distractors: ["cache", "logic"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "high"),
    logSignalFamily: "cache",
    falsePositiveInspectFamilies: ["cache"],
    successSignalThreshold: 3,
  }),
  createCase({
    caseId: "debug-core-v02-03",
    title: "Permission-looking symptom masks secret-scope issue",
    prompt: "A deploy fails with auth-like symptoms, but the visible permission path may be a false lead.",
    rootCause: "secret_scope",
    distractors: ["permission", "env"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "medium"),
    logSignalFamily: "permission",
    falsePositiveInspectFamilies: ["permission"],
    successSignalThreshold: 3,
  }),
];

export const DEBUGGING_CORE_V03_REVERSAL_CASES: DebugEvalCase[] = [
  createCase({
    caseId: "debug-core-v03-reversal-01",
    title: "Two dependency-looking clues hide a version failure",
    prompt: "The first two observations both reinforce a dependency suspicion, but the decisive signal arrives later from a version path.",
    rootCause: "version",
    distractors: ["dependency", "artifact"],
    familyOrder: ["dependency", "artifact", "version"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "high"),
    logSignalFamily: "dependency",
    falsePositiveInspectFamilies: ["dependency", "artifact"],
    successSignalThreshold: 3,
  }),
  createCase({
    caseId: "debug-core-v03-reversal-02",
    title: "Permission and env clues mask a secret-scope bug",
    prompt: "Auth-like symptoms first reinforce the visible permission and env paths before a later signal reveals a secret-scope issue.",
    rootCause: "secret_scope",
    distractors: ["permission", "env"],
    familyOrder: ["permission", "env", "secret_scope"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "medium"),
    logSignalFamily: "permission",
    falsePositiveInspectFamilies: ["permission", "env"],
    successSignalThreshold: 3,
  }),
  createCase({
    caseId: "debug-core-v03-reversal-03",
    title: "Cache then logic clues hide a stale-state defect",
    prompt: "Early evidence first makes cache and then logic look plausible before a later stale-state signal flips the answer.",
    rootCause: "stale_state",
    distractors: ["cache", "logic"],
    familyOrder: ["cache", "logic", "stale_state"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "high"),
    logSignalFamily: "cache",
    falsePositiveInspectFamilies: ["cache", "logic"],
    successSignalThreshold: 3,
  }),
];

export const DEBUGGING_CORE_V04_TRAP_CASES: DebugEvalCase[] = [
  createCase({
    caseId: "debug-core-v04-trap-01",
    title: "Direct version clue should not trigger broad exploration",
    prompt: "A deployment break shows a clear version-like signature and the budget is tight enough that broad exploration is wasteful.",
    rootCause: "version",
    distractors: ["dependency", "artifact"],
    budget: 6,
    terrain: antiBroadeningTerrain(),
    logSignalFamily: "version",
    logSignalStrength: 2,
    successSignalThreshold: 2,
  }),
  createCase({
    caseId: "debug-core-v04-trap-02",
    title: "Direct permission clue rewards simple narrowing",
    prompt: "A prod-only failure emits a strong permission-shaped clue. The search space is small and over-broadening should be punished.",
    rootCause: "permission",
    distractors: ["env", "artifact"],
    budget: 6,
    terrain: antiBroadeningTerrain(),
    logSignalFamily: "permission",
    logSignalStrength: 2,
    successSignalThreshold: 2,
  }),
  createCase({
    caseId: "debug-core-v04-trap-03",
    title: "Cache clue is strong enough that drama should lose",
    prompt: "The first signal is already strong enough to justify a narrow cache path, so extra exploration should only burn budget.",
    rootCause: "cache",
    distractors: ["logic", "stale_state"],
    budget: 6,
    terrain: antiBroadeningTerrain(),
    logSignalFamily: "cache",
    logSignalStrength: 2,
    successSignalThreshold: 2,
  }),
];

export const DEBUGGING_CORE_V05_ANTI_TRANSITION_CASES: DebugEvalCase[] = [
  createCase({
    caseId: "debug-core-v05-anti-transition-01",
    title: "Strong log clue should not trigger immediate compounding",
    prompt: "A strong dependency-looking log clue arrives early, but switching into compounding before targeted inspection would be a mistake.",
    rootCause: "version",
    distractors: ["dependency", "artifact"],
    budget: 7,
    terrain: debuggingTerrain("prune", "medium", "medium"),
    logSignalFamily: "dependency",
    logSignalStrength: 2,
    falsePositiveInspectFamilies: ["dependency"],
    successSignalThreshold: 3,
  }),
  createCase({
    caseId: "debug-core-v05-anti-transition-02",
    title: "Temporary auth noise should not force a fast switch",
    prompt: "An auth-shaped clue looks strong at first, but the right move is to stay in pruning until targeted inspection rules out the false lead.",
    rootCause: "secret_scope",
    distractors: ["permission", "env"],
    budget: 7,
    terrain: debuggingTerrain("prune", "medium", "medium"),
    logSignalFamily: "permission",
    logSignalStrength: 2,
    falsePositiveInspectFamilies: ["permission"],
    successSignalThreshold: 3,
  }),
  createCase({
    caseId: "debug-core-v05-anti-transition-03",
    title: "Cache-like symptom should not cause premature commitment",
    prompt: "A cache-looking signal is only temporary noise. The router should resist switching until inspected evidence firms up.",
    rootCause: "stale_state",
    distractors: ["cache", "logic"],
    budget: 7,
    terrain: debuggingTerrain("prune", "medium", "high"),
    logSignalFamily: "cache",
    logSignalStrength: 2,
    falsePositiveInspectFamilies: ["cache"],
    successSignalThreshold: 3,
  }),
];

export const DEBUGGING_CORE_V05_REPLAY_CASES: DebugEvalCase[] = [
  createCase({
    caseId: "debug-core-v05-replay-01",
    title: "Replay-style deploy incident with contradictory clues",
    prompt: "In the original incident, engineers chased a permission symptom before discovering a secret-scope issue after several noisy observations.",
    rootCause: "secret_scope",
    distractors: ["permission", "env"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "high"),
    logSignalFamily: "permission",
    logSignalStrength: 2,
    falsePositiveInspectFamilies: ["permission", "env"],
    successSignalThreshold: 3,
    familyOrder: ["permission", "env", "secret_scope"],
  }),
  createCase({
    caseId: "debug-core-v05-replay-02",
    title: "Replay-style stale-session bug with partial-fix feel",
    prompt: "The incident history suggests a cache-looking symptom, then a logic guess, before the real stale-state issue becomes clear.",
    rootCause: "stale_state",
    distractors: ["cache", "logic"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "high"),
    logSignalFamily: "cache",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["cache", "logic"],
    successSignalThreshold: 3,
    familyOrder: ["cache", "logic", "stale_state"],
  }),
  createCase({
    caseId: "debug-core-v05-replay-03",
    title: "Replay-style build break with misleading dependency blame",
    prompt: "The original debugging path over-weighted dependency blame before version evidence finally resolved the incident.",
    rootCause: "version",
    distractors: ["dependency", "artifact"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "high"),
    logSignalFamily: "dependency",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["dependency", "artifact"],
    successSignalThreshold: 3,
    familyOrder: ["dependency", "artifact", "version"],
  }),
];

/**
 * Candidate lane (mutable): transition trap families for Week-1 style measurement.
 * Not frozen — do not use for longitudinal frozen claims.
 */
export const DEBUGGING_TRANSITION_CANDIDATE_V01_CASES: DebugEvalCase[] = [
  createCase({
    caseId: "candidate-tf01-early-switch",
    title: "[Candidate trap: early switch] Strong log clue should not force immediate compounding",
    prompt:
      "A strong dependency-looking log clue arrives early, but switching into compounding before targeted inspection would be a mistake.",
    rootCause: "version",
    distractors: ["dependency", "artifact"],
    budget: 7,
    terrain: debuggingTerrain("prune", "medium", "medium"),
    logSignalFamily: "dependency",
    logSignalStrength: 2,
    falsePositiveInspectFamilies: ["dependency"],
    successSignalThreshold: 3,
  }),
  createCase({
    caseId: "candidate-tf01-late-switch",
    title: "[Candidate trap: late switch] Misleading dependency blame before version evidence firms up",
    prompt:
      "The original debugging path over-weighted dependency blame before version evidence finally resolved the incident.",
    rootCause: "version",
    distractors: ["dependency", "artifact"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "high"),
    logSignalFamily: "dependency",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["dependency", "artifact"],
    successSignalThreshold: 3,
    familyOrder: ["dependency", "artifact", "version"],
  }),
  createCase({
    caseId: "candidate-tf01-drift-miss",
    title: "[Candidate trap: drift miss] Shifting metrics while chasing cache vs logic vs stale state",
    prompt:
      "Production metrics shift while you are mid-incident; early cache and logic strands look plausible before stale-state becomes decisive.",
    rootCause: "stale_state",
    distractors: ["cache", "logic"],
    budget: 10,
    terrain: debuggingTerrainShifting("explore", "high", "high"),
    logSignalFamily: "cache",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["cache", "logic"],
    successSignalThreshold: 3,
    familyOrder: ["cache", "logic", "stale_state"],
  }),
  createCase({
    caseId: "candidate-tf01-partial-overcommit",
    title: "[Candidate trap: partial-success overcommit] Test progress masks a deeper race",
    prompt:
      "A change looks helpful in tests but production still looks flaky. It may be a partial fix or a deeper race.",
    rootCause: "race",
    distractors: ["test_flake", "regression"],
    budget: 9,
    terrain: debuggingTerrain("explore", "high", "medium"),
    logSignalFamily: "test_flake",
    falsePositiveInspectFamilies: ["test_flake", "regression"],
    successSignalThreshold: 3,
    familyOrder: ["test_flake", "regression", "race"],
  }),
  createCase({
    caseId: "candidate-tf01-false-convergence",
    title: "[Candidate trap: false convergence] Noisy deploy with tight budget",
    prompt: "Deploy failed with mixed signals. Several families look plausible at first glance and the budget is tight.",
    rootCause: "version",
    distractors: ["dependency", "artifact"],
    budget: 4,
    terrain: debuggingTerrain("explore", "high", "high"),
    logSignalFamily: "dependency",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["dependency", "artifact"],
    successSignalThreshold: 3,
    familyOrder: ["dependency", "artifact", "version"],
  }),
];

/**
 * Expanded candidate lane (mutable): 20 cases = v0.1 trap mirrors + paraphrase variants + boundary mix.
 * Not frozen. Prefer for volume experiments; keep v0.1 for tight regression slices.
 */
export const DEBUGGING_TRANSITION_CANDIDATE_V02_CASES: DebugEvalCase[] = [
  createCase({
    caseId: "candidate-tf02-m01-early-switch",
    title: "[v0.2 mirror] Early compound pressure with strong log lead-in",
    prompt:
      "Logs show a loud dependency-shaped signature early on; compounding before a targeted inspect would over-commit.",
    rootCause: "version",
    distractors: ["dependency", "artifact"],
    budget: 7,
    terrain: debuggingTerrain("prune", "medium", "medium"),
    logSignalFamily: "dependency",
    logSignalStrength: 2,
    falsePositiveInspectFamilies: ["dependency"],
    successSignalThreshold: 3,
  }),
  createCase({
    caseId: "candidate-tf02-m02-late-switch",
    title: "[v0.2 mirror] Dependency blame lingers before version becomes decisive",
    prompt:
      "Engineers stayed on dependency and packaging hypotheses until late merge evidence pointed at a concrete version skew.",
    rootCause: "version",
    distractors: ["dependency", "artifact"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "high"),
    logSignalFamily: "dependency",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["dependency", "artifact"],
    successSignalThreshold: 3,
    familyOrder: ["dependency", "artifact", "version"],
  }),
  createCase({
    caseId: "candidate-tf02-m03-drift-miss",
    title: "[v0.2 mirror] Live metrics drift while cache vs logic vs stale state compete",
    prompt:
      "Dashboards move underfoot mid-triage; cache and logic narratives look credible until stale-session evidence wins.",
    rootCause: "stale_state",
    distractors: ["cache", "logic"],
    budget: 10,
    terrain: debuggingTerrainShifting("explore", "high", "high"),
    logSignalFamily: "cache",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["cache", "logic"],
    successSignalThreshold: 3,
    familyOrder: ["cache", "logic", "stale_state"],
  }),
  createCase({
    caseId: "candidate-tf02-m04-partial-overcommit",
    title: "[v0.2 mirror] CI green but prod still wobbly — race under flake smoke",
    prompt:
      "Tests look greener after a patch, yet production jitter persists; distinguish a deeper race from harness flake.",
    rootCause: "race",
    distractors: ["test_flake", "regression"],
    budget: 9,
    terrain: debuggingTerrain("explore", "high", "medium"),
    logSignalFamily: "test_flake",
    falsePositiveInspectFamilies: ["test_flake", "regression"],
    successSignalThreshold: 3,
    familyOrder: ["test_flake", "regression", "race"],
  }),
  createCase({
    caseId: "candidate-tf02-m05-false-convergence",
    title: "[v0.2 mirror] Tight budget noisy rollout",
    prompt: "Release train is noisy, evidence is thin, and burn-down is aggressive; several hypotheses look equally plausible.",
    rootCause: "version",
    distractors: ["dependency", "artifact"],
    budget: 4,
    terrain: debuggingTerrain("explore", "high", "high"),
    logSignalFamily: "dependency",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["dependency", "artifact"],
    successSignalThreshold: 3,
    familyOrder: ["dependency", "artifact", "version"],
  }),
  createCase({
    caseId: "candidate-tf02-p01-early-switch",
    title: "[Paraphrase] Logs scream dependency; do not compound prematurely",
    prompt:
      "First-line telemetry reads like a dependency regression; still, jumping straight to compounding skips necessary inspect work.",
    rootCause: "version",
    distractors: ["dependency", "artifact"],
    budget: 7,
    terrain: debuggingTerrain("prune", "medium", "medium"),
    logSignalFamily: "dependency",
    logSignalStrength: 2,
    falsePositiveInspectFamilies: ["dependency"],
    successSignalThreshold: 3,
  }),
  createCase({
    caseId: "candidate-tf02-p02-late-switch",
    title: "[Paraphrase] Packaging rabbit hole before semver truth",
    prompt:
      "The team cycles dependency and artifact theories while the real answer waits on a narrow version skew discovered late.",
    rootCause: "version",
    distractors: ["dependency", "artifact"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "high"),
    logSignalFamily: "dependency",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["dependency", "artifact"],
    successSignalThreshold: 3,
    familyOrder: ["dependency", "artifact", "version"],
  }),
  createCase({
    caseId: "candidate-tf02-p03-drift-miss",
    title: "[Paraphrase] Shifting KPIs while triaging cache vs logic",
    prompt:
      "Operational charts wobble during the incident; cache and logic explanations dominate until stale-state finally explains the drift.",
    rootCause: "stale_state",
    distractors: ["cache", "logic"],
    budget: 10,
    terrain: debuggingTerrainShifting("explore", "high", "high"),
    logSignalFamily: "cache",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["cache", "logic"],
    successSignalThreshold: 3,
    familyOrder: ["cache", "logic", "stale_state"],
  }),
  createCase({
    caseId: "candidate-tf02-p04-partial-overcommit",
    title: "[Paraphrase] Flaky green builds hiding a scheduling race",
    prompt:
      "CI intermittently passes while users still see timing glitches; decide whether this is test noise or a real concurrency defect.",
    rootCause: "race",
    distractors: ["test_flake", "regression"],
    budget: 9,
    terrain: debuggingTerrain("explore", "high", "medium"),
    logSignalFamily: "test_flake",
    falsePositiveInspectFamilies: ["test_flake", "regression"],
    successSignalThreshold: 3,
    familyOrder: ["test_flake", "regression", "race"],
  }),
  createCase({
    caseId: "candidate-tf02-n01-secret-scope-reversal",
    title: "[Boundary] Auth-shaped noise before secret scope resolves",
    prompt:
      "Symptoms mimic permission and environment drift until later evidence shows a secret-scope mismatch driving instability.",
    rootCause: "secret_scope",
    distractors: ["permission", "env"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "medium"),
    logSignalFamily: "permission",
    logSignalStrength: 2,
    falsePositiveInspectFamilies: ["permission", "env"],
    successSignalThreshold: 3,
    familyOrder: ["permission", "env", "secret_scope"],
  }),
  createCase({
    caseId: "candidate-tf02-n02-schema-serialization-reversal",
    title: "[Boundary] Serialization looks guilty before schema drift shows",
    prompt:
      "Consumers fail parsing events; early blame lands on serialization until schema drift becomes the consistent story.",
    rootCause: "schema",
    distractors: ["serialization", "validation"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "high"),
    logSignalFamily: "serialization",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["serialization", "validation"],
    successSignalThreshold: 3,
    familyOrder: ["serialization", "validation", "schema"],
  }),
  createCase({
    caseId: "candidate-tf02-n03-prune-trap-version",
    title: "[Boundary] Clear semver signature should resist broad exploration",
    prompt:
      "A deployment break shows an unmistakable version-like signature with a tight budget; avoid exploratory thrash.",
    rootCause: "version",
    distractors: ["dependency", "artifact"],
    budget: 6,
    terrain: antiBroadeningTerrain(),
    logSignalFamily: "version",
    logSignalStrength: 2,
    successSignalThreshold: 2,
  }),
  createCase({
    caseId: "candidate-tf02-n04-downstream-api-reversal",
    title: "[Boundary] Local validation noise masks remote contract drift",
    prompt:
      "Checkout failures look like local validation bugs until downstream API contract drift explains the failing payloads.",
    rootCause: "downstream_api",
    distractors: ["validation", "serialization"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "medium"),
    logSignalFamily: "validation",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["validation", "serialization"],
    successSignalThreshold: 3,
    familyOrder: ["validation", "serialization", "downstream_api"],
  }),
  createCase({
    caseId: "candidate-tf02-n05-retry-policy-outage",
    title: "[Boundary] Retry storms vs real outage signature",
    prompt:
      "Clients retry aggressively while dashboards hint outage; separate retry policy tuning from genuine provider degradation.",
    rootCause: "outage",
    distractors: ["retry_policy", "downstream_api"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "high"),
    logSignalFamily: "retry_policy",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["retry_policy", "downstream_api"],
    successSignalThreshold: 3,
    familyOrder: ["retry_policy", "downstream_api", "outage"],
  }),
  createCase({
    caseId: "candidate-tf02-n06-observability-cache",
    title: "[Boundary] Telemetry gaps vs cache invalidation story",
    prompt:
      "Stale user-visible content could be cache invalidation or broken observability pipelines; evidence is mixed early.",
    rootCause: "cache",
    distractors: ["observability", "logic"],
    budget: 8,
    terrain: debuggingTerrain("explore", "medium", "medium"),
    logSignalFamily: "observability",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["observability", "logic"],
    successSignalThreshold: 3,
    familyOrder: ["observability", "logic", "cache"],
  }),
  createCase({
    caseId: "candidate-tf02-n07-escape-pressure",
    title: "[Boundary] Escape-leaning terrain with conflicting entry points",
    prompt:
      "Multiple surfaces look compromised; mode pressure suggests backing out broad commits before re-committing fixes.",
    rootCause: "regression",
    distractors: ["test_flake", "logic"],
    budget: 9,
    terrain: {
      ...debuggingTerrain("explore", "high", "high"),
      mode_pressure: "escape",
    },
    logSignalFamily: "test_flake",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["test_flake", "logic"],
    successSignalThreshold: 3,
    familyOrder: ["test_flake", "logic", "regression"],
  }),
  createCase({
    caseId: "candidate-tf02-n08-artifact-narrow",
    title: "[Boundary] Artifact pipeline looks like the only narrow culprit",
    prompt:
      "Build artifacts differ between runners; the failure space looks intentionally narrow if you ignore misleading logs.",
    rootCause: "artifact",
    distractors: ["dependency", "serialization"],
    budget: 6,
    terrain: antiBroadeningTerrain(),
    logSignalFamily: "artifact",
    logSignalStrength: 2,
    successSignalThreshold: 2,
  }),
  createCase({
    caseId: "candidate-tf02-n09-permission-narrow",
    title: "[Boundary] Strong permission cue should prune quickly",
    prompt:
      "Prod-only failures emit a permission-shaped clue with a small search space; avoid unnecessary broadening.",
    rootCause: "permission",
    distractors: ["env", "artifact"],
    budget: 6,
    terrain: antiBroadeningTerrain(),
    logSignalFamily: "permission",
    logSignalStrength: 2,
    successSignalThreshold: 2,
  }),
  createCase({
    caseId: "candidate-tf02-n10-regression-vs-test-flake",
    title: "[Boundary] Regression fear vs harness flake under noisy CI",
    prompt:
      "Main is red with intermittent failures; decide whether this is a real regression or test harness instability.",
    rootCause: "regression",
    distractors: ["test_flake", "race"],
    budget: 8,
    terrain: debuggingTerrain("explore", "high", "high"),
    logSignalFamily: "test_flake",
    logSignalStrength: 2,
    falsePositiveInspectFamilies: ["test_flake", "race"],
    successSignalThreshold: 3,
    familyOrder: ["test_flake", "race", "regression"],
  }),
  createCase({
    caseId: "candidate-tf02-n11-shifting-env-validation",
    title: "[Boundary] Shifting config with validation vs env tension",
    prompt:
      "Feature flags and environment drift mid-release; validation errors spike while env mismatches look equally plausible.",
    rootCause: "env",
    distractors: ["validation", "secret_scope"],
    budget: 9,
    terrain: debuggingTerrainShifting("explore", "high", "medium"),
    logSignalFamily: "validation",
    logSignalStrength: 1,
    falsePositiveInspectFamilies: ["validation", "secret_scope"],
    successSignalThreshold: 3,
    familyOrder: ["validation", "secret_scope", "env"],
  }),
];

function chooseDistinctFamily(startIndex: number, blocked: Set<DebugFamily>) {
  for (let offset = 0; offset < DEBUG_FAMILY_POOL.length; offset += 1) {
    const family = DEBUG_FAMILY_POOL[(startIndex + offset) % DEBUG_FAMILY_POOL.length];
    if (family && !blocked.has(family)) {
      return family;
    }
  }

  throw new Error("Unable to choose a distinct debug family.");
}

function createGeneratedHoldoutCase(seed: number): DebugEvalCase {
  const rootCause = chooseDistinctFamily(seed * 3, new Set());
  const distractorA = chooseDistinctFamily(seed * 5 + 2, new Set([rootCause]));
  const distractorB = chooseDistinctFamily(seed * 7 + 4, new Set([rootCause, distractorA]));
  const reversalPattern = seed % 2 === 0;

  const baseSpec: CaseSpec = {
    caseId: `debug-core-v04-holdout-${String(seed + 1).padStart(2, "0")}`,
    title: reversalPattern
      ? `Generated holdout reversal for ${familyLabel(rootCause)}`
      : `Generated holdout prune trap for ${familyLabel(rootCause)}`,
    prompt: reversalPattern
      ? `Early clues first reinforce ${familyLabel(distractorA)} before a later signal reveals a ${familyLabel(rootCause)} issue.`
      : `The initial signal already points strongly at ${familyLabel(rootCause)}, so extra broadening should waste a tight budget.`,
    rootCause,
    distractors: [distractorA, distractorB],
    budget: reversalPattern ? 8 : 6,
    terrain: reversalPattern ? debuggingTerrain("explore", "high", "high") : antiBroadeningTerrain(),
    stratum: "holdout",
    logSignalFamily: reversalPattern ? distractorA : rootCause,
    logSignalStrength: reversalPattern ? 1 : 2,
    successSignalThreshold: reversalPattern ? 3 : 2,
    ...(reversalPattern ? { familyOrder: [distractorA, distractorB, rootCause] as DebugFamily[] } : {}),
    ...(reversalPattern ? { falsePositiveInspectFamilies: [distractorA] } : {}),
  };

  return createCase(baseSpec);
}

export function generateDebuggingV04HoldoutCases(count = 8): DebugEvalCase[] {
  return Array.from({ length: count }, (_, index) => createGeneratedHoldoutCase(index + 11));
}

function remapActionId(actionId: string, familyMap: Map<DebugFamily, DebugFamily>): string {
  if (actionId === "inspect:logs") {
    return actionId;
  }

  const [kind, familyValue] = actionId.split(":");
  if (!kind || !familyValue) {
    return actionId;
  }

  const mappedFamily = familyMap.get(familyValue as DebugFamily);
  return mappedFamily ? `${kind}:${mappedFamily}` : actionId;
}

function remapText(text: string, familyMap: Map<DebugFamily, DebugFamily>): string {
  let nextText = text;
  for (const [from, to] of familyMap.entries()) {
    nextText = nextText.replaceAll(from.replaceAll("_", " "), to.replaceAll("_", " "));
  }
  return nextText;
}

export function createPermutedCase(debugCase: DebugEvalCase, offset = 1): DebugEvalCase {
  const families = Array.from(
    new Set(
      debugCase.input_context.available_actions
        .filter((action) => action.id !== "inspect:logs")
        .map((action) => action.family),
    ),
  );
  const normalizedOffset = families.length === 0 ? 0 : offset % families.length;
  const rotated =
    families.length > 1
      ? [...families.slice(normalizedOffset), ...families.slice(0, normalizedOffset)]
      : families;
  const familyMap = new Map<DebugFamily, DebugFamily>();

  families.forEach((family, index) => {
    const mapped = rotated[index];
    if (mapped) {
      familyMap.set(family, mapped);
    }
  });

  const remappedActions = [...debugCase.input_context.available_actions]
    .map((action) => ({
      ...action,
      id: remapActionId(action.id, familyMap),
      family: familyMap.get(action.family) ?? action.family,
      label: remapText(action.label, familyMap),
    }))
    .sort((left, right) => right.label.localeCompare(left.label));

  const remappedEffects = Object.fromEntries(
    Object.entries(debugCase.hidden_truth.effects).map(([actionId, effect]) => {
      const nextActionId = remapActionId(actionId, familyMap);
      return [
        nextActionId,
        {
          ...effect,
          action_id: nextActionId,
          observations: effect.observations.map((observation) => ({
            ...observation,
            family: familyMap.get(observation.family) ?? observation.family,
            text: remapText(observation.text, familyMap),
          })),
        },
      ];
    }),
  );

  return {
    ...debugCase,
    case_id: `${debugCase.case_id}:permuted:${normalizedOffset}`,
    title: `${debugCase.title} (Permuted ${normalizedOffset})`,
    input_context: {
      ...debugCase.input_context,
      case_id: `${debugCase.input_context.case_id}:permuted:${normalizedOffset}`,
      title: `${debugCase.input_context.title} (Permuted ${normalizedOffset})`,
      available_actions: remappedActions,
    },
    hidden_truth: {
      root_cause: familyMap.get(debugCase.hidden_truth.root_cause) ?? debugCase.hidden_truth.root_cause,
      effects: remappedEffects,
    },
  };
}

export function getHiddenEffect(debugCase: DebugEvalCase, actionId: string): HiddenDebugActionEffect {
  const effect = debugCase.hidden_truth.effects[actionId];
  if (!effect) {
    throw new Error(`No hidden effect defined for action ${actionId} in case ${debugCase.case_id}`);
  }

  return effect;
}
