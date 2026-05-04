import { runTransitionCandidateV02Suite, writeSuiteReport } from "./benchmark-runner.js";

const report = runTransitionCandidateV02Suite();
const reportPath = writeSuiteReport(report, "reports/transition-candidate-v0.2");

console.log(`\n=== Transition candidate v0.2 (expanded lane, 20 cases) ===`);
console.log(
  JSON.stringify(
    {
      suite_id: report.suite_id,
      summary: report.summary,
      transition_cycle_metrics: report.transition_cycle_metrics,
      cases: report.cases.map((row) => ({
        case_id: row.case_id,
        pass: row.pass,
        routed_success: row.routed.success,
        routed_cost: row.routed.total_cost,
        transitions: row.routed.transition_count,
        false_convergence: row.routed.false_convergence,
      })),
    },
    null,
    2,
  ),
);

console.log(`\nWrote report:\n- ${reportPath}`);
