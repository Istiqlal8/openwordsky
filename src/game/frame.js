// Per-frame updates for each play mode (space, surface, gas dive) plus shared ticking.
import { spaceFeed, surfaceFeed } from './hud-feed.js';
import { FLIGHT_HINTS, SUB_HINTS, SUMMON_KEY, SURFACE_HINTS } from './surface-mode.js';
import { rechargeShip } from './ship-recharge.js';

export class FrameLoop {
  constructor(app, flow) {
    this.a = app;
    this.flow = flow;
  }

  get game() { return this.a.game; }

  // Toast a message once each time it changes (per channel).
  announce(channel, text) {
    const g = this.game;
    if (text && text !== g.said?.[channel]) this.a.hud.toast(text);
    (g.said ??= {})[channel] = text;
  }

  space(dt) {
    const { spaceMode, space, hud, vitals, player, input } = this.a;
    const s = spaceMode.update(dt, input);
    const { freighter } = this.a, pos = space.shipObject.position;
    freighter.update(dt);
    freighter.collide(pos, space.velocity);
    if (!player.dead && freighter.docking(pos)) this.flow.dock();
    hud.setTarget(s.target ?? s.looked, Boolean(s.target));
    hud.setSpeed(space.speed);
    vitals.update(player, { hostiles: s.hostiles, lock: s.lock, boostAllowed: s.boostAllowed });
    const home = freighter.dock ? [{ id: 'kapal-induk', name: freighter.nearest(pos)?.name ?? 'Kapal Induk', position: freighter.dock.position }] : [];
    this.game.feed = spaceFeed(space, spaceMode.combat, s.target, [...home, ...spaceMode.alienShips.list(), ...spaceMode.traffic.list()]);
    this.announce('hail', s.npcShip ? `Kapal lewat: ${s.npcShip.name} · ${s.npcShip.captain}` : null);
    if (!player.dead) this.spaceKeys(s);
  }

  spaceKeys(s) {
    const { input, overlays, hud, sfx, player } = this.a, f = this.flow, design = this.game.design;
    const shift = input.down('ShiftRight') || input.down('ShiftLeft');
    if (shift && input.pressed('KeyH')) return overlays.openFleet('shop');
    if (shift && input.pressed('KeyB')) return overlays.openFleet('yard');
    if (s.landOn) f.land(s.landOn);
    else if (input.pressed('KeyE') && s.target) f.land(s.target.planet);
    else if (input.pressed('KeyF') && (s.looked || s.target)) f.scan((s.looked ?? s.target).planet);
    else if (input.pressed('KeyM')) f.openMap();
    else if (input.pressed('KeyH')) overlays.hangar(design);
    else if (input.pressed('KeyB')) overlays.openShipyard(design);
    else if (input.pressed('KeyG')) { hud.toast(rechargeShip(player)); sfx.pickup(); }
  }

  surface(dt) {
    const { surfaceMode, surface, hud, vitals, player, overlays } = this.a, g = this.game;
    const s = surfaceMode.update(dt, this.a.input);
    hud.setSurface(g.planet, { creature: s.creature });
    vitals.update(player, { wanted: s.wanted, storm: s.storm, beam: s.beam });
    g.feed = surfaceFeed(surface, surfaceMode.wildlife, surfaceMode.gameplay,
      [...surfaceMode.visitors.list(), ...surfaceMode.aliens.list()], surfaceMode.places());
    if (s.action === 'market') overlays.openMarket(surfaceMode.pendingShop);
    else if (s.action) overlays.baseAction(s.action, g.design);
    this.announce('door', s.home ? `[T] ${s.home.label}` : null);
    this.announce('line', s.visitor?.line ? `${s.visitor.name}: ${s.visitor.line}` : null);
    this.announce('trade', s.trade?.line ? `${s.trade.label}: ${s.trade.line}` : null);
    this.announce('villager', s.villager?.line ? `${s.villager.label}: ${s.villager.line}` : null);
    this.announce('alien', s.alien?.line ? `${s.alien.name}: ${s.alien.line}${s.alien.vendor ? ' (T: dagang)' : ''}` : null);
    this.announce('sub', s.subPrompt ?? null);
    if (s.sonar) hud.toast(s.sonar.text);
    this.surfaceHints(s);
    if (!player.dead) this.surfaceKeys(s);
  }

