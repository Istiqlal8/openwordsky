// Mode changes: space ⇄ planet surface ⇄ gas-giant dive, warps, scans, ship swaps, saving.
import { systemAt, planetsOf } from '../gen/galaxy.js';
import { writeSave, markVisited, recordDiscovery, discoveryCount } from '../state.js';
import { hexCss } from '../ui/dom.js';
import { runTutorial } from './tutorial.js';
import { interiorStyleOf } from '../freighter/interior/style.js';
import { SPACE_HINTS } from './space-mode.js';
import { SURFACE_HINTS } from './surface-mode.js';
import { shipMod } from '../craft/ship-mods.js';

const WARP_COST = 30;
export const GAS_HINTS = [['Mouse', 'Arah'], ['W', 'Maju'], ['Shift', 'Boost'], ['S', 'Rem'],
  ['Space / R', 'Naik'], ['C', 'Turun'], ['Z / X', 'Guling'], ['F', 'Pindai makhluk']];
const PLAY_MODES = new Set(['space', 'surface', 'gas', 'freighter']);
export const FREIGHTER_HINTS = [['W A S D', 'Jalan'], ['Shift', 'Lari'], ['Space', 'Lompat'], ['V', 'Kamera'],
  ['T', 'Gunakan'], ['E', 'Naik pesawat']];

export class Flow {
  constructor(app) {
    this.a = app;
  }

  get game() { return this.a.game; }

  persist() {
    const { save, player, game } = this.a;
    save.player = player.toJSON();
    save.shipSeed = game.design.seed;
    writeSave(save);
  }

  refreshStats() {
    const { hud, save, totalPlanets } = this.a;
    hud.setStats({ discoveries: discoveryCount(save), visited: save.visited.length, total: totalPlanets });
  }

  isPlaying() { return PLAY_MODES.has(this.game.mode); }

  setMode(mode) {
    const { hud, vitals, minimap, markers, sfx } = this.a;
    this.game.mode = mode;
    document.body.dataset.mode = mode;
    const hudMode = mode === 'hangar' ? 'map' : mode === 'gas' ? 'space' : mode === 'freighter' ? 'surface' : mode;
    hud.setMode(hudMode);
    vitals.setMode(hudMode);
    const bare = mode === 'gas' || mode === 'freighter';
    minimap.setMode(bare ? 'none' : mode);
    markers.setMode(bare ? 'none' : mode);
    const hints = { space: SPACE_HINTS, surface: SURFACE_HINTS, gas: GAS_HINTS, freighter: FREIGHTER_HINTS }[mode];
    if (hints) hud.setHints(hints);
    hud.setCrosshair(this.isPlaying());
    if (mode !== 'surface') sfx.mineBeam(false);
    if (mode !== 'space' && mode !== 'gas') sfx.alarm(false);
    hud.hideScan();
  }

  enterSystem(index, spawnNear = null) {
    const { save, spaceMode, hud } = this.a, g = this.game;
    g.system = systemAt(save.galaxySeed, index);
    g.planets = planetsOf(save.galaxySeed, g.system);
    spaceMode.enter(g.system, g.planets, spawnNear, g.design);
    markVisited(save, index);
    hud.setSystem(g.system, g.planets, spawnNear ?? -1);
    this.a.freighter.mount(g.system, this.a.fleet?.owned?.spec ?? null);
    this.refreshStats();
  }

  // Atmospheric entry cinematic, then the real scene swap at its peak. Gas giants: dive instead.
  land(planet) {
    const { transition, sfx } = this.a;
    if (transition.busy) return;
    sfx.land();
    transition.play('enter', () => (planet.gas ? this.enterGas(planet) : this.arrive(planet, true)), hexCss(planet.palette.sky));
  }

  // flying = true: coming down from space, still in the ship high over the planet (like a gas dive).
  arrive(planet, flying = false) {
    const { spaceMode, surfaceMode, sfx, player, hud, quests, save } = this.a, g = this.game;
    g.planet = planet;
    g.flying = false;
    g.rideMode = null; // forces the surface hints (and the depth row) to be rebuilt
    spaceMode.exit();
    surfaceMode.enter(planet, g.system, g.design, save.galaxySeed);
    sfx.setAmbient(planet);
    player.suit.health = Math.max(player.suit.health, 1);
    hud.setSystem(g.system, g.planets, planet.index);
    if (flying) surfaceMode.arriveFlying();
    hud.toast(flying ? `Memasuki atmosfer ${planet.name} — E di dekat tanah untuk mendarat` : `Mendarat di ${planet.name}`);
    quests.arrived(planet);
    this.setMode('surface');
    this.persist();
  }

  enterGas(planet) {
    const { spaceMode, gas, hud } = this.a, g = this.game;
    g.planet = planet;
    spaceMode.exit();
    gas.mount(planet, g.system, g.design);
    gas.resize(innerWidth, innerHeight);
    hud.setTarget(null, false);
    hud.toast(`Masuk atmosfer ${planet.name} — hanya bisa dengan pesawat`);
    this.setMode('gas');
  }

