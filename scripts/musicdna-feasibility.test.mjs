import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import {
  runFeasibility,
  renderMarkdown,
  verifyFiles,
} from "./musicdna-feasibility.mjs";

test("golden + escape coverage stays deterministic and local, with no invented outcomes", async () => {
  const a = await runFeasibility(),
    b = await runFeasibility();
  assert.deepEqual(a, b);
  assert.equal(a.checks.golden_cases, 3);
  assert.equal(a.checks.escape_boundary_cases, 8);
  assert.equal(a.checks.mirror_passed, null);
  assert.equal(a.policy.musicdna_mirror, "unverified");
  assert.equal(a.outcome_evidence.available_live_sessions, null);
  assert.equal(a.outcome_evidence.evaluated_live_sessions, 0);
  assert.equal(a.outcome_evidence.causal_effect, null);
  assert.equal(a.outcome_evidence.uncertainty_interval, null);
  assert.equal(a.decision, "hold");
  assert.equal(a.outcome_evidence.collection_authorized, false);
});
test("Music DNA weighting differs from generic scoring without changing the baseline", async () => {
  const r = await runFeasibility(),
    early = r.cases.find((c) => c.case_id === "early_uncertain_explore");
  assert.equal(early.generic_confidence, 0.8);
  assert.equal(early.domain_confidence, 0.64);
  assert.equal(early.baseline_mode, "diagnostic_first");
  assert.equal(early.baseline_knobs.fork_filter, "hard");
  assert.equal(early.candidate_knobs.fork_filter, "soft");
  assert.equal(r.policy.mode_pressure_weight, 2);
  assert.equal(
    r.cases.find((c) => c.case_id === "escape_general_low_4").baseline_mode,
    "recognition_first",
  );
  assert.equal(
    r.cases.find((c) => c.case_id === "escape_alternative_low_4").baseline_mode,
    "recognition_boost",
  );
});
test("escape cases expose the mirrored telemetry semantic excluded by old golden cases", async () => {
  const r = await runFeasibility();
  for (const c of r.cases.filter((c) => c.case_class === "escape_boundary")) {
    assert.equal(c.mode_pressure, "escape");
    assert.equal(c.candidate_regime, "explore");
    assert.equal(c.scoring_agrees, true);
  }
});
test("changed source pins fail closed and cannot be called a valid evaluation", () => {
  const dir = mkdtempSync(join(tmpdir(), "ab52-pin-test-"));
  try {
    writeFileSync(join(dir, "module.ts"), "reviewed");
    const hash = createHash("sha256").update("reviewed").digest("hex");
    verifyFiles(dir, { "module.ts": hash });
    writeFileSync(join(dir, "module.ts"), "changed");
    assert.throws(
      () => verifyFiles(dir, { "module.ts": hash }),
      /Pinned source changed/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("Markdown distinguishes descriptive knob differences from product quality", async () => {
  const md = renderMarkdown(await runFeasibility());
  assert.match(md, /hold.*insufficient_evidence/);
  assert.match(md, /causal effect and uncertainty: unavailable/);
  assert.match(md, /not actual selected pairings or listener benefit/);
  assert.match(md, /AB-29/);
});
test(
  "cross-repository mirror checks all eleven cases at the pinned reviewed commit",
  { skip: !process.env.AB52_MUSICDNA_REFERENCE_ROOT },
  async () => {
    const r = await runFeasibility({
      mirrorRoot: process.env.AB52_MUSICDNA_REFERENCE_ROOT,
    });
    assert.equal(r.checks.mirror_passed, true);
    assert.equal(r.summary.compared_cases, 11);
  },
);
