import { writeSuiteReport } from "./benchmark-runner.js";
import { validateCommunityReplayDatasetPair } from "./community-pack-validation.js";
import { loadReplayEvaluatorDataset, loadReplayVisibleDataset } from "./replay-dataset.js";
import { runReplaySuite } from "./replay-evaluator.js";

const visible = loadReplayVisibleDataset("community-example-v0.1.visible.json");
const evaluator = loadReplayEvaluatorDataset("community-example-v0.1.evaluator.json");
validateCommunityReplayDatasetPair(visible, evaluator);

const report = runReplaySuite(
  "community-example-v0.1.visible.json",
  "community-example-v0.1.evaluator.json",
  "community-example-v0.1",
);

const reportPath = writeSuiteReport(report, "reports/community-example-v0.1");

console.log(`\n=== Community example replay v0.1 ===`);
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
