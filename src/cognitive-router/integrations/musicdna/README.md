# MusicDNA × Agent Brain integration

Reference terrain mapper for MusicDNA. Translates session state into Agent Brain's `TerrainProfile`, scores it with MusicDNA-adjusted weights (`mode_pressure` +2), and returns `PairingKnobs` that preserve today's `SelectionMode` behavior.

## Public surface

```ts
import {
  recommendMusicDNARegime,
  legacyKnobsForMode,
  sessionToTerrain,
  type MusicDNATerrainInput,
} from "../integrations/musicdna/index.js";
```

| Export | Role |
|---|---|
| `sessionToTerrain` | Session → `TerrainProfile` |
| `inferModePressure` | Session → `ModePressure` (terrain **input**) |
| `scoreMusicDNATerrain` | Terrain → regime (`mode_pressure` at +2, not global +4) |
| `recommendMusicDNARegime` | End-to-end recommendation + knobs + rationale |
| `legacyKnobsForMode` | Behavior-preserving defaults for a given `SelectionMode` |
| `regimeToPairingKnobs` | Regime-shaped knobs (recognition mode preserved) |

## Spec

`docs/integrations/musicdna-integration-plan.md` (Part 3).

## Selftest

```bash
npm run smoke:musicdna-mapper
```

## What this package does **not** do

- Does not change MusicDNA's `selectPairing`, evidence gating, or `shouldStop`
- Does not call MusicDNA's database or LLM
- Does not change global `DIMENSION_WEIGHTS` (debugging / media lanes stay intact)
