/**
 * AB-17 — smoke checks for routed role runner registry and regime mapping.
 * Run: `npm run smoke:ab17-role-runners` (after build).
 */
import { ROUTED_ROLE_IDS, routedRoleIdForRegime } from "./routed-role-runners.js";
import type { SearchRegime } from "./types.js";

function fail(message: string): never {
  throw new Error(`AB-17 selftest: ${message}`);
}

if (ROUTED_ROLE_IDS.length !== 4) {
  fail("expected four routed role ids");
}

const regimes: SearchRegime[] = ["explore", "prune", "compound", "coordinate"];
const expectedRoles: Record<SearchRegime, (typeof ROUTED_ROLE_IDS)[number]> = {
  explore: "explorer",
  prune: "optimizer",
  compound: "constraint",
  coordinate: "adversarial",
};

for (const regime of regimes) {
  const role = routedRoleIdForRegime(regime);
  if (role !== expectedRoles[regime]) {
    fail(`routedRoleIdForRegime(${regime}) expected ${expectedRoles[regime]}, got ${role}`);
  }
}

console.log("ab17-role-runners selftest: OK");
