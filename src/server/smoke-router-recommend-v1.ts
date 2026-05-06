import { ROUTER_RECOMMEND_API_VERSION } from "./constants.js";
import { recommendV1FromJsonBody } from "./recommend-v1-handler.js";

const valid = {
  problem_summary: "Smoke test problem",
  terrain: {
    feedback_latency: "medium",
    reversibility: "medium",
    uncertainty: "medium",
    branching_factor: "medium",
    adversariality: "none",
    ruggedness: "medium",
    local_minima_risk: "medium",
    information_cost: "medium",
    coordination_load: "medium",
    environment_stability: "stable",
    time_horizon: "iterative",
    mode_pressure: "prune",
  },
};

const ok = recommendV1FromJsonBody(valid);
if (!ok.ok) {
  console.error("FAIL expected success", ok.body);
  process.exit(1);
}
if (ok.body.api_version !== ROUTER_RECOMMEND_API_VERSION) {
  console.error("FAIL api_version");
  process.exit(1);
}
if (!ok.body.recommendation.primary_regime) {
  console.error("FAIL primary");
  process.exit(1);
}

const bad = recommendV1FromJsonBody({});
if (bad.ok || bad.status !== 400) {
  console.error("FAIL expected validation error");
  process.exit(1);
}

console.log(JSON.stringify({ smoke: "router-recommend-v1", status: "ok" }));
