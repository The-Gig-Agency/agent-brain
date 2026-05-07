import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { runSdrPilotEvaluationV01 } from "./sdr-pilot-evaluator.js";

function toPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function renderMarkdownSummary(report: ReturnType<typeof runSdrPilotEvaluationV01>): string {
  const lines: string[] = [
    "# SDR Pilot Evaluation v0.1",
    "",
    `- Suite: \`${report.suite_id}\``,
    `- Generated at: \`${report.generated_at}\``,
    `- Overall pass: \`${report.overall_pass}\``,
    `- Recommendation: \`${report.recommendation}\``,
    "",
    "## Promotion Criteria",
    "",
    `- Exact mode match: \`${report.criteria.exact_mode_match}\``,
    `- Exact regime match: \`${report.criteria.exact_regime_match}\``,
    `- Covers all primary regimes: \`${report.criteria.covers_all_primary_regimes}\``,
    `- Covers minimum mode variety: \`${report.criteria.covers_minimum_mode_variety}\``,
    "",
    "## Summary",
    "",
    `- Scenario count: \`${report.summary.scenario_count}\``,
    `- Mode match rate: \`${toPercent(report.summary.mode_match_rate)}\``,
    `- Regime match rate: \`${toPercent(report.summary.regime_match_rate)}\``,
    `- Covered modes: ${report.summary.covered_modes.map((mode) => `\`${mode}\``).join(", ")}`,
    `- Covered primary regimes: ${report.summary.covered_primary_regimes.map((regime) => `\`${regime}\``).join(", ")}`,
    `- Mismatch ids: ${
      report.summary.mismatch_ids.length > 0
        ? report.summary.mismatch_ids.map((id) => `\`${id}\``).join(", ")
        : "_none_"
    }`,
    "",
    "## Case Readout",
    "",
    "| Case | Expected Mode | Actual Mode | Expected Regime | Actual Regime | Strategy Family | Primary Algorithm |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...report.cases.map(
      (result) =>
        `| ${result.case_id} | \`${result.expected_mode}\` | \`${result.actual_mode}\` | \`${result.expected_primary_regime}\` | \`${result.actual_primary_regime}\` | \`${result.strategy_family}\` | \`${result.primary_algorithm}\` |`,
    ),
    "",
    "## Caveats",
    "",
    ...report.caveats.map((caveat) => `- ${caveat}`),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function main(): void {
  const report = runSdrPilotEvaluationV01();
  const outputDir = "reports/sdr-pilot-v0.1";
  mkdirSync(outputDir, { recursive: true });
  const fileBase = `${report.suite_id}-${report.generated_at.replaceAll(":", "-")}`;
  const reportPath = join(outputDir, `${fileBase}.json`);
  const markdownPath = join(outputDir, `${fileBase}.md`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  writeFileSync(markdownPath, renderMarkdownSummary(report));

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
  console.log(`\nWrote reports:\n- ${reportPath}\n- ${markdownPath}`);
}

main();
