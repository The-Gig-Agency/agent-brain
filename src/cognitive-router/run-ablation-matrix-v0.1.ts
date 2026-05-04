import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { runAblationMatrixV01 } from "./ablation-matrix-v0.1.js";

const report = runAblationMatrixV01();
const outputDir = "reports/ablation-matrix-v0.1";
mkdirSync(outputDir, { recursive: true });
const reportPath = join(outputDir, `ablation-matrix-v0.1-${report.generated_at.replaceAll(":", "-")}.json`);
writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n=== Ablation matrix v0.1 ===`);
console.log(
  JSON.stringify(
    {
      matrix_version: report.matrix_version,
      frozen_lanes_unmodified: report.frozen_lanes_unmodified,
      harness_baselines: report.harness_baselines,
      primitive_contribution_table: report.primitive_contribution_table,
    },
    null,
    2,
  ),
);

console.log(`\nWrote report:\n- ${reportPath}`);
