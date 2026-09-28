// Planet event: every plant around the player blooms at once, dropping glowing pollen.
import * as THREE from 'three';
import { GlowLoot, ringSpot } from '../gameplay/glow-loot.js';

const COUNT = 30;
const COLORS = [0xff9ad8, 0xffe07a, 0xb0ff8a, 0x9ad8ff, 0xffb27a];

export class Bloom {
  constructor(ctx) {
    this.ctx = ctx;
    this.id = 'mekar';
    this.duration = 60 + Math.random() * 30;
    this.title = 'Mekar serentak! Serbuk Mekar bertebaran';
    this.endText = 'Bunga-bunga menutup kembali';
    this.participated = false;
    this.loot = new GlowLoot(ctx, { geometry: new THREE.DodecahedronGeometry(0.26, 0), max: COUNT, glow: 0.7,
      onCollect: () => { this.participated = true; } });
    this.scatter();
  }

  scatter() {
    const f = this.ctx.surface.feet;
    for (let i = 0; i < COUNT * 2 && this.loot.count < COUNT; i++) {
      const p = ringSpot(f.x, f.z, 5, 45);
      const it = this.loot.add(p.x, p.z, 'Serbuk Mekar', COLORS[i % COLORS.length]);
      if (it && i % 3 === 0) this.ctx.fx?.sparks(new THREE.Vector3(it.x, it.y + 0.6, it.z), it.color, 5, 0.6);
    }
  }

  update(dt, alive) {
    this.loot.update(dt, alive);
    if (!this.loot.count) this.done = true; // all collected: end early
  }

  dispose() {
    this.loot.dispose();
  }
}
