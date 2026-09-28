// Runs the space side of a raid: decides whether this star system holds a boss, places it,
// steps it every frame and pays out when it dies. Reaches the live SpaceView/SpaceCombat
// through raid-link.js, so src/combat/ and src/game/ stay untouched.
import * as THREE from 'three';
import { RAIDS, spaceRaidOf, trophyOf } from './raid-data.js';
import { isBeaten, markBeaten, markFound, activeContract, raidState } from './raid-store.js';
import { resolveSpace } from './raid-link.js';
import { SpaceBoss } from './space-boss.js';

const tmp = new THREE.Vector3();

export class SpaceRaid {
  // w: the QuestWiring (player, hud, sfx, log, save); hooks: { onDamage, onState, onNotice }
  constructor(w, hooks) {
    this.w = w;
    this.hooks = hooks;
    this.boss = null;
    this.systemIndex = null;
    this.announced = null;
  }

  get active() { return this.boss && !this.boss.dead ? this.boss : null; }

  // Called every space frame. Spawns the resident boss the first time its system is entered.
  update(dt) {
    const env = resolveSpace();
    // No live system (surface, gas dive, freighter): let go, and re-check on the way back.
    if (!env) { this.drop(); this.systemIndex = null; return; }
    const index = env.combat.system.index;
    if (index !== this.systemIndex) { this.drop(); this.systemIndex = index; this.consider(env, index); }
    if (!this.boss) return;
    this.boss.update(dt);
    if (this.boss.dead && this.boss.deadT > 3.4) this.drop();
  }

  consider(env, index) {
    const def = spaceRaidOf(this.w.save.galaxySeed, index);
    if (!def || isBeaten(def.id)) return;
    this.spawn(def, env, this.lairPoint(env, def));
    if (markFound(def.id, env.combat.system.name)) this.hooks.onState?.();
    this.w.hud.toast(`Sinyal raksasa di sistem ini: ${def.name}`);
    this.w.sfx.discover?.();
  }

  // A fixed perch beside one of the system's planets.
  lairPoint(env, def) {
    const bodies = env.space.bodies ?? [];
    const b = bodies[Math.min(bodies.length - 1, 1 + (def.id.length % 3))];
    if (!b) return tmp.set(0, 0, -2400).clone();
    return tmp.copy(b.pos).add(new THREE.Vector3(b.radius * 3 + def.radius * 2, def.radius * 1.5, 0)).clone();
  }

  // Debug / contract shortcut: drop the boss right in front of the ship.
  spawnHere(id) {
    const env = resolveSpace();
    const def = RAIDS[id];
    if (!env || !def || def.kind !== 'space') return false;
    this.drop();
    this.systemIndex = env.combat.system.index;
    const ship = env.space.shipObject;
    tmp.set(0, 0, -1).applyQuaternion(ship.quaternion).multiplyScalar(def.radius * 5).add(ship.position);
    this.spawn(def, env, tmp.clone());
    return true;
  }

  spawn(def, env, at) {
    const { player, sfx } = this.w;
    this.boss = new SpaceBoss(def, { space: env.space, combat: env.combat, player, sfx }, at, {
      onDamage: (n, pos, core) => this.hooks.onDamage?.(n, pos, core),
      onPhase: (i, label) => this.phase(def, i, label),
      onNotice: (text) => player.emit('notice', { text }),
      onDefeat: (pos) => this.defeated(def, env, pos),
    });
    this.hooks.onState?.();
  }

  phase(def, i, label) {
    this.w.player.emit('notice', { text: `${def.name} — fase ${i + 1}: ${label}` });
    this.w.sfx.discover?.();
    this.hooks.onState?.();
  }

  defeated(def, env, pos) {
    const { player, log, hud, sfx } = this.w;
    env.combat.fx.explode(pos, { color: def.glow, size: 6 });
    env.space.shake?.(1.6);
    sfx.explosion?.(1);
    const bonus = activeContract()?.id === def.id ? activeContract().reward : null;
    markBeaten(def.id, env.combat.system.name);
    log.award({ title: `Raid: ${def.name}`, reward: { nanit: def.reward.nanit, xp: def.reward.xp, items: def.reward.items } });
    if (bonus) log.award({ title: `Kontrak raid: ${def.name}`, reward: bonus });
    hud.toast(`${def.name} hancur! +${def.reward.nanit} Nanit · ${trophyOf(def)}`);
    player.emit('act', { type: 'boss', id: def.id });
    this.hooks.onState?.();
  }

  drop() {
    this.boss?.dispose();
    this.boss = null;
  }

  status() {
    const b = this.active;
    if (!b) return null;
    const { now, max } = b.hp();
    return { name: b.def.name, color: b.def.color, now, max, phases: b.def.phases,
      stage: b.stage + (b.enraged ? 1 : 0), label: b.enraged ? b.def.phases[b.def.phases.length - 1] : b.stageLabel,
      position: b.position, dist: b.shipDist, far: b.shipDist > 1400 };
  }

  dispose() {
    this.drop();
    this.systemIndex = null;
  }
}

export const raidKills = () => raidState().kills;
