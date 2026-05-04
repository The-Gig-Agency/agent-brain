import type { ReplayEvaluatorDataset, ReplayVisibleDataset } from "./types.js";

/** Case ids contributed under the community program must use this prefix. */
export const COMMUNITY_CASE_ID_PREFIX = "community/";

const COMMUNITY_ID_PATTERN = /^community\/[a-z0-9][a-z0-9-]{0,62}$/;

const CERTIFICATION_IMPERSONATION = [
  "frozen-debug-v1",
  "frozen-media-v1",
  "frozen_certification",
  "echelon-certified",
  "tga-paid/",
  "registry:frozen",
];

function containsImpersonation(text: string): boolean {
  const lower = text.toLowerCase();
  return CERTIFICATION_IMPERSONATION.some((fragment) => lower.includes(fragment.toLowerCase()));
}

/** Reject obvious certification / paid lane impersonation without a signed commercial manifest. */
export function assertNotImpersonatingCertification(visible: ReplayVisibleDataset, evaluator: ReplayEvaluatorDataset): void {
  if (containsImpersonation(visible.dataset_name) || containsImpersonation(visible.purpose)) {
    throw new Error(
      `Community or OSS-visible dataset must not impersonate certification in dataset_name/purpose: ${visible.dataset_name}`,
    );
  }
  if (containsImpersonation(evaluator.dataset_name) || containsImpersonation(evaluator.purpose)) {
    throw new Error(
      `Community or OSS evaluator dataset must not impersonate certification in dataset_name/purpose: ${evaluator.dataset_name}`,
    );
  }
}

export function validateCommunityReplayDatasetPair(
  visible: ReplayVisibleDataset,
  evaluator: ReplayEvaluatorDataset,
): void {
  assertNotImpersonatingCertification(visible, evaluator);

  const manifestV = visible.pack_manifest;
  const manifestE = evaluator.pack_manifest;

  if (manifestV?.pack_kind === "community" || manifestE?.pack_kind === "community") {
    if (manifestV?.pack_kind !== "community" || manifestE?.pack_kind !== "community") {
      throw new Error("pack_manifest.pack_kind=community must be present on both visible and evaluator roots when used.");
    }
    if (manifestV.pack_schema_version !== manifestE.pack_schema_version) {
      throw new Error("Mismatched pack_schema_version between visible and evaluator manifests.");
    }

    for (const c of visible.cases) {
      if (!COMMUNITY_ID_PATTERN.test(c.id)) {
        throw new Error(
          `Community pack case id must match ${COMMUNITY_ID_PATTERN}: got "${c.id}"`,
        );
      }
    }

    const evalIds = new Set(evaluator.cases.map((c) => c.id));
    for (const c of visible.cases) {
      if (!evalIds.has(c.id)) {
        throw new Error(`Missing evaluator case for visible community id "${c.id}"`);
      }
    }
    for (const c of evaluator.cases) {
      if (!COMMUNITY_ID_PATTERN.test(c.id)) {
        throw new Error(`Community pack evaluator case id must match ${COMMUNITY_ID_PATTERN}: got "${c.id}"`);
      }
    }
  }
}
