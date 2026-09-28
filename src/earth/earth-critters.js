// Small procedural animals that live around the player on Earth: rabbits hopping in the grass
// (they bolt when approached and can be hunted) and butterflies fluttering over the meadow.
// Shore life (fish schools, seagulls) comes from earth-shore.js.
import * as THREE from 'three';
import { Rng } from '../core/rng.js';
import { earthBiome } from './earth-biome.js';
import { EarthShore } from './earth-shore.js';

const RABBITS = 30, BUTTERFLIES = 60, AROUND = [25, 75], LOST = 110;
const WING_COLORS = [0xffa020, 0xffffff, 0xfff050, 0x60a0ff, 0xff70b0].map((c) => new THREE.Color(c));
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const _tilt = new THREE.Matrix4();

function rabbitGeometry() {
  const parts = [new THREE.SphereGeometry(0.16, 8, 6).scale(1.3, 0.95, 0.9).translate(0, 0.17, 0),
    new THREE.SphereGeometry(0.1, 8, 6).translate(0.2, 0.3, 0),
    new THREE.CapsuleGeometry(0.025, 0.14, 2, 4).rotateZ(-0.25).translate(0.2, 0.46, 0.04),
    new THREE.CapsuleGeometry(0.025, 0.14, 2, 4).rotateZ(-0.35).translate(0.19, 0.45, -0.04),
    new THREE.SphereGeometry(0.05, 6, 4).translate(-0.22, 0.2, 0)];
  const flat = parts.map((g) => g.toNonIndexed());
  const pos = new Float32Array(flat.reduce((s, g) => s + g.attributes.position.array.length, 0));
  flat.reduce((o, g) => { pos.set(g.attributes.position.array, o); return o + g.attributes.position.array.length; }, 0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

function wingGeometry() {
  const v = [0, 0, 0, -0.05, 0, 0.12, 0.07, 0, 0.1, 0, 0, 0, 0.07, 0, -0.1, -0.05, 0, -0.12];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
  geo.computeVertexNormals();
  return geo;
}

export class EarthCritters {
  constructor(scene, h, origin) {
    Object.assign(this, { scene, h, t: 0 });
    this.rng = new Rng(0xc1177e5);
    this.geo = rabbitGeometry();
    this.mat = new THREE.MeshStandardMaterial({ color: 0xa88a6a, flatShading: true, roughness: 1 });
    this.rabbits = [];
    for (let i = 0; i < RABBITS; i++) this.addRabbit(origin);
    this.wings = new THREE.InstancedMesh(wingGeometry(), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), BUTTERFLIES);
    this.wings.frustumCulled = false;
    this.flies = Array.from({ length: BUTTERFLIES }, (_, i) => ({ pos: new THREE.Vector3(), home: null, ph: this.rng.range(0, 9) }));
    this.flies.forEach((f, i) => this.wings.setColorAt(i, WING_COLORS[i % WING_COLORS.length]));
    scene.add(this.wings);
    this.shore = new EarthShore(scene, h);
  }

  meadow(x, z) {
    const y = this.h(x, z);
    return y > 0.5 && earthBiome(x, z, y, Math.hypot(this.h(x + 1, z) - y, this.h(x, z + 1) - y)) === 'grass';
  }

  addRabbit(origin) {
    const root = new THREE.Mesh(this.geo, this.mat);
    const r = { root, critter: true, name: 'Kelinci', radius: 0.35, maxHp: 10, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      hop: 0, rest: 0, alive: true, placed: false };
    this.place(r, origin);
    this.scene.add(root);
    this.rabbits.push(r);
  }

  // Somewhere on a meadow near `p`; stays hidden if none was found this time.
  place(r, p) {
    for (let i = 0; i < 6 && !r.placed; i++) {
      const a = this.rng.range(0, Math.PI * 2), d = this.rng.range(...AROUND);
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (this.meadow(x, z)) { r.pos.set(x, this.h(x, z), z); r.placed = true; }
    }
    r.root.visible = r.placed && r.alive;
  }

  hopRabbit(r, dt, player) {
    const dx = r.pos.x - player.x, dz = r.pos.z - player.z, d = Math.hypot(dx, dz);
    if (r.hop <= 0 && (r.rest -= dt) <= 0) {
      const scared = d < 14, a = scared ? Math.atan2(dz, dx) + this.rng.range(-0.6, 0.6) : this.rng.range(0, Math.PI * 2);
      const speed = scared ? 7 : 2;
      r.vel.set(Math.cos(a) * speed, 3.2, Math.sin(a) * speed);
      r.hop = 0.45;
      r.rest = scared ? 0.05 : this.rng.range(0.8, 4);
      r.root.rotation.y = Math.atan2(-r.vel.z, r.vel.x);
    }
    if (r.hop > 0) {
      r.hop -= dt;
      r.pos.x += r.vel.x * dt;
      r.pos.z += r.vel.z * dt;
    }
    const ground = this.h(r.pos.x, r.pos.z), lift = r.hop > 0 ? Math.sin((1 - r.hop / 0.45) * Math.PI) * 0.35 : 0;
    r.root.position.set(r.pos.x, Math.max(ground, -0.6) + lift, r.pos.z);
  }

  updateFlies(dt, player, high) {
    this.wings.visible = !high;
    if (high) return;
    this.flies.forEach((f, i) => {
      if (!f.home || f.home.distanceTo(player) > 40) f.home = this.flyHome(player);
      const t = this.t * 0.6 + f.ph;
      _p.set(f.home.x + Math.sin(t) * 3, 0, f.home.z + Math.cos(t * 0.7) * 3);
      _p.y = this.h(_p.x, _p.z) + 0.8 + Math.sin(t * 2.3) * 0.4;
      const flap = 0.25 + Math.abs(Math.sin(this.t * 18 + f.ph)) * 0.9;
      _q.setFromAxisAngle(UP, t);
      this.wings.setMatrixAt(i, _m.compose(_p, _q, _s.set(1, flap, 1)).multiply(_tilt.makeRotationX(flap - 0.8)));
    });
    this.wings.instanceMatrix.needsUpdate = true;
  }

  flyHome(player) {
    const a = this.rng.range(0, Math.PI * 2), d = this.rng.range(4, 30);
    return new THREE.Vector3(player.x + Math.cos(a) * d, 0, player.z + Math.sin(a) * d);
  }

  update(dt, player) {
    this.t += dt;
    const high = player.y - this.h(player.x, player.z) > 30;
    for (const r of this.rabbits) {
      if (!r.alive) continue;
      if (!r.placed || r.pos.distanceTo(player) > LOST) { r.placed = false; if (!high) this.place(r, player); continue; }
      this.hopRabbit(r, dt, player);
    }
    this.updateFlies(dt, player, high);
    this.shore.update(dt, player);
  }

  bodies() {
    return this.rabbits.filter((r) => r.alive && r.root.visible).map((r) => ({ root: r.root, radius: r.radius, ref: r, hp: r.maxHp }));
  }

  // Shot rabbits are gone for good; the rest stay.
  kill(r) {
    r.alive = false;
    r.root.visible = false;
  }

  nearest(pos, maxDist) {
    let best = null;
    for (const r of this.rabbits) {
      const d = r.alive && r.root.visible ? r.root.position.distanceTo(pos) : Infinity;
      if (d < maxDist && (!best || d < best.distance)) best = { name: r.name, distance: d };
    }
    const s = this.shore.nearest(pos, maxDist);
    return !best || (s && s.distance < best.distance) ? s : best;
  }

  dispose() {
    for (const r of this.rabbits) this.scene.remove(r.root);
    this.scene.remove(this.wings);
    this.geo.dispose();
    this.mat.dispose();
    this.wings.geometry.dispose();
    this.wings.material.dispose();
    this.wings.dispose();
    this.shore.dispose();
  }
}
