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
};

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
  const families: DebugFamily[] = [...spec.distractors, spec.rootCause];
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

  effects["inspect:logs"] = {
    action_id: "inspect:logs",
    success: false,
    retryable: true,
    observations: [
      createObservation(
        `${spec.caseId}:logs:root`,
        spec.rootCause,
        "positive",
        1,
        `Logs weakly implicate ${familyLabel(spec.rootCause)} behavior.`,
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

    effects[fixId] = {
      action_id: fixId,
      success: family === spec.rootCause,
      retryable: family !== spec.rootCause,
      requires_signal: family === spec.rootCause,
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

export function getHiddenEffect(debugCase: DebugEvalCase, actionId: string): HiddenDebugActionEffect {
  const effect = debugCase.hidden_truth.effects[actionId];
  if (!effect) {
    throw new Error(`No hidden effect defined for action ${actionId} in case ${debugCase.case_id}`);
  }

  return effect;
}