  // Hints per ride, with a live depth row while the submarine or the ship is under water.
  surfaceHints(s) {
    const { hud } = this.a, g = this.game;
    const mode = s.sub ? 'sub' : s.flying ? 'fly' : 'foot';
    const depth = s.depth > 0.5 ? Math.round(s.depth) : 0;
    if (mode === g.rideMode && depth === g.shownDepth) return;
    g.rideMode = mode;
    g.shownDepth = depth;
    g.flying = s.flying;
    const base = mode === 'sub' ? SUB_HINTS : mode === 'fly' ? FLIGHT_HINTS : SURFACE_HINTS;
    hud.setHints(depth ? [...base, ['Kedalaman', `${depth} m`]] : base);
  }

  surfaceKeys(s) {
    const { input, surfaceMode, hud, quests } = this.a, f = this.flow;
    if (s.leave) f.takeOff();
    else if (input.pressed(SUMMON_KEY) && !quests.panel?.isOpen) surfaceMode.summonSub();
    else if (input.pressed('KeyE')) surfaceMode.door(s);
    else if (input.pressed('KeyF') && !s.sub) { // in the submarine F is the headlights
      f.scan(this.game.planet);
      if (s.creature) hud.toast(`Fauna: ${s.creature.name}`);
      quests.sawCreature(s.creature);
    }
  }

  gas(dt) {
    const { gas, hud, vitals, player, sfx, input } = this.a;
    const s = gas.update(dt, player.dead ? IDLE : input);
    hud.setSpeed(s.speed);
    vitals.update(player, {});
    sfx.setEngine(Math.min(1, s.speed / 240));
    sfx.alarm(s.depth > 0.83);
    this.announce('gas', s.warning);
    if (!player.dead && s.leave) this.flow.takeOff();
    else if (!player.dead && input.pressed('KeyF')) {
      const c = gas.nearestCreature?.();
      this.a.hud.toast(c ? `Terpindai: ${c.name} · ${c.distance} m` : 'Tidak ada makhluk di dekat');
      this.a.sfx.scan();
    }
  }

  freighter(dt) {
    const { freighterInterior, vitals, player, overlays, input } = this.a;
    const s = freighterInterior.update(dt, input);
    vitals.update(player, {});
    this.announce('freighter', s.prompt);
    if (s.exit) this.flow.leaveFreighter();
    else if (s.action && s.action !== 'map') overlays.baseAction(s.action, this.game.design);
  }

  // Inventory/minimap keys, quests and autosave.
  tick(dt) {
    const { input, inventory, minimap, player, quests } = this.a, g = this.game;
    if (input.pressed('Comma')) this.a.overlays.openCreator();
    if (input.pressed('Tab') || input.pressed('KeyI')) {
      inventory.toggle();
      if (inventory.isOpen) input.unlock(); else input.lock(); // free the mouse to click items
    }
    if (input.pressed('KeyN')) minimap.toggleZoom();
    inventory.update(player);
    quests.update(input);
    g.saveTimer += dt;
    if (g.saveTimer > 10) { g.saveTimer = 0; this.flow.persist(); }
  }

  view() {
    const { surface, gas, space } = this.a, mode = this.game.mode;
    if (mode === 'freighter') return this.a.freighterInterior;
    return mode === 'surface' ? surface : mode === 'gas' ? gas : space;
  }

  frame(dt) {
    const { input, death, hud, sfx, renderer, minimap, markers, spaceMode } = this.a, g = this.game;
    const playing = this.flow.isPlaying();
    const paused = playing && !input.locked && !death.isOpen && !this.a.inventory.isOpen;
    if (paused !== g.paused) { g.paused = paused; hud.showPaused(paused); if (paused) sfx.silenceLoops(); }
    // Paused = the whole world freezes (no enemy fire, no drain); only rendering continues.
    if (!paused && playing) this[g.mode](dt);
    else if (!paused) spaceMode.idle(dt);
    if (playing && !paused) this.tick(dt);
    const view = this.view();
    view.render(renderer);
    if (playing && g.feed && g.mode !== 'gas' && g.mode !== 'freighter') { minimap.update(g.feed.map); markers.update(view.camera, g.feed.markers); }
    input.endFrame();
  }
}

const IDLE = { down: () => false, pressed: () => false, mouseDown: () => false, clicked: () => false,
  mouse: { dx: 0, dy: 0 }, locked: false };
