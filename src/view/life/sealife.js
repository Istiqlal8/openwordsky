// Sea life under the water plane: fish schools, glowing jellyfish, and whales (rigged GLB model,
// with a procedural stand-in until it has loaded).
import * as THREE from 'three';
import { Rng } from '../../core/rng.js';
import { hsl, shiftHex } from '../../core/color.js';
import { word } from '../../gen/names.js';
import { readyModel, cloneModel, tintedMaterial } from './models/model-cache.js';
import { BoneAnimator } from './models/bone-animator.js';

const FISH_PER_SCHOOL = 12;
const WHALE_LENGTH = [11, 15]; // meters, nose to fluke
const dummy = new THREE.Object3D();

function fishGeometry() {
  const geo = new THREE.ConeGeometry(0.25, 1, 6);
  geo.rotateZ(-Math.PI / 2);
  return geo;
}

function buildJelly(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 2.4, 4), mat);
    t.position.set(Math.cos(a) * 0.6, -1.2, Math.sin(a) * 0.6);
    g.add(t);
  }
  return { group: g, mats: [mat] };
}

function buildWhale(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.7 });
  const belly = new THREE.MeshStandardMaterial({ color: shiftHex(color, 0, -0.2, 0.25), flatShading: true });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mat);
  body.scale.set(8, 2.4, 2.8);
  const under = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), belly);
  under.scale.set(6.5, 1.6, 2.2);
  under.position.y = -0.9;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 5), mat);
  tail.position.x = -8.5;
  const fins = new THREE.Mesh(new THREE.BoxGeometry(2, 0.15, 7.5), mat);
  fins.position.set(2, -1, 0);
  g.add(body, under, tail, fins);
  return { group: g, mats: [mat, belly], tail };
}

export class SeaLife {
  constructor(scene, planet, heightFn) {
    this.scene = scene;
    this.heightFn = heightFn;
    this.waterY = planet.terrain.waterY;
    this.rng = new Rng(planet.seed ^ 0x5ea);
    this.items = [];
    this.disposables = [];
    this.name = `${word(this.rng)} ${{ fish: 'Ikan', jelly: 'Ubur', whale: 'Leviatan' }[planet.sea.kind]}`;
    const color = hsl(this.rng.next(), 0.6, 0.55);
    const { count, kind } = planet.sea;
    this.addSchools(Math.max(1, Math.ceil(count / (kind === 'fish' ? 2 : 4))), color);
    if (kind === 'jelly') for (let i = 0; i < count; i++) this.addJelly(hsl(this.rng.next(), 0.8, 0.6));
    if (kind === 'whale') for (let i = 0; i < 1 + (count > 6 ? 1 : 0); i++) this.addWhale(shiftHex(color, 0.5, -0.2, -0.15));
  }

