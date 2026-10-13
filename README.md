# Salt & Sail — The wandering captain

A real-time 3D pirate exploration game. Start as Captain Rowan on foot at Haven’s Reach, with a small unarmed fishing skiff, six bait, five provisions, and 60 gold. Walk through towns, sail a seven-island archipelago, fish, trade, improve your ship, battle corsairs, and establish production settlements.

The terrain, houses, trees, people, vessels, fish schools, flags, and projectiles are individually rendered Three.js mesh assets. Characters walk with animated limbs; sails, waves, birds, windmills, NPCs, and boats animate. The camera follows the captain or vessel and supports zoom. No generated backdrop or image sprite is used by the game.

## Development

Node.js 20.19+ or 22.12+ is required. The current environment has Node 24.

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

The game runs as a normal web application. No downloads, credentials, database, or external API are required to play in a hosted browser preview. WebGL 2 is required. Live preview availability depends on the workspace's browser/port forwarding support; a running local server alone does not establish an externally accessible URL.

## Controls

| Control | Action |
| --- | --- |
| WASD / arrows | Walk on land or steer the vessel |
| Left click | Walk/sail to a point; click a nearby person/spot to approach |
| E | Talk, fish, board your skiff, or disembark near a dock |
| Shift | Sprint on foot; uses stamina |
| Space | Dodge on foot; fire at sea; hook/reel while fishing |
| F / right click | Cutlass on foot; aim and fire a ship's cannon at sea |
| Mouse wheel / zoom buttons | Zoom the following isometric camera |
| M / I / R | Sea chart / inventory / camera reset |
| Escape | Close the current interaction |

Touch controls provide directional movement, contextual interaction, weapons, and zoom.

## The first voyage

Walk down the wooden pier and board the skiff. Click a marked fish school and approach it, then interact. Hook while the marker is green; hold the reel to gain progress, and release to reduce tension. Holding continuously snaps the line. Each cast consumes bait. Schools contain only three or four fish and recover one fish every three active minutes. A basket holds at most eight fish.

Return to the dock, press E to land, and walk to Mara's market to sell your catch. Purchase timber to accompany the gold needed for your first cannon. The larger coastal cutter requires 170 gold, 12 timber, and four iron; it is earned rather than given at the start.

## World progression

- Regional trade prices create routes: Crescent Cay produces cheap timber, and Copperlight pays more for it; Copperlight also supplies cheap iron.
- Merchant stock, cargo capacity, bait, provisions, crew, and building materials constrain the economy. Buying and selling at the same port loses gold.
- Discovering an island awards 15 gold once. Seven islands span a 680-by-680 playable sea.
- Corsair ships patrol and fight in the world with moving cannonballs. Town batteries and guards protect hostile ports. Move, aim, dodge, or sail away rather than exchanging damage in a menu.
- Establishing a settlement requires two crew and provisions, plus defeating a hostile garrison or funding a new outpost. Constructed lumber camps, fisheries, and trading posts visibly appear and produce timber, provisions, or harbor income.
- Production and restocking use active game time, not background/offline windfalls. Progress is saved under `salt-and-sail:world:v2`, separately from the retired prototype.

## Checks and architecture

```sh
npm test
npm run build
```

`src/world/assets.js` creates the reusable 3D assets. `scene.js` handles the renderer, static geometry batching, lighting, animation, camera, and tilt-shift postprocessing. `engine.js` handles movement, collision, interaction, fishing, economy, combat, and saves. `rules.js` contains route finding and economic rules. The React interface is in `src/App.jsx`.

This is an exploration-focused playable foundation inspired by miniature city-building games. It has a small settlement production system, not a complete Anno-scale industrial campaign.
