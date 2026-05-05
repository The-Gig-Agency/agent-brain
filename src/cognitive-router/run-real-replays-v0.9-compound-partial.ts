import { writeSuiteReport } from "./benchmark-runner.js";
import { runReplaySuite } from "./replay-evaluator.js";

const report = runReplaySuite(
  "real-replays-v0.9-compound-partial.visible.json",
  "real-replays-v0.9-compound-partial.evaluator.json",
  "real-replays-v0.9-compound-partial",
);
const reportPath = writeSuiteReport(report, "reports/real-replays-v0.9-compound-partial");

console.log(`\n=== Real Replays v0.9 compound/partial wedge (mutable R&D) ===`);
console.log(
  JSON.stringify(
    {
      overall_pass: report.overall_pass,
      summary: report.summary,
      caveats: report.caveats,
      cases: report.cases.map((c) => ({
        case_id: c.case_id,
        routed_regime: c.routed_regime,
        hidden_expected_regime: c.hidden_expected_regime,
        fixed_heuristic_regime: c.fixed_heuristic_regime,
        routed_matches_hidden_regime: c.routed_matches_hidden_regime,
        routed_beats_fixed_heuristic: c.routed_beats_fixed_heuristic,
      })),
    },
    null,
    2,
  ),
);

console.log(`\nWrote report:\n- ${reportPath}`);
