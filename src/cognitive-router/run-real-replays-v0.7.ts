import { writeSuiteReport } from "./benchmark-runner.js";
import { runReplaySuite } from "./replay-evaluator.js";

const report = runReplaySuite(
  "real-replays-v0.7.visible.json",
  "real-replays-v0.7.evaluator.json",
  "real-replays-v0.7",
);
const reportPath = writeSuiteReport(report, "reports/real-replays-v0.7");

console.log(`\n=== Real Replays v0.7 ===`);
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
        routed_beats_fixed_heuristic: debugCase.routed_beats_fixed_heuristic,
      })),
    },
    null,
    2,
  ),
);

console.log(`\nWrote report:\n- ${reportPath}`);
