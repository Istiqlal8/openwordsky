// Meta addon (src/game/addons.js): the duel event board. Owns the rival's health bar and the
// damage numbers, drives the space duel, and pays out for both halves — the surface duel runs in
// the world addon (src/duel/duel-world.js) and reports back through duelWorld.
import { RaidHud } from '../ui/raid-hud.js';
import { duelWorld } from './duel-link.js';
import { SpaceDuel } from './space-duel.js';
import { RIVAL_IDS, badgeOf } from './duel-data.js';
import { noteWin, nemesisOf, clearGrudge } from './nemesis.js';

const BAR_TOP = '120px';   // below the raid bar: the two can be up at once

export class DuelMeta {
  constructor(w) {
    this.w = w;
    this.state = (w.log.s.duel ??= { wins: {} });
    this.hud = new RaidHud(w.panel.tracker.parentNode);
    this.hud.box.style.top = BAR_TOP;
    this.space = new SpaceDuel(w, {
      onDamage: (n, soaked) => this.hud.damage(n, soaked),
      onState: () => this.changed(),
      onDefeat: (def, pos, where) => this.won(def, where),
    });
    duelWorld.onDamage = (n, soaked) => this.hud.damage(n, soaked);
    duelWorld.onState = () => this.changed();
    duelWorld.onDefeat = (def, pos, where) => this.won(def, where);
    w.player.on('act', (a) => { if (a?.type === 'mech') this.provoke(); });
    this.syncNemesis();
    this.last = performance.now();
    this.expose();
  }

  changed() { this.w.log.version++; }

  status() {
    return duelWorld.duel?.status() ?? this.space.status();
  }

  update() {
    const now = performance.now(), dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    // On a planet the space duel is let go entirely: its SpaceCombat is gone by then, and the
    // surface duel owns the bar. Landing next to a rival is the way out of a losing fight.
    if (this.w.planet) this.space.dispose();
    else this.space.update(dt);
    this.hud.set(this.status());
    this.hud.update(dt);
  }

  // Transforming is a challenge: whichever half is live brings its next rival forward.
  provoke() {
    if (this.w.planet) duelWorld.duel?.provoke();
    else this.space.provoke();
  }

  won(def, where) {
    const { log, hud, player, sfx } = this.w;
    this.state.wins[def.id] = (this.state.wins[def.id] ?? 0) + 1;
    log.record('duel', { id: def.id, where });
    log.award({ title: `Duel: ${def.name}`, reward: def.reward });
    hud.toast(`${def.name} jatuh! +${def.reward.nanit} Nanit · ${badgeOf(def)}`);
    player.emit('notice', { text: `${def.name} hancur — duel selesai.` });
    player.emit('act', { type: 'duel', id: def.id });
    sfx.discover?.();
    this.grudge(def, player);
    this.changed();
  }

  // The wreck is still transmitting: it will rebuild and come looking. Said once, never explained.
  grudge(def, player) {
    const again = noteWin(this.state, def);
    this.syncNemesis();
    if (again) player.emit('notice', { text: 'Rangkanya masih memancarkan sinyal saat jatuh.' });
  }

  // Republish the hunting rival only when the grudge actually changes: scarring allocates.
  syncNemesis() {
    const g = this.state.grudge;
    const key = g ? `${g.id}:${g.level}` : '';
    if (key === this.nemKey) return;
    this.nemKey = key;
    duelWorld.nemesis = nemesisOf(this.state);
  }

  departed() { this.hud.set(null); }

  // Debug hooks for the console and headless runs.
  expose() {
    globalThis.__duel = {
      ids: RIVAL_IDS,
      spawn: (id) => (this.w.planet ? duelWorld.duel?.spawnHere(id) ?? false : this.space.spawnHere(id)),
      rival: () => duelWorld.duel?.active ?? this.space.active,
      status: () => this.status(),
      now: () => this.provoke(),
      wins: () => this.state.wins,
      grudge: () => this.state.grudge ?? null,
      nemesis: () => duelWorld.nemesis,
      hunt: (id, level = 1) => { this.state.grudge = { id, level }; this.nemKey = null; this.syncNemesis(); return duelWorld.nemesis; },
      forgive: () => { clearGrudge(this.state); this.nemKey = null; this.syncNemesis(); },
    };
  }
}
