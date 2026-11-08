#!/usr/bin/env node
// AB-52's local policy preflight. No DB, HTTP, models, outcomes or production flags.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { recommendMusicDNARegime } from "../dist/cognitive-router/integrations/musicdna/recommender.js";
import { legacyKnobsForMode } from "../dist/cognitive-router/integrations/musicdna/knobs.js";
import { scoreTerrain } from "../dist/cognitive-router/scoring.js";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const stable = (value) =>
  JSON.stringify(
    value && typeof value === "object"
      ? Array.isArray(value)
        ? value.map((x) => JSON.parse(stable(x)))
        : Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((k) => [k, JSON.parse(stable(value[k]))]),
          )
      : value,
  );
const shape = (rec) => ({
  terrain: rec.terrain,
  regime: rec.regime,
  confidence: rec.confidence,
  mode_pressure_in: rec.mode_pressure_in,
  scoring_agrees: rec.scoring_agrees,
  transition_candidate: rec.transition_candidate,
  selection_mode: rec.selection_mode,
  pairing_knobs: rec.pairing_knobs,
  scores: Object.fromEntries(
    rec.scoring.breakdown.map((x) => [x.regime, x.score]),
  ),
});
export function verifyFiles(base, pins) {
  for (const [file, expected] of Object.entries(pins))
    assert.equal(
      digest(readFileSync(join(base, file))),
      expected,
      "Pinned source changed: " + file,
    );
}
function boundaryCases(base) {
  return ["general", "alternative"].flatMap((lane) =>
    [0.5, 0.8].flatMap((confidence) =>
      [4, 5].map((round) => ({
        id: `escape_${lane}_${confidence === 0.5 ? "low" : "settled"}_${round}`,
        input: {
          session: {
            ...structuredClone(base.input.session),
            session_id: "offline-boundary",
            lane,
            lane_confidence: confidence,
            rounds_answered: round,
            rounds_skipped: 0,
            rounds_shown: round,
            vector: {},
            artist_frequency: {},
            skipped_pairing_ids: [],
          },
        },
      })),
    ),
  );
}
// Read and hash only the reviewed five-module mirror. Type-only Supabase imports
// disappear on transpile; only the pure recommender is invoked, never its DB wrapper.
async function loadMirror(mirrorRoot, pin) {
  assert.equal(
    execFileSync("git", ["-C", mirrorRoot, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    pin.commit,
    "MusicDNA reference commit mismatch",
  );
  verifyFiles(mirrorRoot, pin.files);
  const temp = mkdtempSync(join(tmpdir(), "ab52-mirror-"));
  try {
    for (const file of ["types", "terrain", "scoring", "knobs", "index"]) {
      let js = ts.transpileModule(
        readFileSync(
          join(mirrorRoot, "src/musicdna/router", file + ".ts"),
          "utf8",
        ),
        {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ES2022,
          },
        },
      ).outputText;
      js = js.replace(
        /from "\.\/(types|terrain|scoring|knobs)"/g,
        'from "./$1.mjs"',
      );
      assert(
        !/from ["'](?!\.\/[^"']+\.mjs["'])/.test(js),
        "Unexpected runtime mirror import",
      );
      writeFileSync(join(temp, file + ".mjs"), js);
    }
    const mirror = await import(pathToFileURL(join(temp, "index.mjs")).href);
    return {
      recommend: mirror.recommendMusicDNARegime,
      cleanup: () => rmSync(temp, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(temp, { recursive: true, force: true });
    throw error;
  }
}
export async function runFeasibility({ mirrorRoot = null } = {}) {
  const pin = JSON.parse(
    readFileSync(
      join(root, "fixtures/musicdna/feasibility-pin-v1.json"),
      "utf8",
    ),
  );
  verifyFiles(root, pin.agent_brain.files);
  verifyFiles(root, pin.agent_brain.build_files);
  const golden = JSON.parse(
    readFileSync(join(root, "fixtures/musicdna/parity-golden-v1.json"), "utf8"),
  );
  assert(golden.cases.length > 0, "Golden evidence missing");
  const sourceBundle = digest(stable(pin.agent_brain.files));
  const mirror = mirrorRoot
    ? await loadMirror(resolve(mirrorRoot), pin.musicdna)
    : null;
  const cases = [];
  try {
    for (const item of [...golden.cases, ...boundaryCases(golden.cases[0])]) {
      const recommendation = recommendMusicDNARegime(item.input),
        actual = shape(recommendation);
      if (item.expected)
        assert.equal(
          stable(actual),
          stable(item.expected),
          "Golden regression: " + item.id,
        );
      if (mirror)
        assert.equal(
          stable(actual),
          stable(shape(mirror.recommend(item.input))),
          "Mirror parity failed: " + item.id,
        );
      const session = item.input.session;
      const baselineMode =
        session.lane === "general"
          ? "recognition_first"
          : session.lane_confidence < 0.6
            ? "recognition_boost"
            : "diagnostic_first";
      const baseline = legacyKnobsForMode(baselineMode),
        candidate = recommendation.pairing_knobs;
      const generic = scoreTerrain(recommendation.terrain);
      cases.push({
        case_id: item.id,
        case_class: item.expected ? "shared_golden" : "escape_boundary",
        baseline_mode: baselineMode,
        candidate_mode: recommendation.selection_mode,
        candidate_regime: recommendation.regime,
        mode_pressure: recommendation.mode_pressure_in,
        scoring_agrees: recommendation.scoring_agrees,
        baseline_knobs: baseline,
        candidate_knobs: candidate,
        changed_knobs: Object.keys(baseline).filter(
          (k) => baseline[k] !== candidate[k],
        ),
        generic_scores_differ:
          stable(actual.scores) !==
          stable(
            Object.fromEntries(
              generic.breakdown.map((x) => [x.regime, x.score]),
            ),
          ),
        generic_confidence: generic.confidence,
        domain_confidence: recommendation.confidence,
      });
    }
  } finally {
    mirror?.cleanup();
  }
  return {
    schema_version: "musicdna-offline-feasibility.v1",
    evaluator_sha256: digest(readFileSync(fileURLToPath(import.meta.url))),
    decision: "hold",
    policy: {
      adapter_version: pin.agent_brain.adapter_version,
      source_bundle_sha256: sourceBundle,
      source_files: pin.agent_brain.files,
      build_files: pin.agent_brain.build_files,
      musicdna_reference_commit: pin.musicdna.commit,
      musicdna_mirror: mirror ? "verified" : "unverified",
      mirror_files: pin.musicdna.files,
      mode_pressure_weight: 2,
      baseline:
        "legacyKnobsForMode + shipped post-bootstrap lane/confidence mode",
      execution: "offline pinned domain adapter; generic hosted API not used",
    },
    checks: {
      golden_cases: golden.cases.length,
      escape_boundary_cases: cases.length - golden.cases.length,
      golden_passed: true,
      mirror_passed: mirror ? true : null,
    },
    summary: {
      compared_cases: cases.length,
      knobs_differ: cases.filter((c) => c.changed_knobs.length > 0).length,
      generic_scores_differ: cases.filter((c) => c.generic_scores_differ)
        .length,
    },
    outcome_evidence: {
      evaluated_live_sessions: 0,
      evaluated_joined_outcomes: 0,
      available_live_sessions: null,
      causal_effect: null,
      uncertainty_interval: null,
      collection_authorized: false,
      status: "insufficient_evidence",
    },
    cases,
    next_steps: [
      "Owner freezes one primary diagnostic-quality metric, guardrails, eligibility, consent and exposure/feedback windows before treatment.",
      "AB-29 must join stable assignment and actually applied policy/result version to exact-version outcomes; missing and late feedback stay explicit.",
      "AB-52 then evaluates a pinned baseline/treatment comparison; do not promote from shadow differences or synthetic parity.",
    ],
    limitations: [
      "Fixture inputs and knob differences are engineering evidence only, not actual selected pairings or listener benefit.",
      "Baseline comparison covers post-bootstrap knob selection, not bootstrap, catalog fallback, lane/evidence gates or six-answer completion.",
      "No live outcome export was read; the available live population is unknown. Zero evaluated outcomes is not a claim that production has no data.",
      "No counterfactual result, statistical effect, successful trial, deployment or approval is inferred.",
    ],
  };
}
export function renderMarkdown(report) {
  return [
    "# Music DNA offline feasibility",
    "",
    `Decision: **${report.decision}** — ${report.outcome_evidence.status}.`,
    `Domain adapter: \`${report.policy.adapter_version}\``,
    `Source bundle: \`${report.policy.source_bundle_sha256}\``,
    `Music DNA reference: \`${report.policy.musicdna_reference_commit}\`; mirror ${report.policy.musicdna_mirror}.`,
    "",
    `Golden cases: ${report.checks.golden_cases}; escape boundary cases: ${report.checks.escape_boundary_cases}.`,
    `Evaluated live sessions/outcomes: 0/0. Available live population, causal effect and uncertainty: unavailable.`,
    "",
    "| Case | Baseline mode | Candidate regime / mode | Changed knobs |",
    "| --- | --- | --- | --- |",
    ...report.cases.map(
      (c) =>
        `| ${c.case_id} | ${c.baseline_mode} | ${c.candidate_regime} / ${c.candidate_mode} | ${c.changed_knobs.join(", ") || "none"} |`,
    ),
    "",
    "## Next steps",
    "",
    ...report.next_steps.map((x) => "- " + x),
    "",
    "## Limits",
    "",
    ...report.limitations.map((x) => "- " + x),
    "",
  ].join("\n");
}
async function main() {
  const args = process.argv.slice(2),
    opts = {};
  if (args.length === 1 && args[0] === "--help") {
    console.log(
      "musicdna-feasibility.mjs [--musicdna-root PINNED_CHECKOUT] --output NEW_DIRECTORY\nLocal only; creates JSON/Markdown hold report. No DB, model or live outcome calls.",
    );
    return;
  }
  while (args.length) {
    const flag = args.shift(),
      value = args.shift();
    assert(
      ["--musicdna-root", "--output"].includes(flag) &&
        value &&
        !value.startsWith("--") &&
        !Object.hasOwn(opts, flag),
      "Invalid arguments",
    );
    opts[flag] = value;
  }
  assert(opts["--output"], "--output NEW_DIRECTORY required");
  const report = await runFeasibility({
    mirrorRoot: opts["--musicdna-root"] ?? null,
  });
  const output = resolve(opts["--output"]);
  mkdirSync(output, { mode: 0o700 });
  writeFileSync(
    join(output, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  writeFileSync(join(output, "report.md"), renderMarkdown(report), {
    flag: "wx",
    mode: 0o600,
  });
  console.log(
    JSON.stringify({
      decision: report.decision,
      checks: report.checks,
      summary: report.summary,
      outcome_status: report.outcome_evidence.status,
      output,
    }),
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch(() => {
    console.error(
      "Music DNA feasibility failed: check arguments, pinned source/fixture hashes and parity; no rollout authorized.",
    );
    process.exitCode = 1;
  });
