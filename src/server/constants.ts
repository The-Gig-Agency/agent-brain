/** URL path segment and JSON `api_version` for the v1 recommend contract (AB-24 / AB-5). */
export const ROUTER_RECOMMEND_API_VERSION = "1.0.0" as const;

export type RouterRecommendApiVersion = typeof ROUTER_RECOMMEND_API_VERSION;

export const ROUTER_RECOMMEND_V1_PATH = "/v1/recommend" as const;

/** Messy problem text → inferred terrain + regime recommendation (AB-40). */
export const ROUTER_INTAKE_RECOMMEND_V1_PATH = "/v1/intake-recommend" as const;

export const ROUTER_RECOMMEND_HEALTH_PATH = "/health" as const;

export const ROUTER_RECOMMEND_READY_PATH = "/ready" as const;

/** Default bind port when `PORT` is unset (internal dev). */
export const ROUTER_RECOMMEND_DEFAULT_PORT = 7399;

/** Maximum JSON body size for POST /v1/recommend and POST /v1/intake-recommend (bytes). */
export const ROUTER_RECOMMEND_MAX_BODY_BYTES = 262_144;
