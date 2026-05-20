import type { Server } from "node:http";

import { createRouterRecommendHttpServer } from "./http-server.js";

type CapturedLog = {
  level?: string;
  service?: string;
  request_id?: string;
  trace_id?: string;
  method?: string;
  path?: string;
  status?: number;
  duration_ms?: number;
  message?: string;
};

function listenOnRandomPort(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address?.port) {
        resolve(address.port);
        return;
      }
      reject(new Error("Could not resolve ops smoke server port"));
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!server.listening) {
      resolve();
      return;
    }
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

function parseCapturedLogs(lines: string[]): CapturedLog[] {
  return lines.map((line) => {
    try {
      return JSON.parse(line) as CapturedLog;
    } catch {
      throw new Error(`Expected JSON log line, got: ${line}`);
    }
  });
}

function assertLog(
  logs: CapturedLog[],
  expected: { method: string; path: string; status: number; traceId?: string; level?: string },
): void {
  const match = logs.find((log) =>
    log.service === "router-recommend-v1" &&
    log.method === expected.method &&
    log.path === expected.path &&
    log.status === expected.status &&
    (expected.traceId === undefined || log.trace_id === expected.traceId) &&
    (expected.level === undefined || log.level === expected.level)
  );

  if (!match) {
    throw new Error(`Missing expected structured log: ${JSON.stringify(expected)} in ${JSON.stringify(logs)}`);
  }

  if (!match.request_id || !match.trace_id || typeof match.duration_ms !== "number") {
    throw new Error(`Structured log missing required correlation/timing fields: ${JSON.stringify(match)}`);
  }
}

const validRequest = {
  problem_summary: "Ops smoke test problem",
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
  const captured: string[] = [];
  const originalLog = console.log;
  console.log = (message?: unknown, ...rest: unknown[]) => {
    if (typeof message === "string" && rest.length === 0) {
      captured.push(message);
      return;
    }
    originalLog(message, ...rest);
  };

  const token = "ops-smoke-token";
  const server = createRouterRecommendHttpServer({ allowUnauthenticated: false, bearerToken: token });

  try {
    const port = await listenOnRandomPort(server);
    const base = `http://127.0.0.1:${port}`;

    const ready = await expectStatus(`${base}/ready`, 200);
    const readyBody = await ready.json() as {
      ok?: boolean;
      checks?: { auth_configured?: boolean; allow_unauthenticated?: boolean };
    };
    if (
      readyBody.ok !== true ||
      readyBody.checks?.auth_configured !== true ||
      readyBody.checks?.allow_unauthenticated !== false
    ) {
      throw new Error(`Unexpected readiness body: ${JSON.stringify(readyBody)}`);
    }

    await expectStatus(`${base}/v1/recommend`, 401, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Trace-Id": "ops-unauthorized-trace" },
      body: JSON.stringify(validRequest),
    });

    await expectStatus(`${base}/v1/recommend`, 200, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Trace-Id": "ops-authorized-trace",
      },
      body: JSON.stringify(validRequest),
    });
  } finally {
    await closeServer(server);
    console.log = originalLog;
  }

  const logs = parseCapturedLogs(captured);
  assertLog(logs, { method: "GET", path: "/ready", status: 200, level: "info" });
  assertLog(logs, {
    method: "POST",
    path: "/v1/recommend",
    status: 401,
    traceId: "ops-unauthorized-trace",
    level: "warn",
  });
  assertLog(logs, {
    method: "POST",
    path: "/v1/recommend",
    status: 200,
    traceId: "ops-authorized-trace",
    level: "info",
  });

  originalLog(JSON.stringify({ smoke: "router-recommend-ops-v1", status: "ok", checked_logs: logs.length }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
