// Surface half of the raid system: finds the boss that sleeps on this planet, drops clues as the
// player walks toward it, summons the Titan when the sentinel alert maxes out, and pays out.
import * as THREE from 'three';
import { RAIDS, surfaceRaidOf, siteOf, trophyOf } from './raid-data.js';
import { isBeaten, markBeaten, markFound, activeContract } from './raid-store.js';
import { SurfaceBoss } from './surface-boss.js';
import { raidWorld } from './raid-world-link.js';

const MAX_WANTED = 5;
const CLUES = [
  { d: 220, text: () => 'Tanah retak dan berdebu — sesuatu yang sangat besar berdiri di dekat sini' },
  { d: 120, text: (n) => `Langkah berat menggema. ${n} terbangun!` },
];

export class SurfaceRaid {
  constructor(ctx, hooks = {}) {
    this.ctx = ctx;
    this.hooks = hooks;
    this.def = surfaceRaidOf(ctx.planet);
    if (this.def && isBeaten(this.def.id)) this.def = null;
    this.boss = null;
    this.clue = 0;
    this.summoned = false;
    raidWorld.raid = this;
  }

  get active() { return this.boss && !this.boss.dead ? this.boss : null; }

  update(dt, alive) {
    if (!this.boss && this.def && this.ctx.creatures) this.spawn(this.def, siteOf(this.ctx.planet, this.ctx.surface.spawn ?? { x: 0, z: 0 }));
    if (!this.boss) { this.watchWanted(); return; }
    if (!this.boss.dead) this.clues();
    this.shake(dt);
    if (!alive) this.boss.calm = Math.max(this.boss.calm, 3);
  }

  // A maxed sentinel alert calls down the Titan, wherever you are.
  watchWanted() {
    const gp = this.ctx.gameplay;
    if (this.summoned || isBeaten('titan-penjaga') || !gp || gp.wanted < MAX_WANTED || !this.ctx.creatures) return;
    this.summoned = true;
    const f = this.ctx.surface.feet, a = Math.random() * Math.PI * 2;
    this.spawn(RAIDS['titan-penjaga'], { x: f.x + Math.cos(a) * 70, z: f.z + Math.sin(a) * 70 });
    this.ctx.player.emit('notice', { text: 'Penjaga tingkat tertinggi dipanggil: TITAN PENJAGA' });
    this.clue = CLUES.length;
  }

  // Debug / contract shortcut.
  spawnHere(id) {
    const def = RAIDS[id];
    if (!def || def.kind !== 'surface' || !this.ctx.creatures) return false;
    this.drop();
    const f = this.ctx.surface.feet, a = Math.random() * Math.PI * 2;
    this.spawn(def, { x: f.x + Math.cos(a) * 60, z: f.z + Math.sin(a) * 60 });
    this.clue = CLUES.length;
    return true;
  }

  spawn(def, site) {
    this.def = def;
    this.boss = new SurfaceBoss(this.ctx, def, site, {
      onDamage: (n, ref, soaked) => this.hooks.onDamage?.(n, ref, soaked),
      onPhase: (i, label) => this.phase(i, label),
      onNotice: (text) => this.ctx.player.emit('notice', { text }),
      onDefeat: (pos) => this.defeated(pos),
    });
    this.ctx.creatures.groups.push(this.boss);
    this.hooks.onState?.();
  }

  phase(i, label) {
    this.ctx.player.emit('notice', { text: `${this.def.name} — fase ${i + 1}: ${label}` });
    this.ctx.sfx?.discover?.();
    this.hooks.onState?.();
  }

  clues() {
    const c = CLUES[this.clue];
    if (!c) return;
    const p = this.boss.pos, f = this.ctx.surface.feet;
    if (Math.hypot(p.x - f.x, p.z - f.z) > c.d) return;
    this.clue++;
    this.ctx.player.emit('notice', { text: c.text(this.def.name) });
    this.boss.roar();
    if (this.clue >= CLUES.length && markFound(this.def.id, this.ctx.planet.name)) this.hooks.onState?.();
  }

  // Heavy footfalls jolt the camera once the boss is close.
  shake(dt) {
    const b = this.boss;
    if (!b || b.dead) return;
    const p = b.pos, f = this.ctx.surface.feet;
    const d = Math.hypot(p.x - f.x, p.z - f.z);
    const k = d < 80 ? b.shake * (1 - d / 80) : 0;
    if (k <= 0.01) return;
    const cam = this.ctx.surface.camera.position, a = 0.4 * k;
    cam.x += (Math.random() - 0.5) * a;
    cam.y += (Math.random() - 0.5) * a;
    cam.z += (Math.random() - 0.5) * a;
  }

  defeated(pos) {
    const { ctx, def } = this, pl = ctx.player;
    for (let i = 0; i < 4; i++) {
      const p = pos.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(def.radius));
      ctx.fx?.explode(p, { color: def.glow, size: 2 + i, debris: true });
    }
    ctx.sfx?.explosion?.(1);
    const bonus = activeContract()?.id === def.id ? activeContract().reward : null;
    markBeaten(def.id, ctx.planet.name);
    pl.addItem('Nanit', def.reward.nanit);
    for (const [name, n] of def.reward.items) pl.addItem(name, n);
    pl.emit('notice', { text: `${def.name} tumbang! +${def.reward.nanit} Nanit · ${trophyOf(def)}` });
    pl.emit('act', { type: 'boss', id: def.id });
    this.hooks.onDefeat?.(def, bonus);
    this.hooks.onState?.();
  }

  status() {
    const b = this.active;
    if (!b) return null;
    const { now, max } = b.hp();
    const f = this.ctx.surface.feet;
    return { name: b.def.name, color: b.def.color, now, max, phases: b.def.phases,
      stage: b.stage + (b.enraged ? 1 : 0), label: b.enraged ? b.def.phases[b.def.phases.length - 1] : b.stageLabel,
      shielded: b.shielded, dist: Math.hypot(b.pos.x - f.x, b.pos.z - f.z), far: false,
      position: new THREE.Vector3(b.pos.x, f.y, b.pos.z) };
  }

  drop() {
    if (!this.boss) return;
    const groups = this.ctx.creatures?.groups;
    if (groups?.includes(this.boss)) groups.splice(groups.indexOf(this.boss), 1);
    this.boss.dispose();
    this.boss = null;
  }

  dispose() {
    this.drop();
    if (raidWorld.raid === this) raidWorld.raid = null;
  }
}
