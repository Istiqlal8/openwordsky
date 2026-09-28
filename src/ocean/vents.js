// Abyss floor features: hydrothermal vents (glowing chimneys ringed by tube worms, with
// rising bubbles) at fixed spots on the deepest floor, and a sunken wreck with a treasure glow
// at the deepest point found around the landing site.
import * as THREE from 'three';
import { hash32 } from '../core/rng.js';
import { glowTexture } from '../assets/textures.js';
import { mergeParts } from './ocean-kit.js';

const GRID = 60, POOL = 4, BUBBLES = 70, SCAN_EVERY = 1;

function ventGeometry() {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const r = 1.1 - i * 0.22, y = i * 0.9;
    parts.push({ geo: new THREE.CylinderGeometry(r * 0.8, r, 1, 9).translate(0.1 * (i % 2), y + 0.5, 0), color: 0x2a2624 });
  }
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, rr = 1.4 + (i % 4) * 0.35, len = 0.6 + (i % 3) * 0.4;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    parts.push({ geo: new THREE.CylinderGeometry(0.04, 0.05, len, 5).translate(x, len / 2, z), color: 0xe8e4d8 });
    parts.push({ geo: new THREE.SphereGeometry(0.08, 6, 4).translate(x, len, z), color: 0xff2a2a });
  }
  return mergeParts(parts);
}

function wreckGeometry() {
  const wood = 0x4a3526, dark = 0x2e2118;
  return mergeParts([
    { geo: new THREE.CylinderGeometry(2.2, 2.2, 14, 10, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI).scale(1, 0.8, 1), color: wood },
    { geo: new THREE.BoxGeometry(14, 0.2, 3.8).translate(0, 0, 0), color: dark },
    { geo: new THREE.BoxGeometry(3, 1.6, 3).translate(-4.5, 0.9, 0), color: wood },
    { geo: new THREE.CylinderGeometry(0.18, 0.22, 6, 6).rotateZ(0.5).translate(1.5, 2.6, 0), color: dark },
    { geo: new THREE.CylinderGeometry(0.15, 0.18, 3, 6).rotateZ(-1.2).translate(-1, 0.6, 1.4), color: dark },
    { geo: new THREE.BoxGeometry(0.9, 0.6, 0.6).translate(2.5, 0.4, 0.4), color: 0x8a6a2a },
  ]);
}

