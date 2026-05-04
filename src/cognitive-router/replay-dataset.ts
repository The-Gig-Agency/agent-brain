import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ReplayEvaluatorDataset, ReplayVisibleDataset } from "./types.js";

const REPLAY_FIXTURE_DIR = resolve(process.cwd(), "fixtures/echelon");

export function loadReplayVisibleDataset(fileName = "tutorial-replay-v0.1.visible.json"): ReplayVisibleDataset {
  const filePath = resolve(REPLAY_FIXTURE_DIR, fileName);
  return JSON.parse(readFileSync(filePath, "utf8")) as ReplayVisibleDataset;
}

export function loadReplayEvaluatorDataset(fileName = "tutorial-replay-v0.1.evaluator.json"): ReplayEvaluatorDataset {
  const filePath = resolve(REPLAY_FIXTURE_DIR, fileName);
  return JSON.parse(readFileSync(filePath, "utf8")) as ReplayEvaluatorDataset;
}
