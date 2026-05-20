#!/usr/bin/env node
import { randomUUID } from "node:crypto";

/**
 * Internal example client (AB-40): calls POST /v1/intake-recommend over HTTP with bearer
 * and X-Trace-Id — does NOT import cognitive-router directly.
 *
 * Usage:
 *   ROUTER_RECOMMEND_URL=http://127.0.0.1:7399 \
 *   ROUTER_RECOMMEND_BEARER_TOKEN=dev-secret \
 *   node examples/internal/router-intake-recommend-client.example.mjs
 */

const baseUrl = process.env.ROUTER_RECOMMEND_URL ?? "http://127.0.0.1:7399";
const token = process.env.ROUTER_RECOMMEND_BEARER_TOKEN ?? "";
const traceId = process.env.TRACE_ID ?? randomUUID();

const body = {
  problem_summary:
    "Our deploy pipeline fails in staging after we changed how release artifacts are packaged. Engineers disagree whether it is a dependency resolution bug or a permissions issue on the build host.",
  context: "Staging only; production deploys still succeed.",
  signals: ["release packaging", "permission denied in logs"],
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
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/intake-recommend`, {
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
        response_trace_id: json.trace_id,
        status: res.status,
        api_version: json.api_version,
        regime_hint: json.ingestion?.regime_hint,
        primary: json.recommendation?.primary_regime,
        clarification_count: json.ingestion?.clarification_questions?.length ?? 0,
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
