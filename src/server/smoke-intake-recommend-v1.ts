import { ROUTER_RECOMMEND_API_VERSION } from "./constants.js";
import { intakeRecommendV1FromJsonBody } from "./intake-recommend-v1-handler.js";

const traceId = "handler-smoke-trace";

const valid = intakeRecommendV1FromJsonBody(traceId, {
  problem_summary: "We keep shipping small fixes but the metric we care about barely moves; not sure if we are stuck in a local optimum or measuring the wrong thing.",
  context: "Two-week iteration loop.",
});
if (!valid.ok) {
  console.error("FAIL expected success", valid.body);
  process.exit(1);
}
if (valid.body.api_version !== ROUTER_RECOMMEND_API_VERSION) {
  console.error("FAIL api_version");
  process.exit(1);
}
if (valid.body.trace_id !== traceId) {
  console.error("FAIL trace_id");
  process.exit(1);
}
if (!valid.body.ingestion.terrain_profile.mode_pressure || !valid.body.ingestion.regime_hint) {
  console.error("FAIL ingestion");
  process.exit(1);
}
if (!valid.body.recommendation.primary_regime) {
  console.error("FAIL recommendation");
  process.exit(1);
}

const bad = intakeRecommendV1FromJsonBody(traceId, {});
if (bad.ok || bad.status !== 400) {
  console.error("FAIL expected validation error");
  process.exit(1);
}

console.log(JSON.stringify({ smoke: "intake-recommend-v1", status: "ok" }));
