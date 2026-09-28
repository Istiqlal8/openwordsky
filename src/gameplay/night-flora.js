// Flora that only exists at night (Bunga Bulan) or during a storm (Kristal Badai).
import * as THREE from 'three';
import { GlowLoot, ringSpot } from './glow-loot.js';

const TARGET = 8;          // items kept around the player while the condition holds
const SPAWN_EVERY = 3;     // seconds between spawns
const FAR = 90;            // items farther than this are dropped
const NIGHT = 0.6;         // nightFactor threshold

const KINDS = [
  { key: 'moon', item: 'Bunga Bulan', color: 0xc8ecff, notice: 'Bunga Bulan mekar di kegelapan',
    geo: () => new THREE.IcosahedronGeometry(0.28, 0) },
  { key: 'storm', item: 'Kristal Badai', color: 0x9a7dff, notice: 'Kristal Badai terbentuk',
    geo: () => new THREE.OctahedronGeometry(0.34, 0).scale(0.7, 1.5, 0.7) },
];

export class NightFlora {
  constructor(ctx) {
    this.ctx = ctx;
    this.force = { moon: false, storm: false }; // debug overrides
    this.kinds = KINDS.map((k) => ({ ...k, loot: new GlowLoot(ctx, { geometry: k.geo(), max: TARGET + 2 }),
      timer: 0, told: false }));
  }

  active(key) {
    if (this.force[key]) return true;
    if (key === 'moon') return (this.ctx.surface.sky?.nightFactor ?? 0) > NIGHT;
    return Boolean(this.ctx.gameplay?.storm);
  }

  update(dt, alive) {
    if (!this.ctx.surface.planet) return;
    for (const k of this.kinds) {
      if (this.active(k.key)) this.grow(k, dt);
      else { k.loot.clear(); k.told = false; }
      k.loot.update(dt, alive);
    }
  }

  grow(k, dt) {
    const f = this.ctx.surface.feet;
    k.loot.prune(FAR);
    k.timer -= dt;
    if (k.timer > 0 || k.loot.count >= TARGET) return;
    k.timer = SPAWN_EVERY;
    const p = ringSpot(f.x, f.z, 12, 55);
    if (!k.loot.add(p.x, p.z, k.item, k.color) || k.told) return;
    k.told = true;
    this.ctx.player.emit('notice', { text: k.notice });
  }

  dispose() {
    for (const k of this.kinds) k.loot.dispose();
    this.kinds = [];
  }
}
