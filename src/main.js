// Boot + render loop + mode switching between title, space, surface, map and hangar.
import * as THREE from 'three';
import { Input } from './core/input.js';
import { attachTouch } from './core/touch.js';
import { allSystems, systemAt, planetsOf } from './gen/galaxy.js';
import { loadSave, writeSave, markVisited, recordDiscovery, discoveryCount } from './state.js';
import { SpaceView } from './view/space.js';
import { SurfaceView } from './view/surface.js';
import { GalaxyMap } from './view/galaxymap.js';
import { shipDesign } from './view/ship/ship-design.js';
import { Hud } from './ui/hud.js';
import { Vitals } from './ui/hud-vitals.js';
import { Inventory } from './ui/inventory.js';
import { DeathScreen } from './ui/death-screen.js';
import { Hangar } from './ui/hangar.js';
import { Transition } from './ui/transition.js';
import { WarpFx } from './ui/warp-fx.js';
import { Overlays } from './game/overlays.js';
import { Shipyard } from './ui/shipyard/shipyard.js';
import { activeSpec } from './ui/shipyard/shipyard-store.js';
import { customDesign } from './view/ship/ship-custom.js';
import { hexCss } from './ui/dom.js';
import { Minimap } from './ui/minimap.js';
import { Markers } from './ui/markers.js';
import { spaceFeed, surfaceFeed } from './game/hud-feed.js';
import { Sfx } from './audio/sfx.js';
import { PlayerState } from './game/player-state.js';
import { wirePlayerEvents } from './game/player-events.js';
import { SpaceMode, SPACE_HINTS } from './game/space-mode.js';
import { SurfaceMode, SURFACE_HINTS, FLIGHT_HINTS } from './game/surface-mode.js';
import { rechargeShip } from './game/ship-recharge.js';
import { runTutorial } from './game/tutorial.js';

const WARP_COST = 30;
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const save = loadSave();
const input = new Input(canvas);
attachTouch(input, canvas);
const hudRoot = document.getElementById('hud');
const hud = new Hud(hudRoot);
const vitals = new Vitals(hudRoot);
const inventory = new Inventory(hudRoot);
const death = new DeathScreen(hudRoot);
const minimap = new Minimap(hudRoot);
const markers = new Markers(hudRoot);
const transition = new Transition(document.body);
const warpFx = new WarpFx();
const sfx = new Sfx();
const player = new PlayerState(save.player);
const space = new SpaceView();
const surface = new SurfaceView();
const map = new GalaxyMap(save.galaxySeed);
const hangar = new Hangar();
const overlays = new Overlays({ input, sfx, hangar, save, setMode: (m) => setMode(m), getMode: () => game.mode,
  onShip: (d, spec) => useShip(d, spec) });
overlays.shipyard = new Shipyard();
const spaceMode = new SpaceMode({ space, player, sfx });
const surfaceMode = new SurfaceMode({ surface, player, sfx, hud });
const totalPlanets = allSystems(save.galaxySeed).reduce((n, s) => n + s.planetCount, 0);

const game = { mode: 'title', system: null, planets: [], planet: null, design: activeSpec(save) ? customDesign(activeSpec(save)) : shipDesign(save.shipSeed ?? 1), saveTimer: 0 };
space.setShip(game.design);

function persist() {
  save.player = player.toJSON();
  save.shipSeed = game.design.seed;
  writeSave(save);
}

function refreshStats() {
  hud.setStats({ discoveries: discoveryCount(save), visited: save.visited.length, total: totalPlanets });
}

function setMode(mode) {
  game.mode = mode;
  document.body.dataset.mode = mode;
  hud.setMode(mode === 'hangar' ? 'map' : mode);
  vitals.setMode(mode);
  minimap.setMode(mode);
  markers.setMode(mode);
  if (mode === 'space') hud.setHints(SPACE_HINTS);
  if (mode === 'surface') hud.setHints(SURFACE_HINTS);
  hud.setCrosshair(mode === 'space' || mode === 'surface');
  if (mode !== 'surface') sfx.mineBeam(false);
  if (mode !== 'space') sfx.alarm(false);
  hud.hideScan();
}

