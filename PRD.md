# PRD — Open World Sky (a tiny No Man's Sky)

## 1. Goal
A browser game where the player flies between star systems and lands on planets.
The galaxy holds **4,096 star systems and ~14,000 planets**, and every planet is
different: name, biome, colors, terrain shape, weather, flora, fauna, resources.
Everything is derived from a single galaxy seed, so the same planet always looks
the same when revisited. No downloaded art or audio: all assets are generated in
code (geometry, canvas textures, WebAudio sound).

## 2. Scope (v1)
In scope:
- Galaxy map: 2D top-down view of all systems, hover to inspect, click to warp.
- System view (3D space): star, orbiting planets, free-flight ship camera.
- Landing: approach a planet, press `E`, switch to surface view.
- Surface view (3D, first person): infinite procedural terrain, water/lava,
  sky color, fog, sun, moons, flora, rocks, wandering creatures.
- Scanner (`F`): shows planet data, records the discovery.
- Persistence: current system + discoveries in `localStorage`.
- Procedural audio: engine hum, warp whoosh, scan beep, ambient pad per planet.

Added in v1.1 (requested during the build):
- **Species catalog**: every planet has 2–7 fauna species and 2–6 flora species, each with
  a body plan ("genes": legs, eyes, horns, antennae, wings, tail, glow, movement style) and
  lore (temperament, diet, a strange quirk). ~41,000 fauna and ~35,000 flora species in total.
- **Dinosaurs** (rex, raptor packs, longnecks) on ~3,000 planets and **sea life** (fish
  schools, glowing jellyfish, whale-like leviathans) under the water on ~6,000 planets.
- **Ships**: procedural ship designs in four classes (fighter, explorer, hauler, exotic)
  with stats that change flight. Chase and cockpit cameras; hangar to pick a ship; the
  ship sits landed next to the player on the surface.
- **Power and combat**: shield, hull and energy. Energy powers boost, weapons and warp
  (30 per jump). Lasers and homing rockets, asteroid fields to mine, pirate squads in
  dangerous systems, explosions with debris.
- **Surface survival**: mining beam for flora and rocks, life support and hazard
  protection that drain on hostile planets and during storms, recharge with resources,
  sentinel drones that attack when you mine too much, a blaster to fight back.
- **Death and respawn**: ship destroyed or player killed → death screen, half the
  inventory is lost, respawn at the ship.
- **Touch controls** for phones and tablets (joystick, drag to look, action buttons).

Added in v1.2:
- **Scale and travel**: planets 15–360 units in four size classes, orbits up to 25,000 units;
  normal/boost/pulse drive (60/320/1,600 u/s), auto-landing when flying into an atmosphere.
- **Odd planets**: potato, twin, donut, shattered and cube worlds (~12%); gas giants.
- **Solar System** at index 0 with real relative planet sizes (distances compressed).
- **Black holes** (~100 systems) with gravity and a lethal horizon; supernovae, comets,
  meteors, twinkling stars, occasional explosions.
- **Minimap** and on-screen planet/ship markers.
- **Third person** on foot, **atmospheric flight** in your own ship, jetpack.
- **NPC travellers** in space and on planets; **day–night cycle** with auroras;
  **ancient ruins** with lore; **pets**; **derelict freighters**; rare **golden planets**.

