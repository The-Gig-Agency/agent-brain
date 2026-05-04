import { writeSuiteReport } from "./benchmark-runner.js";
import { runRealReplaysV1Suite } from "./replay-evaluator.js";

const report = runRealReplaysV1Suite();
const reportPath = writeSuiteReport(report, "reports/real-replays-v1");

console.log(`\n=== Real Replays v1 ===`);
console.log(
  JSON.stringify(
    {
      overall_pass: report.overall_pass,
      summary: report.summary,
      caveats: report.caveats,
      cases: report.cases.map((debugCase) => ({
        case_id: debugCase.case_id,
        routed_regime: debugCase.routed_regime,
        hidden_expected_regime: debugCase.hidden_expected_regime,
        fixed_heuristic_regime: debugCase.fixed_heuristic_regime,
        score_threshold_regime: debugCase.score_threshold_regime,
        routed_matches_hidden_regime: debugCase.routed_matches_hidden_regime,
      })),
    },
    null,
    2,
  ),
);

console.log(`\nWrote report:\n- ${reportPath}`);
