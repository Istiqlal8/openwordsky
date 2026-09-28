// FxSystem: pooled explosions, sparks and beams for any three.js scene (space or surface).
import * as THREE from 'three';
import { glowTexture } from '../assets/textures.js';
import { SpritePool, DebrisPool } from './particles.js';
import { puffTexture, shockTexture } from './fx-textures.js';

const MAX_LIGHTS = 4;
const MAX_BEAMS = 16;
const tmpV = new THREE.Vector3();
const tmpD = new THREE.Vector3();
const tmpC = new THREE.Color();
const rand = (a, b) => a + Math.random() * (b - a);

function randomDir(out) {
  const u = Math.random() * 2 - 1;
  const th = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return out.set(Math.cos(th) * s, u, Math.sin(th) * s);
}

// Lights stay in the scene at zero intensity so the light count never changes (no shader recompiles).
function buildLights(parent) {
  const out = [];
  for (let i = 0; i < MAX_LIGHTS; i++) {
    const light = new THREE.PointLight(0xffffff, 0, 10, 1);
    parent.add(light);
    out.push({ light, age: 1, life: 1, peak: 0 });
  }
  return out;
}

function buildBeams(parent) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0, 0.5); // spans z 0..1 so scale.z = length
  const out = [];
  for (let i = 0; i < MAX_BEAMS; i++) {
    const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    mesh.frustumCulled = false;
    parent.add(mesh);
    out.push({ mesh, age: 0, life: 1 });
  }
  return { geo, items: out, next: 0 };
}

export class FxSystem {
  constructor(scene) {
    this.root = new THREE.Group();
    this.root.name = 'fx';
    scene.add(this.root);
    this.glow = new SpritePool(this.root, 240, true);
    this.smoke = new SpritePool(this.root, 90, false);
    this.debris = new DebrisPool(this.root, 96);
    this.lights = buildLights(this.root);
    this.beams = buildBeams(this.root);
    this.tex = { fire: glowTexture(0xffb070), white: glowTexture(0xffffff), puff: puffTexture(), shock: shockTexture() };
  }

  explode(position, { color = 0xffaa55, size = 1, debris = true } = {}) {
    const t = this.tex;
    this.glow.spawn(position, t.white, 0xffffff, 0.2, 3 * size, 11 * size, 1);
    const ring = this.glow.spawn(position, t.shock, color, 0.5, size, 20 * size, 0.8);
    ring.fade = 1.6;
    this.fireballs(position, color, size);
    this.sparks(position, color, Math.min(30, 10 + Math.round(6 * size)), size);
    if (debris) this.chunks(position, color, size);
    this.puffs(position, size);
    this.flash(position, color, size);
  }

  fireballs(pos, color, size) {
    const n = Math.min(12, 5 + Math.round(3 * size));
    for (let i = 0; i < n; i++) {
      randomDir(tmpD);
      tmpV.copy(pos).addScaledVector(tmpD, rand(0, 1.2) * size);
      tmpC.set(color).offsetHSL(rand(-0.03, 0.03), 0, rand(-0.12, 0.12));
      const life = rand(0.45, 0.9) * (0.8 + 0.2 * size);
      const it = this.glow.spawn(tmpV, this.tex.fire, tmpC, life, 2 * size, rand(5, 8) * size, 0.95);
      it.vel.copy(tmpD).multiplyScalar(rand(2, 7) * size);
      it.drag = 0.15;
      it.fade = 1.4;
    }
  }

  // Hot tumbling chunks thrown outward.
  chunks(pos, color, size) {
    const n = Math.min(14, 4 + Math.round(4 * size));
    const speed = 10 * Math.sqrt(size);
    for (let i = 0; i < n; i++) {
      randomDir(tmpD).multiplyScalar(rand(0.6, 1.8) * speed);
      this.debris.spawn(pos, tmpD, rand(0.15, 0.45) * size, rand(1.2, 2.4), color, 0x3a3632);
    }
  }

  puffs(pos, size) {
    const n = Math.min(9, 3 + Math.round(2 * size));
    for (let i = 0; i < n; i++) {
      randomDir(tmpD);
      tmpV.copy(pos).addScaledVector(tmpD, rand(0.5, 2) * size);
      const it = this.smoke.spawn(tmpV, this.tex.puff, 0x3c3836, rand(1.6, 2.8), 2 * size, rand(8, 11) * size, 0.45);
      it.vel.copy(tmpD).multiplyScalar(rand(1, 3) * size);
      it.drag = 0.4;
    }
  }

  sparks(position, color, count = 12, scale = 1) {
    for (let i = 0; i < count; i++) {
      const it = this.glow.spawn(position, this.tex.white, color, rand(0.2, 0.5), 0.7 * scale, 0.15 * scale, 1);
      randomDir(it.vel).multiplyScalar(rand(12, 40) * Math.sqrt(scale));
      it.drag = 0.08;
    }
  }

  // Extra helper: a single fading puff (engine / rocket trails).
  puff(position, color = 0x777777, size = 1, life = 0.8) {
    this.smoke.spawn(position, this.tex.puff, color, life, 0.6 * size, 2.2 * size, 0.35);
  }

  flash(pos, color, size) {
    let best = this.lights[0];
    for (const l of this.lights) if (l.age / l.life > best.age / best.life) best = l;
    best.light.position.copy(pos);
    best.light.color.set(color);
    best.light.distance = 45 * size;
    best.peak = 8 * size;
    best.age = 0;
    best.life = 0.25 + 0.1 * size;
  }

  beam(from, to, color, duration = 0.08) {
    const b = this.beams;
    const it = b.items[b.next];
    b.next = (b.next + 1) % b.items.length;
    const len = from.distanceTo(to);
    const w = 0.12 + len * 0.002;
    it.mesh.position.copy(from);
    it.mesh.lookAt(to);
    it.mesh.scale.set(w, w, len);
    it.mesh.material.color.set(color);
    it.mesh.material.opacity = 1;
    it.mesh.visible = true;
    it.age = 0;
    it.life = duration;
  }

  update(dt) {
    this.glow.update(dt);
    this.smoke.update(dt);
    this.debris.update(dt);
    for (const l of this.lights) {
      l.age += dt;
      l.light.intensity = l.age < l.life ? l.peak * (1 - l.age / l.life) ** 2 : 0;
    }
    for (const it of this.beams.items) {
      if (!it.mesh.visible) continue;
      it.age += dt;
      if (it.age >= it.life) it.mesh.visible = false;
      else it.mesh.material.opacity = 1 - it.age / it.life;
    }
  }

  clear() {
    this.glow.clear();
    this.smoke.clear();
    this.debris.clear();
    for (const l of this.lights) { l.age = l.life; l.light.intensity = 0; }
    for (const it of this.beams.items) it.mesh.visible = false;
  }

  dispose() {
    this.glow.dispose();
    this.smoke.dispose();
    this.debris.dispose();
    for (const it of this.beams.items) it.mesh.material.dispose();
    this.beams.geo.dispose();
    this.root.removeFromParent();
  }
}
