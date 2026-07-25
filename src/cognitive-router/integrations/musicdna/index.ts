// MusicDNA × Agent Brain integration — public surface.
//
// MusicDNA imports from here (or copies the built artifacts) to:
//   1. Map session state → TerrainProfile
//   2. Score with MusicDNA-adjusted mode_pressure (+2, not global +4)
//   3. Obtain PairingKnobs that preserve today's SelectionMode behavior
//
// Spec: docs/integrations/musicdna-integration-plan.md

export * from "./types.js";
export * from "./signals.js";
export * from "./knobs.js";
export * from "./terrain-mapper.js";
export * from "./scoring-musicdna.js";
export * from "./recommender.js";
