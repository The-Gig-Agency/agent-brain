import { writeSuiteReport } from "./benchmark-runner.js";
import { runReplaySuite } from "./replay-evaluator.js";

const report = runReplaySuite(
  "tutorial-replay-v0.1.visible.json",
  "tutorial-replay-v0.1.evaluator.json",
  "tutorial-replay-v0.1",
);

const reportPath = writeSuiteReport(report, "reports/tutorial-replay-v0.1");

console.log(`\n=== Tutorial replay v0.1 (OSS-safe fixtures) ===`);
console.log(
  JSON.stringify(
    {
      overall_pass: report.overall_pass,
      summary: report.summary,
      caveats: report.caveats,
    },
    null,
    2,
  ),
);

console.log(`\nWrote report:\n- ${reportPath}`);