function enterSystem(index, spawnNear = null) {
  game.system = systemAt(save.galaxySeed, index);
  game.planets = planetsOf(save.galaxySeed, game.system);
  spaceMode.enter(game.system, game.planets, spawnNear, game.design);
  markVisited(save, index);
  hud.setSystem(game.system, game.planets, spawnNear ?? -1);
  refreshStats();
}

// Atmospheric entry cinematic, then the real scene swap at its peak.
function land(planet) {
  if (transition.busy) return;
  sfx.land();
  transition.play('enter', () => arrive(planet), hexCss(planet.palette.sky));
}

function arrive(planet) {
  game.planet = planet;
  game.flying = false;
  spaceMode.exit();
  surfaceMode.enter(planet, game.system, game.design, save.galaxySeed);
  sfx.setAmbient(planet);
  player.suit.health = Math.max(player.suit.health, 1);
  hud.setSystem(game.system, game.planets, planet.index);
  hud.toast(`Mendarat di ${planet.name}`);
  setMode('surface');
  persist();
}

function tryLand(planet) {
  if (planet.gas) hud.toast('Planet gas: tidak bisa mendarat');
  else land(planet);
}

function takeOff() {
  if (transition.busy) return;
  sfx.takeoff();
  transition.play('exit', depart, hexCss(game.planet.palette.sky));
}

function depart() {
  const planet = game.planet;
  game.planet = null;
  surfaceMode.exit();
  enterSystem(game.system.index, planet.index);
  sfx.setAmbient(null);
  setMode('space');
  persist();
}

// F toggles the scan panel; a second press closes it.
function scan(planet) {
  if (hud.scanOpen) { hud.hideScan(); return; }
  const isNew = recordDiscovery(save, planet);
  sfx.scan();
  if (isNew) { sfx.discover(); player.addItem('Nanit', 25); }
  hud.showScan(planet, isNew);
  refreshStats();
}

function resumeSpace() {
  input.justPressed.clear();
  setMode('space');
  input.lock();
}

function openMap() {
  overlays.open('map');
  map.open({ currentIndex: game.system.index, visited: save.visited, onWarp: warpTo, onClose: resumeSpace });
}

// New ship from the hangar or the DIY shipyard (spec = custom build, saved for reloads).
function useShip(design, spec = null) {
  game.design = design;
  space.setShip(design);
  if (game.mode === 'surface' || overlays.back === 'surface') surface.setShip(design);
  hud.toast(`Pesawat: ${design.name}`);
  persist();
}

function warpTo(index) {
  if (!player.useEnergy(WARP_COST)) {
    hud.toast(`Energi kurang (${WARP_COST} untuk warp)`);
    resumeSpace();
    return;
  }
  if (warpFx.busy) return;
  setMode('warp'); // world idles behind the tunnel; no input
  sfx.warp();
  warpFx.play(() => jumpTo(index, false), () => { hud.toast(`Tiba di ${game.system.name}`); resumeSpace(); });
}

// Instant system change (the tunnel's midpoint; tests call it directly).
function jumpTo(index, resume = true) {
  enterSystem(index);
  persist();
  if (resume) resumeSpace();
}

function updateSpace(dt) {
  const s = spaceMode.update(dt, input);
  hud.setTarget(s.target ?? s.looked, Boolean(s.target && !s.target.planet.gas));
  hud.setSpeed(space.speed);
  vitals.update(player, { hostiles: s.hostiles, lock: s.lock, boostAllowed: s.boostAllowed });
  game.feed = spaceFeed(space, spaceMode.combat, s.target, spaceMode.traffic.list());
  const hail = s.npcShip ? `${s.npcShip.name} · ${s.npcShip.captain}` : null;
  if (hail && hail !== game.lastHail) hud.toast(`Kapal lewat: ${hail}`);
  game.lastHail = hail;
  if (player.dead) return;
  if (s.landOn) land(s.landOn);
  else if (input.pressed('KeyE') && s.target) tryLand(s.target.planet);
  else if (input.pressed('KeyF') && (s.looked || s.target)) scan((s.looked ?? s.target).planet);
  else if (input.pressed('KeyM')) openMap();
  else if (input.pressed('KeyH')) overlays.hangar(game.design);
  else if (input.pressed('KeyB')) overlays.openShipyard(game.design);
  else if (input.pressed('KeyG')) { hud.toast(rechargeShip(player)); sfx.pickup(); }
}

