#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Phase-1 guard: public-default replay loaders must point at OSS-safe tutorial fixtures,
# not proprietary real-replay or frozen pack filenames.
for needle in \
  'loadReplayVisibleDataset(fileName = "tutorial-replay-v0.1.visible.json")' \
  'loadReplayEvaluatorDataset(fileName = "tutorial-replay-v0.1.evaluator.json")' \
  'visibleFileName = "tutorial-replay-v0.1.visible.json"' \
  'evaluatorFileName = "tutorial-replay-v0.1.evaluator.json"' \
  'suiteId = "tutorial-replay-v0.1"'; do
  grep -Fq "$needle" src/cognitive-router/replay-dataset.ts src/cognitive-router/replay-evaluator.ts
done

echo "verify-echelon-oss-boundary: OK (tutorial defaults wired)"
