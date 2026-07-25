/**
 * MusicDNA terrain mapper selftest.
 * Run: `npm run smoke:musicdna-mapper` (after build).
 *
 * Covers:
 *   - legacyKnobsForMode for all three SelectionModes
 *   - D2 terrain constants (reversibility / information_cost)
 *   - unknown-delta handling (not treated as "not volatile")
 *   - mode_pressure vs regime separation + scoring_agrees
 *   - mode_pressure weight +2 (not global +4)
 *   - transition reachability from terrains the mapper can emit
 *   - escape ModePressure
 *   - SelectionMode mapping (general / low-confidence / settled)
 */
import { scoreTerrain } from "../../scoring.js";
import type { SearchRegime, TerrainProfile } from "../../types.js";
import { legacyKnobsForMode, regimeToPairingKnobs, regimeToSelectionMode } from "./knobs.js";
import { recommendMusicDNARegime } from "./recommender.js";
import { scoreMusicDNATerrain } from "./scoring-musicdna.js";
import {
  detectSkipPressure,
  detectVectorVolatility,
  sessionConfidence,
} from "./signals.js";
import { enumerateMusicDNATerrains, sessionToTerrain } from "./terrain-mapper.js";
import type { MusicDNASessionState, MusicDNATerrainInput, SelectionMode } from "./types.js";
import { RECOGNITION_FLOORS } from "./types.js";

