import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { runSdrPilotEvaluationV01 } from "./sdr-pilot-evaluator.js";

function main(): void {
  const report = runSdrPilotEvaluationV01();
  const outputDir = "reports/sdr-pilot-v0.1";
  mkdirSync(outputDir, { recursive: true });
  const reportPath = join(outputDir, `${report.suite_id}-${report.generated_at.replaceAll(":", "-")}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(
    JSON.stringify(
      {
        suite_id: report.suite_id,
        overall_pass: report.overall_pass,
        recommendation: report.recommendation,
        criteria: report.criteria,
        summary: report.summary,
      },
      null,
      2,
    ),
  );
  console.log(`\nWrote report:\n- ${reportPath}`);
}

main();