function updateSurface(dt) {
  const s = surfaceMode.update(dt, input);
  hud.setSurface(game.planet, { creature: s.creature });
  vitals.update(player, { wanted: s.wanted, storm: s.storm, beam: s.beam });
  game.feed = surfaceFeed(surface, surfaceMode.wildlife, surfaceMode.gameplay, surfaceMode.visitors.list());
  const line = s.visitor?.line ?? null;
  if (line && line !== game.lastLine) hud.toast(`${s.visitor.name}: ${line}`);
  game.lastLine = line;
  if (s.flying !== game.flying) { game.flying = s.flying; hud.setHints(s.flying ? FLIGHT_HINTS : SURFACE_HINTS); }
  if (player.dead) return;
  if (s.leave) takeOff();
  else if (input.pressed('KeyE')) surfaceMode.door(s);
  else if (input.pressed('KeyF')) {
    scan(game.planet);
    if (s.creature) hud.toast(`Fauna: ${s.creature.name}`);
  }
}

function tick(dt) {
  if (input.pressed('Tab') || input.pressed('KeyI')) inventory.toggle();
  if (input.pressed('KeyN')) minimap.toggleZoom();
  inventory.update(player);
  game.saveTimer += dt;
  if (game.saveTimer > 10) { game.saveTimer = 0; persist(); }
}

function frame(dt) {
  const playing = game.mode === 'space' || game.mode === 'surface';
  const paused = playing && !input.locked && !death.isOpen;
  if (paused !== game.paused) { game.paused = paused; hud.showPaused(paused); if (paused) sfx.silenceLoops(); }
  // Paused = the whole world freezes (no enemy fire, no drain); only rendering continues.
  if (paused) { /* frozen */ } else if (game.mode === 'space') updateSpace(dt);
  else if (game.mode === 'surface') updateSurface(dt);
  else spaceMode.idle(dt);
  if (playing && !paused) tick(dt);
  const view = game.mode === 'surface' ? surface : space;
  view.render(renderer);
  if (playing && game.feed) { minimap.update(game.feed.map); markers.update(view.camera, game.feed.markers); }
  input.endFrame();
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  space.resize(innerWidth, innerHeight);
  surface.resize(innerWidth, innerHeight);
}

function start() {
  sfx.unlock();
  sfx.setAmbient(null);
  hud.showTitle(false);
  setMode('space');
  input.lock();
  runTutorial(save, hud, writeSave);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frame(dt);
  requestAnimationFrame(loop);
}

space.onPulse = (on, reason) => {
  if (on) { hud.toast('Pulse aktif'); sfx.warp(); } else if (reason === 'arrive') hud.toast('Pulse: tiba');
  else if (reason === 'empty') hud.toast('Energi habis');
};
wirePlayerEvents({ player, vitals, inventory, death, hud, sfx, input }, () => {
  (game.mode === 'surface' ? surfaceMode : spaceMode).onRespawn();
  persist();
});
addEventListener('resize', resize);
addEventListener('beforeunload', persist);
canvas.addEventListener('click', () => {
  if ((game.mode === 'space' || game.mode === 'surface') && !death.isOpen) input.lock();
});
hud.onStart(start);
enterSystem(save.systemIndex);
resize();
setMode('title');
hud.showTitle(true, { discoveries: discoveryCount(save), visited: save.visited.length });
requestAnimationFrame(loop);

// Debug/test hook: drive the game from the console or a headless browser.
window.__game = { game, save, input, hud, sfx, player, space, surface, spaceMode, surfaceMode, land, takeOff, arrive, depart, warpTo, jumpTo, start, setMode };
