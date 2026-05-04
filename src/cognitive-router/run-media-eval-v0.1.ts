import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { runMediaEvaluationSuite } from "./media-evaluator.js";

const report = runMediaEvaluationSuite("media-decision-v0.1.json");
const outputDir = "reports/media-decision-v0.1";
mkdirSync(outputDir, { recursive: true });
const reportPath = join(outputDir, `${report.suite_id}-${report.generated_at.replaceAll(":", "-")}.json`);
writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n=== Media Decision Eval v0.1 ===`);
console.log(
  JSON.stringify(
    {
      overall_pass: report.overall_pass,
      summary: report.summary,
      cases: report.cases.map((mediaCase) => ({
        case_id: mediaCase.case_id,
        expected_action: mediaCase.expected_action,
        recommended_action: mediaCase.recommended_action,
        acceptable_match: mediaCase.acceptable_match,
        confidence_band_match: mediaCase.confidence_band_match,
        rationale_quality_pass: mediaCase.rationale_quality_pass,
      })),
    },
    null,
    2,
  ),
);

console.log(`\nWrote report:\n- ${reportPath}`);