function fail(message: string): never {
  throw new Error(`musicdna-mapper selftest: ${message}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function baseSession(overrides: Partial<MusicDNASessionState> = {}): MusicDNASessionState {
  return {
    session_id: "test-session",
    rounds_answered: 2,
    rounds_skipped: 0,
    rounds_shown: 2,
    vector: {},
    lane: "alternative",
    lane_confidence: 0.8,
    skipped_pairing_ids: [],
    artist_frequency: {},
    ...overrides,
  };
}

function input(overrides: Partial<MusicDNATerrainInput> = {}): MusicDNATerrainInput {
  const result: MusicDNATerrainInput = {
    session: overrides.session ?? baseSession(),
  };
  if (overrides.recentDeltas !== undefined) result.recentDeltas = overrides.recentDeltas;
  if (overrides.recentChoices !== undefined) result.recentChoices = overrides.recentChoices;
  if (overrides.config !== undefined) result.config = overrides.config;
  return result;
}

// ---------- legacyKnobsForMode: all three modes ----------
{
  const modes: SelectionMode[] = ["diagnostic_first", "recognition_boost", "recognition_first"];
  for (const mode of modes) {
    const knobs = legacyKnobsForMode(mode);
    assert(knobs.mode === mode, `legacyKnobsForMode(${mode}).mode`);
    assert(knobs.canon_floor === RECOGNITION_FLOORS[mode], `legacyKnobsForMode(${mode}).canon_floor`);
    assert(knobs.challenge_boost === 1.5, `legacyKnobsForMode(${mode}).challenge_boost`);
    assert(knobs.fork_filter === "hard", `legacyKnobsForMode(${mode}).fork_filter`);
  }
  assert(legacyKnobsForMode("recognition_first").recog_blend === 0.6, "recognition_first blend");
  assert(legacyKnobsForMode("recognition_boost").recog_blend === 0.4, "recognition_boost blend");
  assert(legacyKnobsForMode("diagnostic_first").recog_blend === 0, "diagnostic_first blend");
}

// ---------- SelectionMode mapping ----------
{
  assert(
    regimeToSelectionMode("compound", "general", 0.9) === "recognition_first",
    "general lane always recognition_first",
  );
  assert(
    regimeToSelectionMode("compound", "alternative", 0.5) === "recognition_boost",
    "low lane_confidence → recognition_boost",
  );
  assert(
    regimeToSelectionMode("compound", "alternative", 0.8) === "diagnostic_first",
    "settled lane + compound → diagnostic_first",
  );
  assert(
    regimeToSelectionMode("explore", "alternative", 0.8) === "recognition_boost",
    "settled lane + explore → recognition_boost",
  );
}

// ---------- Signals ----------
{
  const conf = sessionConfidence({
    movement: 40,
    atmosphere: 40,
    immersion: 40,
    scale: 10,
  });
  assert(conf.confident_axes === 3, `confident_axes expected 3, got ${conf.confident_axes}`);
  assert(conf.confidence === 0.3, `confidence expected 0.3, got ${conf.confidence}`);

  const unknown = detectVectorVolatility(undefined);
  assert(unknown.known === false, "missing deltas must be unknown");
  assert(unknown.volatile === null, "unknown volatility must be null, not false");

  const calm = detectVectorVolatility([{ movement: 1 }, { movement: 1 }, { movement: 1 }]);
  assert(calm.known && calm.volatile === false, "small deltas → not volatile");

  const wild = detectVectorVolatility([
    { movement: 40, atmosphere: 40 },
    { immersion: 50 },
    { scale: 60 },
  ]);
  assert(wild.known && wild.volatile === true, "large deltas → volatile");

  const skips = detectSkipPressure(["a", "b"], 4);
  assert(skips.recognition_failing, "2 skips → recognition_failing");
  assert(skips.skip_rate === 0.5, `skip_rate expected 0.5, got ${skips.skip_rate}`);
}

// ---------- D2 terrain constants ----------
{
  const terrain = sessionToTerrain(input());
  assert(terrain.reversibility === "medium", "D2: reversibility must be medium");
  assert(terrain.information_cost === "medium", "D2: information_cost baseline must be medium");
  assert(terrain.feedback_latency === "fast", "feedback_latency");
  assert(terrain.adversariality === "none", "adversariality");
  assert(terrain.coordination_load === "low", "coordination_load");
  assert(terrain.time_horizon === "iterative", "time_horizon");
}

// ---------- Skip pressure elevates information_cost + shifts environment ----------
{
  // rounds_shown=3 stays below escapeAt (floor(6*0.7)=4) so escape does not mask skip.
  const terrain = sessionToTerrain(
    input({
      session: baseSession({
        skipped_pairing_ids: ["a", "b"],
        rounds_skipped: 2,
        rounds_shown: 3,
        rounds_answered: 1,
        vector: { movement: 40, atmosphere: 40, immersion: 40 }, // medium confidence
      }),
    }),
  );
  assert(terrain.information_cost === "high", "skip pressure → information_cost high");
  assert(terrain.environment_stability === "shifting", "skip pressure → shifting");
  assert(terrain.mode_pressure === "explore", `skip pressure → explore, got ${terrain.mode_pressure}`);
}

// ---------- Escape ModePressure ----------
{
  const terrain = sessionToTerrain(
    input({
      session: baseSession({
        rounds_shown: 5, // escapeAt = floor(6 * 0.7) = 4
        rounds_answered: 5,
        vector: {}, // confidence 0
      }),
    }),
  );
  assert(terrain.mode_pressure === "escape", `expected escape, got ${terrain.mode_pressure}`);
}

// ---------- mode_pressure +2 (not +4) ----------
{
  // High-confidence settled session — compound should win under +2 after D2 constants.
  const settled: TerrainProfile = {
    feedback_latency: "fast",
    reversibility: "medium",
    uncertainty: "low",
    branching_factor: "medium",
    adversariality: "none",
    ruggedness: "medium",
    local_minima_risk: "medium",
    information_cost: "medium",
    coordination_load: "low",
    environment_stability: "stable",
    time_horizon: "iterative",
    mode_pressure: "compound",
  };

  const global = scoreTerrain(settled);
  const music = scoreMusicDNATerrain(settled);

  const globalCompound = global.breakdown.find((b) => b.regime === "compound")?.score ?? 0;
  const musicCompound = music.breakdown.find((b) => b.regime === "compound")?.score ?? 0;
  assert(
    musicCompound === globalCompound - 2,
    `MusicDNA compound score should be global-2 (got ${musicCompound} vs ${globalCompound})`,
  );
  assert(music.primary_regime === "compound", `settled session should score compound, got ${music.primary_regime}`);
}

// ---------- recommendMusicDNARegime shape ----------
{
  const rec = recommendMusicDNARegime(
    input({
      session: baseSession({
        vector: { movement: 40, atmosphere: 40, immersion: 40 },
        rounds_shown: 3,
        rounds_answered: 3,
      }),
    }),
  );
  assert(typeof rec.regime === "string", "regime present");
  assert(rec.terrain.mode_pressure === rec.mode_pressure_in, "mode_pressure_in matches terrain");
  assert(rec.pairing_knobs.mode === rec.selection_mode, "knobs.mode matches selection_mode");
  assert(Array.isArray(rec.rationale) && rec.rationale.length > 0, "rationale non-empty");
  assert(typeof rec.scoring_agrees === "boolean", "scoring_agrees present");
}

// ---------- regimeToPairingKnobs explore softens fork ----------
{
  const explore = regimeToPairingKnobs("explore", "alternative", 0.8);
  assert(explore.fork_filter === "soft", "explore → soft fork");
  assert(explore.mode === "recognition_boost", "explore settled → recognition_boost");

  const prune = regimeToPairingKnobs("prune", "alternative", 0.8);
  assert(prune.fork_filter === "hard", "prune → hard fork");
  assert(prune.challenge_boost === 1.8, "prune challenge boost");
}

// ---------- Transition reachability ----------
{
  const terrains = enumerateMusicDNATerrains();
  assert(terrains.length > 100, `expected a large enumeration, got ${terrains.length}`);

  const fired = new Set<SearchRegime>();
  for (const terrain of terrains) {
    const rec = scoreMusicDNATerrain(terrain);
    if (rec.transition_candidate) {
      fired.add(rec.transition_candidate);
    }
  }

  // prune and compound must be reachable. explore (compound→explore) is
  // reachable when moderate artist bias elevates local_minima_risk while
  // mode_pressure stays compound. coordinate is intentionally unreachable.
  assert(fired.has("prune"), `explore→prune must be reachable; fired=${[...fired].join(",")}`);
  assert(fired.has("compound"), `prune→compound must be reachable; fired=${[...fired].join(",")}`);
  assert(
    fired.has("explore"),
    `compound→explore must be reachable via local_minima_risk; fired=${[...fired].join(",")}`,
  );
  assert(!fired.has("coordinate"), "coordinate must remain unreachable for MusicDNA");
}

console.log("musicdna-mapper selftest: OK");
