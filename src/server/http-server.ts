import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import {
  ROUTER_RECOMMEND_DEFAULT_PORT,
  ROUTER_RECOMMEND_HEALTH_PATH,
  ROUTER_RECOMMEND_MAX_BODY_BYTES,
  ROUTER_RECOMMEND_READY_PATH,
  ROUTER_RECOMMEND_V1_PATH,
} from "./constants.js";
import { recommendV1FromJsonBody } from "./recommend-v1-handler.js";
import type { RecommendV1ErrorWire } from "./recommend-v1-types.js";

type StructuredLog = {
  level: "info" | "warn" | "error";
  service: "router-recommend-v1";
  request_id: string;
  trace_id: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  message?: string;
};

type RuntimeReadiness = {
  ok: boolean;
  service: "router-recommend-v1";
  checks: {
    auth_configured: boolean;
    allow_unauthenticated: boolean;
  };
};

function logLine(entry: StructuredLog): void {
  console.log(JSON.stringify(entry));
}

function getHeader(req: IncomingMessage, name: string): string | undefined {
  const raw = req.headers[name.toLowerCase()];
  if (Array.isArray(raw)) {
    return raw[0];
  }
  return raw;
}

function readJsonBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("BODY_TOO_LARGE"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function checkBearerAuth(
  req: IncomingMessage,
  bearerToken: string | undefined,
  allowUnauthenticated: boolean,
): { ok: true } | { ok: false; status: number; body: RecommendV1ErrorWire } {
  if (allowUnauthenticated) {
    return { ok: true };
  }
  if (!bearerToken || bearerToken.length === 0) {
    return {
      ok: false,
      status: 503,
      body: {
        error: {
          code: "SERVICE_MISCONFIGURED",
          message: "ROUTER_RECOMMEND_BEARER_TOKEN must be set when ROUTER_RECOMMEND_ALLOW_UNAUTHENTICATED is not true",
        },
      },
    };
  }
  const auth = getHeader(req, "authorization");
  const expected = `Bearer ${bearerToken}`;
  if (auth !== expected) {
    return {
      ok: false,
      status: 401,
      body: { error: { code: "UNAUTHORIZED", message: "Invalid or missing Authorization bearer token" } },
    };
  }
  return { ok: true };
}

function runtimeReadiness(bearerToken: string | undefined, allowUnauthenticated: boolean): RuntimeReadiness {
  const authConfigured = allowUnauthenticated || Boolean(bearerToken && bearerToken.length > 0);
  return {
    ok: authConfigured,
    service: "router-recommend-v1",
    checks: {
      auth_configured: authConfigured,
      allow_unauthenticated: allowUnauthenticated,
    },
  };
}

export type RouterRecommendServerOptions = {
  /** When true, skip bearer check (local dev only; AB-26). */
  allowUnauthenticated?: boolean;
  bearerToken?: string;
  port?: number;
};

/**
 * Thin internal HTTP server: POST /v1/recommend only (+ GET /health). Router core stays in `recommend-v1-handler`.
 */
export function createRouterRecommendHttpServer(options: RouterRecommendServerOptions = {}): Server {
  const allowUnauthenticated =
    options.allowUnauthenticated ?? process.env.ROUTER_RECOMMEND_ALLOW_UNAUTHENTICATED === "true";
  const bearerToken = options.bearerToken ?? process.env.ROUTER_RECOMMEND_BEARER_TOKEN;

  const server = createServer(async (req, res) => {
    const requestId = randomUUID();
    const traceHeader = getHeader(req, "x-trace-id");
    const traceId = traceHeader && traceHeader.length > 0 ? traceHeader : randomUUID();
    const started = performance.now();
    const method = req.method ?? "GET";
    const path = req.url?.split("?")[0] ?? "";

    const finish = (status: number, message?: string) => {
      const entry: StructuredLog = {
        level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
        service: "router-recommend-v1",
        request_id: requestId,
        trace_id: traceId,
        method,
        path,
        status,
        duration_ms: Math.round(performance.now() - started),
      };
      if (message !== undefined) {
        entry.message = message;
      }
      logLine(entry);
    };

    try {
      if (method === "GET" && path === ROUTER_RECOMMEND_HEALTH_PATH) {
        sendJson(res, 200, { ok: true, service: "router-recommend-v1" });
        finish(200);
        return;
      }

      if (method === "GET" && path === ROUTER_RECOMMEND_READY_PATH) {
        const readiness = runtimeReadiness(bearerToken, allowUnauthenticated);
        sendJson(res, readiness.ok ? 200 : 503, readiness);
        finish(readiness.ok ? 200 : 503, readiness.ok ? undefined : "service is not ready");
        return;
      }

      if (method === "POST" && path === ROUTER_RECOMMEND_V1_PATH) {
        const auth = checkBearerAuth(req, bearerToken, allowUnauthenticated);
        if (!auth.ok) {
          sendJson(res, auth.status, auth.body);
          finish(auth.status, auth.body.error.message);
          return;
        }

        const contentType = getHeader(req, "content-type") ?? "";
        if (!contentType.toLowerCase().includes("application/json")) {
          sendJson(res, 415, {
            error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json" },
          });
          finish(415);
          return;
        }

        let rawBody: string;
        try {
          rawBody = await readJsonBody(req, ROUTER_RECOMMEND_MAX_BODY_BYTES);
        } catch (error) {
          const tooLarge = error instanceof Error && error.message === "BODY_TOO_LARGE";
          sendJson(res, tooLarge ? 413 : 400, {
            error: {
              code: tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_BODY",
              message: tooLarge ? `Request body exceeds ${ROUTER_RECOMMEND_MAX_BODY_BYTES} bytes` : "Could not read body",
            },
          });
          finish(tooLarge ? 413 : 400);
          return;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(rawBody) as unknown;
        } catch {
          sendJson(res, 400, { error: { code: "INVALID_JSON", message: "Body is not valid JSON" } });
          finish(400);
          return;
        }

        const result = recommendV1FromJsonBody(parsed);
        if (!result.ok) {
          sendJson(res, result.status, result.body);
          finish(result.status);
          return;
        }
        sendJson(res, 200, result.body);
        finish(200);
        return;
      }

      sendJson(res, 404, { error: { code: "NOT_FOUND", message: "No route for this path" } });
      finish(404);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, 500, { error: { code: "INTERNAL_ERROR", message: "Unexpected server error" } });
      finish(500, message);
    }
  });

  return server;
}

export function listenRouterRecommendHttpServer(options: RouterRecommendServerOptions = {}): Server {
  const port = options.port ?? (Number(process.env.PORT) || ROUTER_RECOMMEND_DEFAULT_PORT);
  const server = createRouterRecommendHttpServer(options);
  server.listen(port, () => {
    const allowUnauthenticated =
      options.allowUnauthenticated ?? process.env.ROUTER_RECOMMEND_ALLOW_UNAUTHENTICATED === "true";
    logLine({
      level: "info",
      service: "router-recommend-v1",
      request_id: "startup",
      trace_id: "startup",
      method: "LISTEN",
      path: "/",
      status: 0,
      duration_ms: 0,
      message: `listening on ${port} allowUnauthenticated=${allowUnauthenticated}`,
    });
  });
  return server;
}
