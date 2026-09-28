// The surface half of the duel event: decides when a rival mobile suit drops out of orbit onto
// this planet, hands it to Wildlife as one more group, and reports the outcome. Mounted by the
// world addon (src/duel/duel-world.js) on every landing.
import * as THREE from 'three';
import { PHASES, RIVALS, rivalOf } from './duel-data.js';
import { RivalGround } from './rival-ground.js';
import { duelWorld } from './duel-link.js';

const FIRST = [80, 220];    // seconds after landing before a challenge may arrive
const AGAIN = [300, 480];   // quiet time after one ends
const PROVOKED = 10;        // standing in your own mech brings the next one forward
const DROP_AWAY = 95;       // metres from the player it comes down

const between = ([a, b]) => a + Math.random() * (b - a);

export class SurfaceDuel {
  // ctx: the SurfaceGameplay ctx; hooks: { onDamage, onState, onDefeat }
  constructor(ctx, hooks = {}) {
    this.ctx = ctx;
    this.hooks = hooks;
    this.rival = null;
    this.wait = between(FIRST);
    duelWorld.duel = this;
  }

  get active() { return this.rival && !this.rival.dead ? this.rival : null; }

  update(dt, alive) {
    if (this.rival) { this.tick(dt); return; }
    if (!alive || this.ctx.planet.gas || !this.ctx.creatures) return;
    this.wait -= dt;
    if (this.wait <= 0) this.spawn(rivalOf(this.ctx.planet.seed ?? 0, 0xd0e2));
  }

  tick(dt) {
    if (!this.rival.dead) return;
    if (this.rival.deadT > 9) this.drop();
  }

  provoke() {
    if (this.rival || this.wait <= PROVOKED) return;
    this.wait = PROVOKED;
  }

  spawn(def) {
    const f = this.ctx.surface.feet, a = Math.random() * Math.PI * 2;
    this.rival = new RivalGround(this.ctx, def, { x: f.x + Math.cos(a) * DROP_AWAY, z: f.z + Math.sin(a) * DROP_AWAY }, {
      onDamage: (n, soaked) => this.hooks.onDamage?.(n, soaked),
      onGuard: () => this.ctx.player.emit('notice', { text: `${def.name} menaikkan perisai` }),
      onDefeat: (pos) => this.defeated(def, pos),
    });
    this.ctx.creatures.groups.push(this.rival);
    this.ctx.player.emit('notice', { text: `Rangka asing turun dari orbit: ${def.name}` });
    this.ctx.sfx?.discover?.();
    this.hooks.onState?.();
  }

  // Debug / console shortcut.
  spawnHere(id) {
    if (!this.ctx.creatures) return false;
    this.drop();
    this.spawn(RIVALS[id] ?? rivalOf(Date.now() | 0));
    return true;
  }

  defeated(def, pos) {
    const pl = this.ctx.player;
    for (let i = 0; i < 3; i++) {
      const p = pos.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(this.rival.height * 0.4));
      this.ctx.fx?.explode(p, { color: def.glow, size: 1.6 + i });
    }
    this.wait = between(AGAIN);
    this.hooks.onDefeat?.(def, pos, 'surface');
  }

  drop() {
    if (!this.rival) return;
    const groups = this.ctx.creatures?.groups;
    if (groups?.includes(this.rival)) groups.splice(groups.indexOf(this.rival), 1);
    this.rival.dispose();
    this.rival = null;
    this.hooks.onState?.();
  }

  status() {
    const r = this.active;
    if (!r) return null;
    const { now, max } = r.hpBar();
    const f = this.ctx.surface.feet;
    return { name: r.def.name, color: r.def.color, now, max, phases: PHASES,
      stage: r.stage, label: PHASES[r.stage], shielded: r.shielded,
      dist: Math.hypot(r.pos.x - f.x, r.pos.z - f.z), far: false,
      position: new THREE.Vector3(r.pos.x, f.y, r.pos.z) };
  }

  dispose() {
    this.drop();
    if (duelWorld.duel === this) duelWorld.duel = null;
  }
}
