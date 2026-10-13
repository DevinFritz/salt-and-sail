# Salt & Sail — local development handoff

## Run locally

Open the `salt-and-sail` folder in your terminal or editor. Use Node.js 22.12+ (Node 22 / 24 tested).

```sh
cd salt-and-sail
npm ci
npm run dev
```

Open the URL Vite prints, normally `http://localhost:5173`. WebGL 2 is required. No secrets or backend are needed.

```sh
npm test       # 14 comprehensive gameplay and mechanics tests
npm run build # production assets in dist/
```

The repository includes source, tests, dependency lockfile, audio synthesizer, documentation, and the favicon.

## What exists now

- **Graphics & 3D Assets**:
  - Individually rendered Three.js world with 7 distinct islands, featuring multi-tiered organic terrain elevation (sandy beaches, rocky shelves, grass uplands, rolling plateaus).
  - Varied vegetation: curving segmented palm trees with coconuts and drooping fronds, volumetric deciduous oaks, coniferous pine trees, coastal rocks.
  - Distinct architectural themes:
    - *Haven’s Reach*: coastal fishing cottages with timber framing, chimneys, lanterns, and fish drying racks.
    - *Crescent Cay*: tropical merchant port with colorful awnings, turning windmill, and market stalls.
    - *Copperlight*: industrial iron foundry with stone masonry, smelting chimneys, and anvil props.
    - *Tidewatch & Fort Saint Elmo*: imposing stone bastions, heavy cannon parapets, and banners.
    - *Whispering Key & Orchid Atoll*: wild isles with ancient stone ruins, glowing sea crystals, and half-submerged shipwrecks with floating salvage.
  - Vessels:
    - *Fishing Skiff (Tier 0)*: detailed wooden hull with planking seams, rudder, lateen sail, and stern lantern.
    - *Coastal Cutter (Tier 1)*: twin masts, billowing sails, bowsprit with triangular jib, ship wheel helm, quarterdeck cabin, and broadside cannon ports.
    - *Corsair Raiders*: dark hulls with pirate battle sails and naval artillery.
  - Living ocean shader: multi-octave Gerstner/sine waves, coastal depth gradient (abyss, deep, shallow turquoise, lagoon), sun specular highlights, dynamic glints, and white coastal surf foam.
  - Particle systems: cannon muzzle flashes with smoke puffs, water splashes, wood splinters upon impact, and ambient seagull flocks.

- **Audio System (Procedural Web Audio API)**:
  - Zero-dependency procedural synthesizer (`src/world/audio.js`):
    - Ambient ocean surf and occasional distant seagull cries.
    - Footstep acoustics (wood pier vs cobblestone/grass).
    - Cannon explosions with deep low-frequency punch, blast noise, and water splashes / wood crunches.
    - Cutlass swings and parries.
    - Fishing rod casts, splash plops, bite chimes, reel clicks, and catch fanfare.
    - Gold pouch clinking on market transactions and salvage discovery.
    - Persistent mute toggle in the game header.

- **Nautical Sailing & Mechanics**:
  - Dynamic wind simulation: shifting wind directions and speeds, displayed on a nautical Wind Compass HUD widget. Sailing with a tailwind grants high-speed sailing; sailing into the wind requires tacking.
  - Multi-cannon broadside salvos: upgrading cannons fires multi-shot spread salvos with visual aiming arcs on the water.
  - Tactical corsairs: raiders navigate, engage in broadside duels, and become crippled at low hull.
  - **Boarding Action**: When a corsair ship is crippled (low hull), pull alongside and press E to board! Duel the enemy crew and seize lucrative plunder (gold, timber, rum).
  - Coastal Fortress Artillery: Hostile island batteries fire heavy mortar shells with audible whistles and defensive engagements.
  - Sea Salvage: Open water features floating flotsam and cargo crates that player vessels can scoop up for bonus gold and timber.

- **Anno-Inspired Island Economy & Town Logistics**:
  - Island Warehouses: Claimed settlements feature dedicated island storage depots for Timber, Iron, Food, and Rum.
  - Settlement Logistics: Players can easily unload cargo into island warehouses or load resources into ship holds for trade runs.
  - Workshop Production Chains: Lumber camps, Fisheries, Trading posts, Rum distilleries, and Smelting forges produce goods every minute.
  - Population & Taxes: Established colonies house growing populations that pay regular gold taxes per minute.

- **Trading & Contracts**:
  - Regional supply and demand arbitrage across all 7 ports (e.g. cheap timber at Crescent Cay sold high at Copperlight; high-value rum at Crescent).
  - Port Bounty Board & Contracts: Notice board with lucrative trade deliveries, corsair bounty hunts, and master fisherman challenges.
  - Captain’s Sea Chest & Logbook: Tracks cargo, fresh catches, discovered fish species (Sardine, Snapper, Tuna, Pearlfin) with lore and values, islands visited, and corsairs sunk.

## Verification completed

- **All 14 gameplay rule tests pass** cleanly with `npm test`.
- **Production build succeeds** cleanly with `npm run build` using Vite.
- Headless tests cover:
  1. Starting foot/skiff state, gear limits, and walkable piers.
  2. Market stock, gold constraints, and regional price margins.
  3. Trade route rewards and arbitrage.
  4. Fish school depletion, bait consumption, and timing.
  5. Line tension snapping on continuous hold.
  6. Hook accuracy timing.
  7. A* pathfinding and navigable water routes between all 7 islands.
  8. Shipyard cannon/hull upgrades and material costs.
  9. Settlement claiming requirements (crew, food, defeated batteries).
  10. Settlement workshop production at minute boundaries.
  11. Wind factor tailwind acceleration vs tacking speed.
  12. Island warehouse logistics (storing and loading cargo).
  13. Boarding action on crippled corsair ships (plunder and victory records).
  14. Rum trade and multi-port arbitrage.

## Main files

| File | Responsibility |
| --- | --- |
| `src/world/audio.js` | Procedural Web Audio engine (ocean, sailing, cannon blasts, footsteps, fanfare) |
| `src/world/content.js` | Archipelago lore, islands, goods, buildings, contracts, starting state |
| `src/world/assets.js` | 3D models (Captain Rowan, ships, terrain, architecture, foliage, props, wreckage) |
| `src/world/scene.js` | Three.js rendering, living ocean shader, camera, particles, aiming arcs |
| `src/world/engine.js` | Movement, wind physics, combat broadsides, boarding, fishing, economy, saves |
| `src/world/rules.js` | Wind factors, warehouse transfers, market pricing, pathfinding, save loading |
| `src/App.jsx` / `src/styles.css` | HUD, wind compass, warehouse modal, contracts board, sea chart, touch controls |
| `tests/world.test.js` | 14 automated gameplay-rule and mechanics test suites |

Save key: `salt-and-sail:world:v2`. Reset progress anytime via the pause menu (`Esc`).
