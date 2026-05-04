import {
  assertNotImpersonatingCertification,
  validateCommunityReplayDatasetPair,
} from "./community-pack-validation.js";
import { loadReplayEvaluatorDataset, loadReplayVisibleDataset } from "./replay-dataset.js";
import type { ReplayVisibleDataset } from "./types.js";

function mustThrow(label: string, fn: () => void): void {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error(`Expected throw: ${label}`);
  }
}

const goodVisible = loadReplayVisibleDataset("community-example-v0.1.visible.json");
const goodEval = loadReplayEvaluatorDataset("community-example-v0.1.evaluator.json");
validateCommunityReplayDatasetPair(goodVisible, goodEval);

const tutorialVisible = loadReplayVisibleDataset("tutorial-replay-v0.1.visible.json");
const tutorialEval = loadReplayEvaluatorDataset("tutorial-replay-v0.1.evaluator.json");
assertNotImpersonatingCertification(tutorialVisible, tutorialEval);
validateCommunityReplayDatasetPair(tutorialVisible, tutorialEval);

const spoofVisible: ReplayVisibleDataset = {
  ...goodVisible,
  dataset_name: "frozen-debug-v1-impersonation",
};
mustThrow("spoof dataset_name", () => assertNotImpersonatingCertification(spoofVisible, goodEval));

const badIdVisible: ReplayVisibleDataset = {
  ...goodVisible,
  cases: goodVisible.cases.map((c, i) => (i === 0 ? { ...c, id: "cg-999" } : c)),
};
mustThrow("non-community id", () => validateCommunityReplayDatasetPair(badIdVisible, goodEval));

const { pack_manifest: _stripV, ...visibleWithoutManifest } = goodVisible;
const badManifestVisible = visibleWithoutManifest as ReplayVisibleDataset;
mustThrow("partial community manifest", () => validateCommunityReplayDatasetPair(badManifestVisible, goodEval));

console.log("community-pack-validation selftest: OK");
