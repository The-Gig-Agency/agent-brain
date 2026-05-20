import type { Server } from "node:http";

import { ROUTER_RECOMMEND_API_VERSION } from "./constants.js";
import { createRouterRecommendHttpServer } from "./http-server.js";

function listenOnRandomPort(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address?.port) {
        resolve(address.port);
        return;
      }
      reject(new Error("Could not resolve smoke server port"));
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function expectStatus(url: string, status: number, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (response.status !== status) {
    const text = await response.text();
    throw new Error(`Expected ${status} for ${url}, got ${response.status}: ${text}`);
  }
  return response;
}

const validRequest = {
  problem_summary: "HTTP smoke test problem",
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

async function main(): Promise<void> {
  const misconfigured = createRouterRecommendHttpServer({ allowUnauthenticated: false, bearerToken: "" });
  const misconfiguredPort = await listenOnRandomPort(misconfigured);
  const misconfiguredBase = `http://127.0.0.1:${misconfiguredPort}`;
  await expectStatus(`${misconfiguredBase}/health`, 200);
  await expectStatus(`${misconfiguredBase}/ready`, 503);
  await closeServer(misconfigured);

  const token = "smoke-token";
  const server = createRouterRecommendHttpServer({ allowUnauthenticated: false, bearerToken: token });
  const port = await listenOnRandomPort(server);
  const base = `http://127.0.0.1:${port}`;

  await expectStatus(`${base}/health`, 200);
  await expectStatus(`${base}/ready`, 200);
  await expectStatus(`${base}/v1/recommend`, 401, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validRequest),
  });

  const ok = await expectStatus(`${base}/v1/recommend`, 200, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Trace-Id": "smoke-trace",
    },
    body: JSON.stringify(validRequest),
  });
  const body = await ok.json() as { api_version?: string; recommendation?: { primary_regime?: string } };
  if (body.api_version !== ROUTER_RECOMMEND_API_VERSION || !body.recommendation?.primary_regime) {
    throw new Error(`Unexpected recommendation response: ${JSON.stringify(body)}`);
  }

  await closeServer(server);
  console.log(JSON.stringify({ smoke: "router-recommend-http-v1", status: "ok" }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
