import { runDebuggingHoldoutSuite, runDebuggingV1Suite, writeSuiteReport } from "./benchmark-runner.js";

function printReport(label: string, report: ReturnType<typeof runDebuggingV1Suite>) {
  console.log(`\n=== ${label} ===`);
  console.log(
    JSON.stringify(
      {
        summary: report.summary,
        per_policy: report.per_policy,
      },
      null,
      2,
    ),
  );
}

const trainReport = runDebuggingV1Suite();
const holdoutReport = runDebuggingHoldoutSuite();

const trainPath = writeSuiteReport(trainReport, "reports/debugging-v1");
const holdoutPath = writeSuiteReport(holdoutReport, "reports/debugging-v1");

printReport("Debugging V1", trainReport);
printReport("Debugging V1 Holdout", holdoutReport);

console.log(`\nWrote reports:\n- ${trainPath}\n- ${holdoutPath}`);
