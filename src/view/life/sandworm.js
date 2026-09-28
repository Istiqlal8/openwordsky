// Sandworm: a burrower on dry worlds. The model is a coiled arc, so instead of walking it breaches
// — rises out of the ground, holds the arc for a moment, then sinks back and surfaces somewhere new.
// It has no skeleton (the auto-rigger rejected the coiled pose), so the whole mesh is moved instead.
import * as THREE from 'three';
import { Rng } from '../../core/rng.js';
import { shiftHex } from '../../core/color.js';
import { word } from '../../gen/names.js';
import { readyModel, cloneModel, tintedMaterial } from './models/model-cache.js';

const BIOMES = ['desert', 'barren', 'volcanic', 'irradiated', 'toxic'];
const LENGTH = [26, 48]; // meters along the arc
const RISE = 2.6; // seconds out of the ground
const HOLD = 4;
const WAIT = [9, 22]; // seconds underground between breaches
const BREACH = 0.55; // fraction of the worm that clears the ground: the rest stays buried

export function hasSandworms(planet) {
  if (planet.gas || !BIOMES.includes(planet.biome.id)) return false;
  return new Rng(planet.seed ^ 0x5a4d).chance(0.4);
}

export class Sandworms {
  constructor(scene, planet, heightFn, origin) {
    this.scene = scene;
    this.heightFn = heightFn;
    this.origin = origin;
    this.rng = new Rng(planet.seed ^ 0x5a4e);
    this.list = [];
    this.mat = null;
    this.tint = shiftHex(planet.palette.rock, this.rng.range(-0.05, 0.05), 0.1, 0.05);
    this.name = `${word(this.rng)} Cacing Pasir`;
    if (!hasSandworms(planet)) return;
    for (let n = 1 + this.rng.int(2); n > 0; n--) this.spawn();
  }

  spawn() {
    const r = this.rng;
    const w = { root: new THREE.Group(), inst: null, length: r.range(...LENGTH),
      t: r.range(0, WAIT[1]), state: 'wait', wait: r.range(...WAIT), pos: new THREE.Vector3() };
    this.relocate(w, this.origin, 70, 200);
    w.root.visible = false;
    this.scene.add(w.root);
    this.list.push(w);
  }

  relocate(w, base, r0, r1) {
    const a = this.rng.range(0, Math.PI * 2), r = this.rng.range(r0, r1);
    w.pos.set(base.x + Math.cos(a) * r, 0, base.z + Math.sin(a) * r);
    w.root.position.copy(w.pos);
    w.root.rotation.y = this.rng.range(0, Math.PI * 2);
  }

  // Builds the mesh the first time the GLB is ready; until then the worm simply stays hidden.
  build(w) {
    if (w.inst) return true;
    const tpl = readyModel('sandworm');
    if (!tpl) return false;
    this.mat ??= tintedMaterial(tpl, this.tint, 0.45);
    w.inst = cloneModel(tpl, this.mat);
    w.inst.scene.scale.setScalar(w.length);
    w.root.add(w.inst.scene);
    return true;
  }

  // wait (buried) -> rise -> hold (fully out) -> sink -> wait, surfacing near the player each time.
  phase(w, dt, player) {
    w.t += dt;
    if (w.state === 'wait' && w.t >= w.wait) {
      if (!this.build(w)) return 0;
      this.relocate(w, player, 45, 130);
      w.state = 'rise';
      w.t = 0;
    }
    if (w.state === 'rise' && w.t >= RISE) { w.state = 'hold'; w.t = 0; }
    if (w.state === 'hold' && w.t >= HOLD) { w.state = 'sink'; w.t = 0; }
    if (w.state !== 'sink') return w.state === 'wait' ? 0 : Math.min(1, w.t / RISE);
    if (w.t < RISE) return 1 - w.t / RISE;
    w.state = 'wait';
    w.t = 0;
    w.wait = this.rng.range(...WAIT);
    return 0;
  }

  update(dt, player) {
    for (const w of this.list) {
      const out = this.phase(w, dt, player); // 0 = buried, 1 = fully breached
      w.root.visible = out > 0.01 && w.inst !== null;
      if (!w.root.visible) continue;
      const ground = this.heightFn(w.pos.x, w.pos.z);
      // Fully sunk at out=0; at out=1 only the raised head and front coil are above the sand.
      w.root.position.set(w.pos.x, ground - w.length * (1 - out * BREACH), w.pos.z);
      w.root.rotation.z = Math.sin(w.t * 1.2) * 0.04 * out;
    }
  }

  // The worm is scenery, not prey: it has no hit bodies and nothing to provoke.
  bodies() { return []; }

  nearest(pos, maxDist = 60) {
    for (const w of this.list) {
      const d = w.root.visible ? w.root.position.distanceTo(pos) : Infinity;
      if (d < maxDist) return { name: this.name, distance: d };
    }
    return null;
  }

  dispose() {
    for (const w of this.list) {
      this.scene.remove(w.root);
      w.inst?.meshes.forEach((m) => m.skeleton?.dispose());
    }
    this.mat?.dispose();
    this.list = [];
  }
}