  takeOff() {
    const { transition, sfx } = this.a;
    if (transition.busy) return;
    sfx.takeoff();
    transition.play('exit', () => this.depart(), hexCss(this.game.planet.palette.sky));
  }

  depart() {
    const { surfaceMode, gas, quests, sfx } = this.a, g = this.game;
    const planet = g.planet;
    g.planet = null;
    if (g.mode === 'gas') gas.unmount(); else surfaceMode.exit();
    this.enterSystem(g.system.index, planet.index);
    quests.departed();
    sfx.setAmbient(null);
    this.setMode('space');
    this.persist();
  }

  // F toggles the scan panel; a second press closes it.
  scan(planet) {
    const { hud, save, sfx, player, quests } = this.a;
    if (hud.scanOpen) { hud.hideScan(); return; }
    const isNew = recordDiscovery(save, planet);
    sfx.scan();
    if (isNew) { sfx.discover(); player.addItem('Nanit', 25); }
    quests.scanned(isNew);
    hud.showScan(planet, isNew);
    this.refreshStats();
  }

  resumeSpace() {
    this.a.input.justPressed.clear();
    this.setMode('space');
    this.a.input.lock();
  }

  openMap() {
    const { overlays, map, save } = this.a;
    overlays.open('map');
    map.open({ currentIndex: this.game.system.index, visited: save.visited,
      onWarp: (i) => this.warpTo(i), onClose: () => this.resumeSpace() });
  }

  // New ship from the hangar or the DIY shipyard.
  useShip(design) {
    const { space, surface, surfaceMode, overlays, hud } = this.a, g = this.game;
    g.design = design;
    space.setShip(design);
    if (g.mode === 'surface' || overlays.back === 'surface') { surface.setShip(design); surfaceMode.base.parkShip(); }
    if (g.mode === 'freighter' || overlays.back === 'freighter') this.a.freighterInterior.mount(design, 'Kapal Induk', this.freighterView());
    hud.toast(`Pesawat: ${design.name}`);
    this.persist();
  }

  warpTo(index) {
    const { player, hud, warpFx, sfx } = this.a;
    if (!player.useEnergy(WARP_COST * shipMod('shipEnergy', 'warp', player))) {
      hud.toast(`Energi kurang (${WARP_COST} untuk warp)`);
      this.resumeSpace();
      return;
    }
    if (warpFx.busy) return;
    this.setMode('warp'); // world idles behind the tunnel; no input
    sfx.warp();
    warpFx.play(() => this.jumpTo(index, false), () => { hud.toast(`Tiba di ${this.game.system.name}`); this.resumeSpace(); });
  }

  // Instant system change (the tunnel's midpoint; tests call it directly).
  jumpTo(index, resume = true) {
    this.enterSystem(index);
    this.a.quests.warped();
    this.persist();
    if (resume) this.resumeSpace();
  }

  // Flying into the capital ship's hangar: dock and walk around inside.
  dock() {
    const { transition, sfx } = this.a;
    if (transition.busy) return;
    sfx.land();
    transition.play('enter', () => this.boardFreighter(), '#9fe4ff');
  }

  boardFreighter() {
    const { spaceMode, freighterInterior, hud } = this.a, g = this.game;
    spaceMode.exit();
    freighterInterior.mount(g.design, 'Kapal Induk', this.freighterView());
    freighterInterior.resize(innerWidth, innerHeight);
    g.feed = null;
    hud.setTarget(null, false);
    hud.toast('Selamat datang di Kapal Induk');
    this.setMode('freighter');
  }

  // The real planets nearest to the capital ship, for its windows.
  freighterView() {
    const { freighter, space } = this.a, at = freighter.dock?.position;
    const near = at ? [...space.bodies].sort((p, q) => p.pos.distanceTo(at) - q.pos.distanceTo(at)).map((b) => b.planet) : [];
    return { near, starColor: this.game.system.star.color, style: interiorStyleOf(freighter) };
  }

  leaveFreighter() {
    const { transition, sfx } = this.a;
    if (transition.busy) return;
    sfx.takeoff();
    transition.play('exit', () => this.undock(), '#9fe4ff');
  }

  undock() {
    const { freighterInterior, freighter, space } = this.a, g = this.game;
    freighterInterior.dispose();
    this.enterSystem(g.system.index);
    freighter.launch(space.shipObject, space.velocity);
    space.rig.snap();
    this.setMode('space');
    this.persist();
  }

  start() {
    const { sfx, hud, input, save } = this.a;
    sfx.unlock();
    sfx.setAmbient(null);
    hud.showTitle(false);
    this.setMode('space');
    input.lock();
    runTutorial(save, hud, writeSave);
  }
}
