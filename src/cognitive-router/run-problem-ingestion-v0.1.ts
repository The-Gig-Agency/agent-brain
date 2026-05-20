import { readFileSync } from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ingestProblem, type ProblemIngestionInput } from "./problem-ingestion.js";
import { recommendRegime } from "./scoring.js";
import type { SearchRegime, TerrainField, TerrainProfile } from "./types.js";

type IngestionFixtureCase = {
  id: string;
  title: string;
  input: ProblemIngestionInput;
  expected_regime_hint: SearchRegime;
  expected_terrain: Partial<TerrainProfile>;
  expected_question_fields: TerrainField[];
};

type IngestionFixture = {
  dataset_name: string;
  purpose: string;
  cases: IngestionFixtureCase[];
};

type IngestionCaseResult = {
  case_id: string;
  title: string;
  expected_regime_hint: SearchRegime;
  actual_regime_hint: SearchRegime;
  router_primary_regime: SearchRegime;
  regime_hint_match: boolean;
  terrain_matches: Array<{
    field: TerrainField;
    expected: TerrainProfile[TerrainField];
    actual: TerrainProfile[TerrainField];
    match: boolean;
    confidence: number;
  }>;
  question_field_hits: TerrainField[];
  missing_information: string[];
};

function loadFixture(): IngestionFixture {
  const path = resolve(process.cwd(), "fixtures/echelon/problem-ingestion-v0.1.json");
  return JSON.parse(readFileSync(path, "utf8")) as IngestionFixture;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function runCase(testCase: IngestionFixtureCase): IngestionCaseResult {
  const result = ingestProblem(testCase.input);
  const recommendation = recommendRegime(result.assessment);
  const questionFields = result.clarification_questions.map((question) => question.field);
  const terrainMatches = Object.entries(testCase.expected_terrain).map(([field, expected]) => {
    const terrainField = field as TerrainField;
    return {
      field: terrainField,
      expected: expected as TerrainProfile[TerrainField],
      actual: result.assessment.terrain_profile[terrainField],
      match: result.assessment.terrain_profile[terrainField] === expected,
      confidence: result.assessment.field_confidence?.[terrainField] ?? 0,
    };
  });

  return {
    case_id: testCase.id,
    title: testCase.title,
    expected_regime_hint: testCase.expected_regime_hint,
    actual_regime_hint: result.regime_hint,
    router_primary_regime: recommendation.primary_regime,
    regime_hint_match: testCase.expected_regime_hint === result.regime_hint,
    terrain_matches: terrainMatches,
    question_field_hits: testCase.expected_question_fields.filter((field) => questionFields.includes(field)),
    missing_information: result.assessment.missing_information ?? [],
  };
}

function main(): void {
  const fixture = loadFixture();
  const cases = fixture.cases.map(runCase);
  const terrainChecks = cases.flatMap((testCase) => testCase.terrain_matches);
  const summary = {
    case_count: cases.length,
    regime_hint_match_rate: average(cases.map((testCase) => (testCase.regime_hint_match ? 1 : 0))),
    terrain_field_match_rate: average(terrainChecks.map((check) => (check.match ? 1 : 0))),
    expected_question_hit_rate: average(
      fixture.cases.map((testCase, index) =>
        testCase.expected_question_fields.length === 0
          ? 1
          : (cases[index]?.question_field_hits.length ?? 0) / testCase.expected_question_fields.length,
      ),
    ),
  };
  const overallPass =
    summary.regime_hint_match_rate === 1 &&
    summary.terrain_field_match_rate >= 0.9 &&
    summary.expected_question_hit_rate >= 0.7;

  const report = {
    suite_id: fixture.dataset_name,
    generated_at: new Date().toISOString(),
    purpose: fixture.purpose,
    overall_pass: overallPass,
    summary,
    cases,
  };

  mkdirSync("reports/problem-ingestion-v0.1", { recursive: true });
  const reportPath = `reports/problem-ingestion-v0.1/problem-ingestion-v0.1-${report.generated_at.replaceAll(":", "-")}.json`;
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(
    JSON.stringify(
      {
        suite_id: report.suite_id,
        overall_pass: report.overall_pass,
        summary: report.summary,
        cases: report.cases.map((testCase) => ({
          case_id: testCase.case_id,
          expected_regime_hint: testCase.expected_regime_hint,
          actual_regime_hint: testCase.actual_regime_hint,
          router_primary_regime: testCase.router_primary_regime,
          terrain_mismatches: testCase.terrain_matches
            .filter((check) => !check.match)
            .map((check) => `${check.field}: expected=${check.expected} actual=${check.actual}`),
          question_field_hits: testCase.question_field_hits,
        })),
      },
      null,
      2,
    ),
  );
  console.log(`\nWrote report:\n- ${reportPath}`);

  if (!overallPass) {
    process.exitCode = 1;
  }
}

main();