Added in v1.3 (quests and gathering):
- **Quest journal** (`J`): a 35-quest main story in four chapters (Pendaratan Pertama, Naturalis,
  Bintang-Bintang, Legenda) plus endless side contracts (3 on the board, built from the current
  planet's plants, animals and minerals, or space tasks while flying). `K` in the journal swaps
  the oldest contract. Rewards: Nanit, items and XP; XP raises the explorer rank.
- **Plant materials**: harvesting a plant can also drop a material tied to its shape
  (Nektar, Spora, Serpih Kristal, Getah Kaktus...). The first harvest of a species records it
  in the flora catalog.
- **Animal products**: `Q` next to a calm animal collects wool, milk, eggs, scales... without
  hurting it (45 s cooldown per animal). Hunting drops a trophy (Kulit Fauna, Tulang Besar,
  Bulu Sayap). Scanning (`F`) next to an animal records its species in the fauna catalog.
- **Ground pickups**: glowing items with a light beam, per biome (herbs, fruit, eggs, fossils,
  geodes, pearls...). Walk into one to pick it up.

- **Planet collections**: every planet has its own checklist in the journal: all its fauna
  species (scan), all flora species (harvest), 3 endemic items named for that planet (a plant
  product, a mineral and a rare relic that shows as a cyan ground pickup), its biome pickups and
  its minerals. Finishing a list pays a one-time bonus; chapter 5 of the story (Kurator) asks for
  1, 5 and 12 finished planets.

- **NPC requests**: about 65% of the explorers who land on a planet have a request, shown by a
  green "!" above their head. `T` next to one accepts it (it goes to the journal). Requests:
  deliver local minerals, Ferit/Karbon for a broken ship, food, the planet's endemic items or
  pickups (handed over automatically once carried), find the endemic relic, hunt pests, record
  a new species, collect animal products. The same explorer always asks the same thing; answered
  explorers are remembered in the save.

Added in v1.4 (built by parallel agents; each is an addon registered in src/game/addons.js
or src/gameplay/world-addons.js):
- **Crafting + market** (`U`, src/craft/): 6 upgrade lines × 3 tiers (thermal, filter, oxygen
  tank, beam range, mining speed, blaster rate) that change life-support drain / tools; consumables
  (Obat, Umpan, Sel Darurat); sell/buy with Nanit; endemic items sell for double outside their
  home system.
- **Guidance + collection book** (`L`, src/guide/): on-foot markers to the nearest endemic relic,
  explorers with requests and quest items; nearest planet of a biome a quest asks for; a book of
  every species, finished planet and endemic item.
- **Rare wildlife and events** (src/gameplay/rare-wildlife.js, night-flora.js, src/events/): ~5%
  golden animals (Bulu Emas, Susu Bintang, Trofi Langka); Bunga Bulan at night, Kristal Badai in
  storms; meteor showers, mass blooms and herd migrations.
- **Daily challenges, NPC chains, rival, alien reputation** (src/quest/daily.js, npc-chains.js,
  rival.js, reputation.js): 3 dated challenges with streak bonus; multi-step explorer stories across
  systems; a named rival racing you to finish planet collections; reputation tiers per alien race
  with gifts and race orders.
- **Cargo and rescue missions** (`O` on a planet, src/missions/): deliver goods, live animals,
  plants or contraband to planets 1–5 jumps away; hold size depends on ship class (fighter 4,
  explorer/exotic 8, hauler 14, + cargo parts); big animals need a hauler, contraband a fighter;
  distress calls to save planets (plague, pirates, sentinels, stranded colony, drought) on a timer.
- **Achievements, onboarding, settings** (src/achieve/, src/tutorial/, src/settings/): 67 trophies in
  seven categories (bronze/silver/gold tiers) counted from act events and the save, with an unlock
  banner, a Nanit reward and a "Trofi" tab in the collection book (`L`); a progressive tutorial that
  introduces one system at a time as a small hint card; a settings menu (`` ` ``) for graphics quality,
  volumes, mouse sensitivity, invert Y, hints and key rebinding, stored in `openworldsky.settings`.

Added in v1.5:
- **Pemakan Planet** (src/devourer/): a rare galaxy-wide event. Roughly every 16–28 minutes of play
  (first after 10) a colossal entity (~6,800 units, 20× the Kapal Induk) appears in a system a few
  jumps away and spends 6 minutes draining one of its planets. A red pulsing marker on the galaxy
  map (M), a banner with a live countdown and a journal card point the way. 150 allied fighters
  (one InstancedMesh) and five capital ships fight it: shields up (six nodes), core open, then
  enraged sweeping beams that hurt the player's ship and burn capital ships down. The player's own
  damage is tracked separately and rewards scale with it. Win and the planet is scarred but saved;
  lose and it is consumed for good and regenerates as a shattered husk (`log.s.devourer.eaten`).
- **Mech transformasi** (`.`, src/mech/): the player's ship folds into a 14–21 m humanoid mecha,
  derived from the active ship design — wings become shoulder binders, engines become backpack and
  calf thrusters, the cockpit becomes the head and chest hatch, hull/trim/glow colours carry over,
  and the class sets the build (fighter slim, hauler heavy, explorer sensor-headed, exotic strange
  with a halo ring). A ~2.3 s transformation plays in space, in atmosphere and on the ground: the
  hull rears up with its landing legs out and engines flaring, energy columns spool up around it,
  it spins down into a white burst with a shock ring and lens glint (time crawling through the
  swap), and the mech spins out and locks into a stance while the camera arcs around and settles.
  On a planet it can be triggered on foot beside the parked ship **or while flying it**, in which
  case the mech drops out of the sky on its jets and lands in a crouch; folding back in the air
  hands the ship over still flying. In space it hovers, strafes and stops dead (46 u/s cruise, 190
  boosting); on a planet it walks and runs with IK feet planted on the terrain, jump-jets, shakes
  the camera and crushes what it steps on. Six weapon modes (mouse wheel or 1–6): beam rifle,
  bazooka, gatling, particle cannon, missile pod and a three-hit beam saber combo, with RMB always
  the pod and middle mouse always the saber. Each has its own stance, recoil, muzzle work and
  sound, and all of them deal damage through the existing space and surface weapon paths. Energy
  is currently free (`UNLIMITED` in src/mech/mech-power.js); flipping that back restores the
  transform fee and the 5/s / 4.2/s drain. It reuses the ship's hull/shield, and the usual death
  and respawn flow applies.

- **Duel mobile suit** (event, src/duel/): a named rival frame challenges the player — in space it
  intercepts the ship inside a star system, on a planet it drops out of orbit on its thrusters and
  lands 95 m away. Four rivals, each a real mech built from a fixed ship seed and repainted (Sabre
  Merah closes with the blade, Vayu Biru snipes and keeps its distance, Golem Hitam is a wall, Nyx
  Ungu is fast and erratic). In space it jousts on a ring, fires lead-aimed beam volleys and
  commits to boost dashes with the sabre out; on the ground it walks the player down, telegraphs a
  beam rifle shot with a thin warning line, then jet-dashes into a slash. Each rival cycles a guard
  window that soaks most of a hit, shown as a bubble and on the health bar. The rival is registered
  as an ordinary hostile — a `combat.pirates` entry in space, a Wildlife group on the ground — so
  every ship gun, hand weapon, grenade and mech weapon already damages it. Transforming into your
  own mech brings the next challenge forward. Winning pays Nanit, XP and the rival's badge
  (`log.s.duel.wins`). Debug: `__duel.spawn(id)`, `__duel.now()`, `__duel.status()`.

- **Base building** (`Y` on foot, src/build/): plant a Suar Markas to claim one base per planet,
  then build it piece by piece — foundations, walls, windows, doors, roofs, pillars, stairs, ramps,
  fences and decor, plus manual stations: a planter you sow and harvest with `T`, a pen you lure a
  tamed animal into, a workbench that opens the craft panel, a locker you fill by hand, a landing
  pad for your ship and a teleport pad that jumps between your bases for 40 Nanit. Pieces snap to
  what is already built, can be painted, and nothing in a base ever produces on its own.

Out of scope: crafting trees, multiplayer, trading.

## 3. Controls
| Key | Space | Surface |
|---|---|---|
| Mouse | look (pointer lock) | look |
| W/A/S/D | thrust / strafe | walk |
| R / C | up / down | — |
| Space | — | jump |
| Shift | boost | sprint |
| E | land (near planet) | take off |
| F | scan target planet | scan current planet |
| M | galaxy map | — |
| LMB | laser | mining beam |
| RMB | homing rocket | blaster |
| V | chase / cockpit camera | — |
| H | hangar | — |
| G | — | recharge suit with resources |
| Q | — | collect product from a calm animal |
| J | quest journal | quest journal |
| K | swap contract (journal open) | swap contract (journal open) |
| U | craft / market | craft / market |
| L | collection book | collection book |
| O | — | cargo board |
| Y | fleet board | build mode (1–0 / Q E pick, R rotate, C paint, X remove, Z undo) |
| Tab / I | inventory | inventory |
| ` | settings menu | settings menu |
| . | ship ⇄ mech | ship ⇄ mech (on foot near the ship, or while flying it) |
| Roda / 1–6 | mech weapon mode | mech weapon mode |
| Esc | release mouse | release mouse |

## 4. Tech
- Plain ES modules, no build step. `three` from `vendor/three.module.js` via importmap.
- Run: `python3 -m http.server 8080` in the project root, open `http://localhost:8080`.
- Every source file ≤ 300 lines, functions ≤ 30 lines where practical.

## 5. Architecture
```
index.html, style.css
src/main.js              boot, render loop, mode switching (space / surface / map)
src/state.js             save/load, discoveries
src/core/rng.js          hash32, Rng (mulberry32), rngOf, unitOf
src/core/noise.js        noise2/noise3, fbm2/fbm3, ridge2
src/core/color.js        hex <-> hsl helpers, mixHex, shiftHex
src/core/input.js        keyboard + mouse + pointer lock
src/gen/names.js         procedural names
src/gen/galaxy.js        SYSTEM_COUNT, systemAt, planetsOf, allSystems
src/gen/planet.js        makePlanet -> planet descriptor
src/gen/terrain.js       heightFn(planet), groundColor(...)
src/view/space.js        SpaceView (system 3D scene)
src/view/surface.js      SurfaceView (planet 3D scene, player)
src/view/surface-props.js flora / rocks / creatures
src/view/galaxymap.js    GalaxyMap (2D canvas overlay)
src/ui/hud.js            Hud (DOM overlay)
src/audio/sfx.js         Audio (WebAudio synth)
src/assets/textures.js   canvas-generated textures
src/gen/species.js       per-planet fauna/flora species catalog
src/game/                PlayerState, space/surface mode controllers, event wiring
src/view/life/           creature builder, herds, dinosaurs, sea life, flora builder
src/view/ship/           ship designs, models, flight rig, landed ship
src/combat/, src/fx/     space combat, pirates, asteroids, explosions
src/gameplay/            mining, life support, sentinels, blaster
src/ui/                  HUD, scan panel, vitals, inventory, death screen, hangar, map
src/core/touch.js        touch controls
src/quest/               story chain, contract generator, quest log, material tables
src/game/quest-wiring.js quest log <-> game events, journal keys
```

## 6. Module contracts
All views share this shape:
```js
view.mount(...args)          // build the scene
view.update(dt, input)       // dt in seconds
view.render(renderer)        // renderer.render(scene, camera)
view.resize(w, h)
view.dispose()               // free geometries/materials
```

### Planet descriptor (src/gen/planet.js)
```js
{
  key: '12-3', seed, index, systemIndex, name,
  biome: { id, label },            // lush|desert|frozen|toxic|irradiated|volcanic|barren|ocean|exotic
  radius,                          // space-view sphere radius (2.5..7)
  orbit: { radius, speed, phase, tilt },
  palette: { ground1, ground2, rock, water, sky, fog, flora, floraAlt, fauna, sun }, // hex ints
  terrain: { style, amp, freq, gain, hasWater, waterY, spaceWater },
  gravity, temperature, atmosphere, atmosphereDensity, radiation, toxicity, weather, hazard,
  flora: { density, kind },        // kind: tree|mushroom|crystal|spike|coral
  fauna: { count, kind, size },    // kind: hopper|walker|floater
  resources: [string], moons, rings,
}
```

### System descriptor (src/gen/galaxy.js)
```js
{ index, seed, name, pos: {x, y, z}, star: { type, label, color, size }, planetCount }
```

### Input (src/core/input.js)
`input.down(code)`, `input.pressed(code)` (true once per press), `input.mouse.dx/dy`,
`input.locked`, `input.endFrame()`.

### Events from views to main
Views never switch modes themselves; they expose state and main reacts:
- `space.targetPlanet()` → planet near enough to land on, or `null`.
- `space.lookedPlanet()`  → planet under the crosshair (for HUD / scan), or `null`.
- `surface.planet` → current planet.

## 7. Success criteria
- Page loads with no console errors; first frame under 2 s.
- Warping to 10 random systems and landing on 10 random planets shows visibly
  different colors, terrain and flora each time.
- 60 fps on a laptop in both views.
- Revisiting a planet reproduces it exactly.
