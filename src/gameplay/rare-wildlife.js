// Rare variants: ~5% of herd animals are bigger, golden-glowing and give special products.
// Q gather on them is handled in animal-gather.js (a.rare); hunting one drops 'Trofi Langka'.
import * as THREE from 'three';
import { rngOf } from '../core/rng.js';
import { glowTexture } from './glow-loot.js';

const CHANCE = 0.05;
const GROW = 1.35;
const SPOT = 40;      // "rare animal sighted" notice distance
const KILL_NEAR = 8;  // kill position must be this close to the rare animal
const TINT = 0xffc24a;
const _v = new THREE.Vector3();

export class RareWildlife {
  constructor(ctx) {
    this.ctx = ctx;
    this.herds = null;
    this.rares = [];
    this.mats = [];
    this.t = 0;
    this.sparkT = 0;
    this.tex = glowTexture();
    this.haloMat = new THREE.SpriteMaterial({ map: this.tex, color: TINT, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false });
  }

  update(dt) {
    const w = this.ctx.creatures;
    if (!w) return;
    if (!this.herds) this.setup(w);
    this.t += dt;
    this.haloMat.opacity = 0.55 + Math.sin(this.t * 3) * 0.25;
    this.rares = this.rares.filter((a) => this.herds.animals.includes(a));
    this.watch(dt);
  }

  setup(w) {
    this.herds = w.groups?.[0] ?? { animals: [] };
    const list = this.herds.animals ?? [], seed = this.ctx.planet.seed;
    list.forEach((a, i) => { if (rngOf(seed, i, 0x7a4e).next() < CHANCE) this.mark(a); });
    if (!this.rares.length && list.length >= 6) this.mark(list[rngOf(seed, 0x7a4f).int(list.length)]);
    const prev = w.onKill;
    w.onKill = (pos, name, sp) => { prev?.(pos, name, sp); this.killed(pos); };
  }

  mark(a) {
    if (a.rare) return;
    a.rare = true;
    a.root.scale.multiplyScalar(GROW);
    a.scale *= GROW;
    if (a.body) a.body.radius *= GROW;
    this.tint(a.root);
    const halo = new THREE.Sprite(this.haloMat), h = a.parts?.plan?.bodyY ?? 0.8;
    halo.position.y = h;
    halo.scale.setScalar(h * 2 + 2);
    halo.name = 'rare-halo';
    a.root.add(halo);
    a.halo = halo;
    this.rares.push(a);
  }

  // Templates share materials: clone this animal's lit materials and warm them up.
  tint(root) {
    const done = new Map();
    root.traverse((o) => {
      if (!o.isMesh || !o.material?.isMeshStandardMaterial) return;
      let m = done.get(o.material);
      if (!m) {
        m = o.material.clone();
        m.emissive = new THREE.Color(TINT);
        m.emissiveIntensity = 0.35;
        done.set(o.material, m);
        this.mats.push(m);
      }
      o.material = m;
    });
  }

  // Sighting notice + occasional sparkles on visible rare animals.
  watch(dt) {
    const f = this.ctx.surface.feet;
    this.sparkT -= dt;
    const spark = this.sparkT <= 0;
    if (spark) this.sparkT = 1.2;
    for (const a of this.rares) {
      const d = Math.hypot(a.pos.x - f.x, a.pos.z - f.z);
      if (!a.spotted && d < SPOT) {
        a.spotted = true;
        this.ctx.player.emit('notice', { text: `Hewan langka: ${a.sp?.name ?? 'Makhluk'} emas` });
      }
      if (spark && d < 70 && !a.dead) this.ctx.fx?.sparks(a.halo.getWorldPosition(_v), TINT, 4, 0.6);
    }
  }

  killed(pos) {
    const gone = this.rares.filter((a) => !this.herds.animals.includes(a));
    const a = gone.find((r) => Math.hypot(r.pos.x - pos.x, r.pos.z - pos.z) < KILL_NEAR * r.scale);
    if (!a) return;
    this.rares = this.rares.filter((r) => r !== a);
    this.ctx.player.addItem('Trofi Langka', 1);
    this.ctx.player.emit('act', { type: 'pickup', item: 'Trofi Langka', n: 1 });
    this.ctx.player.emit('notice', { text: 'Trofi Langka didapat' });
  }

  dispose() {
    for (const a of this.rares) a.halo?.removeFromParent();
    this.mats.forEach((m) => m.dispose());
    this.haloMat.dispose();
    this.tex.dispose();
    this.rares = [];
    this.mats = [];
  }
}
