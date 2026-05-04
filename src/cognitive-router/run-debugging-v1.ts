import {
  runDebuggingCoreV01Suite,
  runDebuggingCoreV02Suite,
  runDebuggingCoreV03Suite,
  runDebuggingHoldoutSuite,
  runDebuggingV1Suite,
  writeSuiteReport,
} from "./benchmark-runner.js";

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
const coreV01Report = runDebuggingCoreV01Suite();
const coreV02Report = runDebuggingCoreV02Suite();
const coreV03Report = runDebuggingCoreV03Suite();

const trainPath = writeSuiteReport(trainReport, "reports/debugging-v1");
const holdoutPath = writeSuiteReport(holdoutReport, "reports/debugging-v1");
const corePath = writeSuiteReport(coreV01Report, "reports/debugging-v0.1");
const coreV02Path = writeSuiteReport(coreV02Report, "reports/debugging-v0.2");
const coreV03Path = writeSuiteReport(coreV03Report, "reports/debugging-v0.3");

printReport("Debugging V1", trainReport);
printReport("Debugging V1 Holdout", holdoutReport);
console.log(`\n=== Debugging Core v0.1 ===`);
console.log(
  JSON.stringify(
    {
      go_no_go: coreV01Report.go_no_go,
      criteria: coreV01Report.criteria,
      summary: coreV01Report.summary,
      per_policy: coreV01Report.per_policy,
    },
    null,
    2,
  ),
);
console.log(`\n=== Debugging Core v0.2 ===`);
console.log(
  JSON.stringify(
    {
      go_no_go: coreV02Report.go_no_go,
      criteria: coreV02Report.criteria,
      summary: coreV02Report.summary,
      per_policy: coreV02Report.per_policy,
    },
    null,
    2,
  ),
);
console.log(`\n=== Debugging Core v0.3 ===`);
console.log(
  JSON.stringify(
    {
      overall_pass: coreV03Report.overall_pass,
      tests: coreV03Report.tests,
    },
    null,
    2,
  ),
);

console.log(`\nWrote reports:\n- ${trainPath}\n- ${holdoutPath}\n- ${corePath}\n- ${coreV02Path}\n- ${coreV03Path}`);