  addSchools(n, color) {
    const geo = fishGeometry();
    const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, metalness: 0.3, roughness: 0.4 });
    this.disposables.push(geo, mat);
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.InstancedMesh(geo, mat, FISH_PER_SCHOOL);
      mesh.frustumCulled = false;
      this.add({ kind: 'fish', obj: mesh, speed: 4, phase: this.rng.range(0, 9) });
    }
  }

  addJelly(color) {
    const j = buildJelly(color);
    j.group.scale.setScalar(this.rng.range(0.6, 1.6));
    this.disposables.push(...j.mats);
    this.add({ kind: 'jelly', obj: j.group, speed: 0.6, phase: this.rng.range(0, 9) });
  }

  addWhale(color) {
    const w = buildWhale(color);
    const obj = new THREE.Group();
    obj.add(w.group);
    this.add({ kind: 'whale', obj, fallback: w, tail: w.tail, color, speed: 3, phase: this.rng.range(0, 9),
      length: this.rng.range(...WHALE_LENGTH) });
  }

  // Swaps the procedural whale for the rigged model once it is loaded.
  whaleModel(it) {
    const tpl = readyModel('whale');
    if (!tpl) return false;
    this.whaleMat ??= tintedMaterial(tpl, it.color, 0.5);
    it.inst = cloneModel(tpl, this.whaleMat);
    const s = it.length / tpl.length;
    it.inst.scene.scale.setScalar(s);
    it.inst.scene.position.y = -0.5 * s;
    it.obj.add(it.inst.scene);
    it.anim = new BoneAnimator(it.inst, it.phase / 9);
    it.obj.remove(it.fallback.group);
    it.fallback.group.traverse((o) => o.geometry?.dispose());
    it.fallback.mats.forEach((m) => m.dispose());
    it.fallback = null;
    return true;
  }

  animateWhale(it, t, dt) {
    it.obj.rotation.z = Math.sin(t * 0.5 + it.phase) * 0.05;
    if (it.inst || this.whaleModel(it)) it.anim.update(dt, { mode: 'swim' });
    else it.tail.rotation.z = Math.sin(t * 1.2 + it.phase) * 0.3;
  }

  add(item) {
    item.pos = new THREE.Vector3();
    item.target = new THREE.Vector3();
    item.placed = false;
    item.obj.visible = false;
    this.scene.add(item.obj);
    this.items.push(item);
  }

  // Deep enough water somewhere near the player, or null.
  findWater(center, minR, maxR, out) {
    for (let i = 0; i < 12; i++) {
      const a = this.rng.range(0, Math.PI * 2), r = this.rng.range(minR, maxR);
      const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
      const floor = this.heightFn(x, z);
      if (floor < this.waterY - 4) return out.set(x, this.rng.range(floor + 1.5, this.waterY - 1.5), z);
    }
    return null;
  }

  steer(it, dt, player) {
    const tooFar = it.pos.distanceTo(player) > 160;
    if (!it.placed || tooFar) {
      it.placed = Boolean(this.findWater(player, 30, 120, it.pos));
      it.obj.visible = it.placed;
      if (it.placed) it.target.copy(it.pos);
      return;
    }
    if (it.pos.distanceTo(it.target) < 2 && !this.findWater(it.pos, 10, 40, it.target)) it.target.copy(it.pos);
    const dir = dummy.position.subVectors(it.target, it.pos);
    const d = dir.length();
    if (d > 0.01) it.pos.addScaledVector(dir, Math.min(1, (it.speed * dt) / d));
    if (it.kind !== 'jelly' && d > 0.01) it.obj.rotation.y = Math.atan2(-dir.z, dir.x);
  }

  animate(it, t, dt) {
    const p = it.pos;
    if (it.kind === 'jelly') {
      const pulse = Math.sin(t * 2 + it.phase);
      it.obj.position.set(p.x, p.y + pulse * 0.6, p.z);
      it.obj.scale.y = it.obj.scale.x * (1 + pulse * 0.15);
      return;
    }
    it.obj.position.copy(p);
    if (it.kind === 'whale') { this.animateWhale(it, t, dt); return; }
    for (let i = 0; i < FISH_PER_SCHOOL; i++) {
      const a = t * 1.3 + i * 0.52 + it.phase;
      dummy.position.set(Math.sin(a * 0.7) * 2.5, Math.sin(a * 1.3) * 0.8, Math.cos(a) * 2.5);
      dummy.rotation.set(0, Math.sin(a * 3) * 0.3, 0);
      dummy.updateMatrix();
      it.obj.setMatrixAt(i, dummy.matrix);
    }
    it.obj.instanceMatrix.needsUpdate = true;
  }

  update(dt, player) {
    this.t = (this.t ?? 0) + dt;
    for (const it of this.items) {
      this.steer(it, dt, player);
      if (it.placed) this.animate(it, this.t, dt);
    }
  }

  nearest(pos, maxDist = 40) {
    let best = null;
    for (const it of this.items) {
      if (!it.placed) continue;
      const d = it.obj.position.distanceTo(pos);
      if (d < maxDist && (!best || d < best.distance)) best = { name: this.name, distance: d };
    }
    return best;
  }

  dispose() {
    for (const it of this.items) {
      this.scene.remove(it.obj);
      if (it.inst) it.inst.meshes.forEach((m) => m.skeleton.dispose());
      else it.obj.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) o.geometry.dispose(); });
      it.fallback?.mats.forEach((m) => m.dispose());
    }
    this.whaleMat?.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.items = [];
  }
}