export class Vents {
  constructor(scene, ctx) {
    Object.assign(this, { scene, ctx, t: 0, scan: 0 });
    this.geo = ventGeometry();
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, emissive: 0x401000, emissiveIntensity: 0.5 });
    this.glowMat = new THREE.SpriteMaterial({ map: glowTexture(0xff7a2a), color: 0xff7a2a, blending: THREE.AdditiveBlending,
      transparent: true, depthWrite: false, opacity: 0.5 });
    this.vents = Array.from({ length: POOL }, () => this.makeVent());
    this.bubbleGeo = new THREE.BufferGeometry();
    this.bubbleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(POOL * BUBBLES * 3), 3));
    this.bubbleMat = new THREE.PointsMaterial({ color: 0xcfe8ff, size: 0.22, transparent: true, opacity: 0.7, depthWrite: false, map: glowTexture(0xcfe8ff) });
    this.bubbles = new THREE.Points(this.bubbleGeo, this.bubbleMat);
    this.bubbles.frustumCulled = false;
    this.seeds = Float32Array.from({ length: POOL * BUBBLES }, () => Math.random());
    scene.add(this.bubbles);
    this.buildWreck();
  }

  makeVent() {
    const group = new THREE.Group(), glow = new THREE.Sprite(this.glowMat);
    glow.position.y = 3.6;
    glow.scale.setScalar(5);
    group.add(new THREE.Mesh(this.geo, this.mat), glow);
    group.visible = false;
    this.scene.add(group);
    return { group, key: null };
  }

  // Treasure wreck at the deepest spot the depth scale found.
  buildWreck() {
    const { deepest } = this.ctx.scale, { h } = this.ctx;
    this.wreckGeo = wreckGeometry();
    this.wreckMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
    this.wreck = new THREE.Group();
    this.wreck.add(new THREE.Mesh(this.wreckGeo, this.wreckMat));
    this.treasureMat = new THREE.SpriteMaterial({ map: glowTexture(0xffd24a), color: 0xffd24a, blending: THREE.AdditiveBlending,
      transparent: true, depthWrite: false, opacity: 0.55 });
    this.treasure = new THREE.Sprite(this.treasureMat);
    this.treasure.position.set(2.5, 0.9, 0.4);
    this.wreck.add(this.treasure);
    this.wreck.position.set(deepest.x, h(deepest.x, deepest.z) + 0.6, deepest.z);
    this.wreck.rotation.set(0.12, 0.7, 0.25);
    this.scene.add(this.wreck);
  }

  // Vent cells: every 60 m cell whose hash says so and whose floor lies in the abyss.
  nearbyVents(cam) {
    const { h, waterY, scale, seed } = this.ctx, out = [];
    const cx = Math.floor(cam.x / GRID), cz = Math.floor(cam.z / GRID);
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const hs = hash32(seed, cx + i, cz + j, 0x7e47);
        if (hs % 3 !== 0) continue;
        const x = (cx + i + 0.2 + ((hs >>> 8) & 255) / 425) * GRID, z = (cz + j + 0.2 + ((hs >>> 16) & 255) / 425) * GRID;
        if (scale.zone(waterY - h(x, z)) !== 'abyss') continue;
        out.push({ key: `${cx + i},${cz + j}`, x, z, d: Math.hypot(x - cam.x, z - cam.z) });
      }
    }
    return out.sort((a, b) => a.d - b.d).slice(0, POOL);
  }

  assign(cam) {
    const spots = this.nearbyVents(cam);
    this.vents.forEach((v, i) => {
      const s = spots[i];
      v.group.visible = Boolean(s);
      if (!s || v.key === s.key) return;
      v.key = s.key;
      v.group.position.set(s.x, this.ctx.h(s.x, s.z) - 0.2, s.z);
    });
  }

  // Bubbles rise from each visible vent mouth and loop.
  bubble() {
    const arr = this.bubbleGeo.attributes.position.array, top = this.ctx.waterY - 0.3;
    this.vents.forEach((v, k) => {
      for (let i = 0; i < BUBBLES; i++) {
        const idx = k * BUBBLES + i, s = this.seeds[idx], life = (this.t * (0.25 + s * 0.2) + s * 7) % 1;
        const p = v.group.position, y = p.y + 3.8 + life * 16;
        arr[idx * 3] = v.group.visible ? p.x + Math.sin(s * 40 + this.t * 2) * (0.3 + life) : 0;
        arr[idx * 3 + 1] = v.group.visible && y < top ? y : -1e5;
        arr[idx * 3 + 2] = p.z + Math.cos(s * 31 + this.t * 1.7) * (0.3 + life);
      }
    });
    this.bubbleGeo.attributes.position.needsUpdate = true;
  }

  update(dt, cam) {
    this.t += dt;
    if ((this.scan -= dt) <= 0) { this.scan = SCAN_EVERY; this.assign(cam); }
    this.bubble();
    this.treasure.scale.setScalar(4 + Math.sin(this.t * 2) * 1);
    this.wreck.visible = this.wreck.position.distanceTo(cam) < 220;
  }

  get wreckPosition() { return this.wreck.position; }

  dispose() {
    for (const v of this.vents) this.scene.remove(v.group);
    this.scene.remove(this.bubbles, this.wreck);
    [this.geo, this.mat, this.glowMat, this.bubbleGeo, this.bubbleMat, this.wreckGeo, this.wreckMat, this.treasureMat].forEach((d) => d.dispose());
  }
}
