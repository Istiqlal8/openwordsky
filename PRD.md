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

Out of scope: crafting trees, multiplayer, trading, base building.

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
| Tab / I | inventory | inventory |
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
