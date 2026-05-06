#!/usr/bin/env node
import { randomUUID } from "node:crypto";

/**
 * Internal example client (AB-27): calls POST /v1/recommend over HTTP with bearer auth
 * and X-Trace-Id — does NOT import cognitive-router directly.
 *
 * Usage:
 *   ROUTER_RECOMMEND_URL=http://127.0.0.1:7399 \
 *   ROUTER_RECOMMEND_BEARER_TOKEN=dev-secret \
 *   node examples/internal/router-recommend-client.example.mjs
 *
 * Local dev without auth:
 *   ROUTER_RECOMMEND_ALLOW_UNAUTHENTICATED=true on server + omit token (401 if server requires token).
 */

const baseUrl = process.env.ROUTER_RECOMMEND_URL ?? "http://127.0.0.1:7399";
const token = process.env.ROUTER_RECOMMEND_BEARER_TOKEN ?? "";
const traceId = process.env.TRACE_ID ?? randomUUID();

const body = {
  problem_summary: "SDR-style example: outbound prospecting cadence under noisy reply signal",
  terrain: {
    feedback_latency: "medium",
    reversibility: "high",
    uncertainty: "high",
    branching_factor: "high",
    adversariality: "some",
    ruggedness: "medium",
    local_minima_risk: "medium",
    information_cost: "medium",
    coordination_load: "medium",
    environment_stability: "shifting",
    time_horizon: "iterative",
    mode_pressure: "explore",
  },
  missing_information: ["reply quality labels", "ICP tier mix for this sequence"],
};

async function main() {
  const headers = {
    "Content-Type": "application/json",
    "X-Trace-Id": traceId,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/recommend`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.error(JSON.stringify({ level: "error", trace_id: traceId, status: res.status, raw: text.slice(0, 500) }));
      process.exit(1);
    }
    console.log(
      JSON.stringify({
        level: res.ok ? "info" : "warn",
        trace_id: traceId,
        status: res.status,
        api_version: json.api_version,
        primary: json.recommendation?.primary_regime,
      }),
    );
    if (!res.ok) {
      process.exit(1);
    }
  } catch (err) {
    console.log(
      JSON.stringify({
        level: "error",
        trace_id: traceId,
        message: "service_unavailable",
        detail: err instanceof Error ? err.message : String(err),
      }),
    );
    process.exit(1);
  }
}

await main();
