// The space half of the duel event: decides when a rival mobile suit intercepts the player in a
// star system, places it, and reports the outcome. It reaches the live SpaceView/SpaceCombat
// through src/raid/raid-link.js, so nothing in src/combat/ or src/game/ has to change.
import * as THREE from 'three';
import { resolveSpace } from '../raid/raid-link.js';
import { PHASES, RIVALS, rivalOf } from './duel-data.js';
import { RivalSpace } from './rival-space.js';

const FIRST = [70, 190];    // seconds in a system before the first challenge
const AGAIN = [240, 420];   // quiet time after a duel ends
const PROVOKED = 12;        // transforming into a mech brings the next one forward
const RANGE = 520;          // how far out it drops in
const _at = new THREE.Vector3();
const _dir = new THREE.Vector3();

const between = ([a, b]) => a + Math.random() * (b - a);

export class SpaceDuel {
  // w: the QuestWiring (player, hud, sfx, log, save); hooks: { onDamage, onState, onDefeat }
  constructor(w, hooks = {}) {
    this.w = w;
    this.hooks = hooks;
    this.rival = null;
    this.systemIndex = null;
    this.wait = between(FIRST);
  }

  get active() { return this.rival && !this.rival.dead ? this.rival : null; }

  update(dt) {
    const env = resolveSpace();
    // No live system (surface, gas dive, freighter): let go and re-arm on the way back.
    if (!env) { this.drop(); this.systemIndex = null; return; }
    const index = env.combat.system.index;
    if (index !== this.systemIndex) { this.drop(); this.systemIndex = index; this.wait = between(FIRST); }
    if (this.rival) { this.tick(dt); return; }
    this.wait -= dt;
    if (this.wait <= 0 && !this.w.player.dead) this.spawn(env, rivalOf(this.w.save.galaxySeed, index, 0xd0e1));
  }

  tick(dt) {
    if (!this.rival.dead) return;
    if (this.rival.tickDeath(dt)) this.drop();
  }

  // The player standing in their own mech is an invitation: a rival already out there drops its
  // restraint, and the next challenge comes forward.
  provoke() {
    if (this.rival) { this.rival.ai.engage(); return; }
    if (this.wait <= PROVOKED) return;
    this.wait = PROVOKED;
  }

  spawn(env, def) {
    const ship = env.space.shipObject;
    _dir.randomDirection();
    _at.copy(ship.position).addScaledVector(_dir, RANGE);
    this.rival = new RivalSpace(def, { ...env, player: this.w.player, sfx: this.w.sfx }, _at, {
      onDamage: (n, soaked) => this.hooks.onDamage?.(n, soaked),
      onGuard: () => this.w.player.emit('notice', { text: `${def.name} menaikkan perisai` }),
      onDefeat: (pos) => this.defeated(def, env, pos),
    });
    env.combat.pirates.push(this.rival);
    this.w.player.emit('notice', { text: def.hail });
    this.w.hud.toast(`Duel mobile suit: ${def.name} · tekan . untuk berubah`);
    this.w.sfx.alarm?.(true);
    this.hooks.onState?.();
  }

  // Debug / console shortcut: drop a named rival right in front of the ship.
  spawnHere(id) {
    const env = resolveSpace();
    const def = RIVALS[id] ?? rivalOf(Date.now() | 0);
    if (!env) return false;
    this.drop();
    this.systemIndex = env.combat.system.index;
    this.spawn(env, def);
    return true;
  }

  defeated(def, env, pos) {
    env.space.shake?.(1.2);
    this.w.sfx.alarm?.(false);
    this.wait = between(AGAIN);
    this.hooks.onDefeat?.(def, pos, 'space');
  }

  drop() {
    if (!this.rival) return;
    const list = this.rival.env.combat?.pirates;
    const i = list ? list.indexOf(this.rival) : -1;
    if (i >= 0) list.splice(i, 1);
    this.rival.dispose();
    this.rival = null;
    this.w.sfx.alarm?.(false);
    this.hooks.onState?.();
  }

  status() {
    const r = this.active;
    if (!r) return null;
    const { now, max } = r.hpBar();
    const dist = r.pos.distanceTo(resolveSpace()?.space.shipObject.position ?? r.pos);
    return { name: r.def.name, color: r.def.color, now, max, phases: PHASES,
      stage: r.stage, label: PHASES[r.stage], shielded: r.shielded,
      position: r.pos, dist, far: dist > 900 };
  }

  dispose() {
    this.drop();
    this.systemIndex = null;
  }
}
