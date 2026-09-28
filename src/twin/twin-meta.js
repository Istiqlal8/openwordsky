// Meta addon (src/game/addons.js): KAPAL KEMBARANMU.
//
// Rarely, the wreck drifting between two orbits is the player's own ship — same hull, same name,
// same paint, burnt out. Its flight log describes a voyage they never made. No combat, no boss;
// the feature is one object and one piece of text.
//
// It reaches the live star system through resolveSpace() (src/raid/raid-link.js), the sanctioned
// seam for addons that need the SpaceView, so nothing in src/game/ or src/view/ has to change.
import { rngOf } from '../core/rng.js';
import { resolveSpace } from '../raid/raid-link.js';
import { shipDesign } from '../view/ship/ship-design.js';
import { twinLog } from './twin-lore.js';
import { TwinPanel } from './twin-panel.js';
import { TwinWreck, READ_RANGE } from './twin-wreck.js';

const SPAWN_SALT = 0x7417;
const CHANCE = 0.06; // ~1 system in 16; the derelict hulk sits at 0.3, this is meant to be rarer
const NOTICE_RANGE = 260; // the transponder resolves into a name at about this distance

// Their ship, exactly as they fly it right now — including a custom shipyard build.
function ownDesign(w) {
  return w.app?.game?.design ?? shipDesign((w.save?.shipSeed ?? 1) >>> 0);
}

// Deterministic per (galaxy, system): the same save always finds it in the same places.
function twinRng(w, index) {
  return rngOf(w.save?.galaxySeed ?? 0, index | 0, SPAWN_SALT);
}

export class TwinMeta {
  constructor(w) {
    this.w = w;
    this.s = (w.log.s.twin ??= {});
    this.s.read ??= []; // system indices whose log has been claimed
    this.panel = new TwinPanel(w.panel.tracker.parentNode);
    this.wreck = null;
    this.index = null;
    this.entries = null;
    this.reward = null;
    this.near = false;
    this.noticed = false;
    this.last = performance.now();
    this.expose();
  }

  update(input) {
    const now = performance.now(), dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    if (this.w.planet) { this.panel.close(); return; } // the wreck only exists in space
    const live = resolveSpace();
    if (!live) return;
    this.sync(live.space);
    if (!this.wreck) return;
    const shipPos = live.space.shipObject.position;
    this.wreck.update(dt);
    this.proximity(shipPos);
    this.keys(input, shipPos);
  }

  // Mount on arrival in a new system, tear down when the player warps away.
  sync(space) {
    const index = space.system?.index ?? null;
    if (index === this.index) return;
    this.forget();
    this.index = index;
    if (index == null || !space.bodies.length) return;
    this.spawn(space, index);
  }

  forget() {
    this.wreck?.dispose();
    this.wreck = null;
    this.entries = null;
    this.reward = null;
    this.near = false;
    this.noticed = false;
    this.panel.close();
  }

  // The roll itself. A system whose log was already read keeps its wreck, but stops announcing
  // itself: the transponder is dark and no notice fires, so it is never re-offered.
  spawn(space, index, force = false) {
    const rng = twinRng(this.w, index);
    if (!force && !rng.chance(CHANCE)) return false;
    const design = ownDesign(this.w);
    this.wreck = new TwinWreck(space, design, rng);
    this.entries = twinLog(design.seed ?? 0, index);
    if (this.s.read.includes(index)) { this.wreck.quiet(); this.noticed = true; }
    return true;
  }

  // One notice when the transponder resolves, then the prompt once boarding range is reached.
  proximity(shipPos) {
    const d = this.wreck.distance(shipPos);
    if (d < NOTICE_RANGE && !this.noticed) {
      this.noticed = true;
      this.w.hud.toast(`Transponder terbaca: ${this.wreck.name}`);
    }
    const near = d < READ_RANGE;
    if (near && !this.near) this.w.hud.toast('Tekan P untuk membaca log penerbangannya');
    if (!near && this.near) this.panel.close();
    this.near = near;
  }

  keys(input, shipPos) {
    if (!input.pressed('KeyP')) return;
    if (this.panel.isOpen) { this.panel.close(); return; }
    if (this.wreck.distance(shipPos) >= READ_RANGE) return;
    this.read();
  }

  // Reading it is claiming it: the salvage is booked once, then the log stays readable.
  read() {
    if (!this.s.read.includes(this.index)) {
      this.s.read.push(this.index);
      this.reward = this.payout();
      this.wreck.quiet();
      this.w.log.version++;
      this.w.sfx?.discover?.();
    }
    this.panel.open(this.wreck.name, this.entries, this.reward);
  }

  // Same range the derelict hulk pays out in, minus the ore: a keepsake, not a haul.
  payout() {
    const rng = twinRng(this.w, this.index + 0x51);
    const parts = [['Nanit', 90 + rng.int(91)], ['Artefak Kuno', 1]];
    if (rng.chance(0.4)) parts.push(['Kristal Alien', 1]);
    for (const [name, n] of parts) this.w.player.addItem(name, n);
    return parts.map(([name, n]) => `+${n} ${name}`).join(' · ');
  }

  departed() { this.noticed = false; }

  // Debug hooks for the console and headless runs.
  expose() {
    globalThis.__twin = {
      spawn: () => this.forceSpawn(),
      found: () => Boolean(this.wreck),
      read: () => Boolean(this.wreck) && (this.read(), true),
      log: () => this.entries,
      wreck: () => this.wreck,
      state: () => this.s,
    };
  }

  // Force the wreck into the current system and park it just ahead of the ship.
  forceSpawn() {
    const live = resolveSpace();
    if (!live || this.w.planet) return false;
    this.forget();
    this.index = live.space.system?.index ?? 0;
    if (!this.spawn(live.space, this.index, true)) return false;
    this.wreck.moveTo(live.space.shipObject.position.clone().addScaledVector(live.space.forward, READ_RANGE * 0.6));
    return true;
  }
}
