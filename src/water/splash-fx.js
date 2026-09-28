// The 3D half of water entry: expanding ripple rings lying on the swell, a burst of water
// droplets that arc up and fall back, and foam puffs borrowed from the pooled FxSystem.
// Everything is preallocated; update() never makes garbage.
import * as THREE from 'three';
import { glowTexture } from '../assets/textures.js';

const RINGS = 8, DROPS = 140;
const RING_LIFE = 1.25;
const _v = new THREE.Vector3();

function ringMesh(geo) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0,
    depthWrite: false, side: THREE.DoubleSide, fog: false });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.visible = false;
  m.renderOrder = 3;
  return m;
}

export class SplashFx {
  constructor(scene, fx) {
    this.scene = scene;
    this.fx = fx;
    this.ringGeo = new THREE.RingGeometry(0.88, 1, 40);
    this.rings = Array.from({ length: RINGS }, () => ringMesh(this.ringGeo));
    this.rings.forEach((r) => scene.add(r));
    this.ringAge = new Float32Array(RINGS).fill(RING_LIFE);
    this.ringSize = new Float32Array(RINGS);
    this.nextRing = 0;
    this.buildDrops();
    this.wakeT = 0;
  }

  buildDrops() {
    this.dPos = new Float32Array(DROPS * 3).fill(-1e5);
    this.dVel = new Float32Array(DROPS * 3);
    this.dLife = new Float32Array(DROPS);
    this.dFloor = new Float32Array(DROPS); // the height each droplet falls back into
    this.nextDrop = 0;
    this.dGeo = new THREE.BufferGeometry();
    this.dGeo.setAttribute('position', new THREE.BufferAttribute(this.dPos, 3));
    this.dMat = new THREE.PointsMaterial({ color: 0xf2fbff, size: 0.26, map: glowTexture(0xeaf7ff),
      transparent: true, opacity: 0.9, depthWrite: false });
    this.drops = new THREE.Points(this.dGeo, this.dMat);
    this.drops.frustumCulled = false;
    this.scene.add(this.drops);
  }

  // One ripple ring on the surface, growing to `size` metres over its life.
  ring(x, y, z, size, alpha) {
    const i = this.nextRing;
    this.nextRing = (this.nextRing + 1) % RINGS;
    const m = this.rings[i];
    m.position.set(x, y + 0.14, z); // clear of the swell, so the ring is never half-buried
    m.material.opacity = alpha;
    m.visible = true;
    this.ringAge[i] = 0;
    this.ringSize[i] = size;
  }

  // n droplets thrown up from (x, y, z) at `speed`, spread sideways by `spread`.
  // floor: the height they land at and vanish (the water line, or the ground under a drip).
  drop(x, y, z, n, speed, spread = 1, floor = y - 0.12) {
    for (let k = 0; k < n; k++) {
      const i = this.nextDrop = (this.nextDrop + 1) % DROPS, j = i * 3;
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.5 + 0.1;
      this.dPos[j] = x + Math.cos(a) * r;
      this.dPos[j + 1] = y + 0.1;
      this.dPos[j + 2] = z + Math.sin(a) * r;
      const out = (0.35 + Math.random() * 0.9) * speed * spread;
      this.dVel[j] = Math.cos(a) * out;
      this.dVel[j + 1] = speed * (0.7 + Math.random() * 0.8);
      this.dVel[j + 2] = Math.sin(a) * out;
      this.dLife[i] = 0.5 + Math.random() * 0.8;
      this.dFloor[i] = floor;
    }
  }

  // The full entry splash. power ~ impact speed in units/s; 0.6 = stepping in, 18 = a long fall.
  splash(x, y, z, power) {
    const p = Math.min(3, 0.45 + power * 0.14);
    this.ring(x, y, z, 1.8 + p * 1.5, Math.min(0.8, 0.34 + p * 0.2));
    this.ring(x, y, z, 0.9 + p * 0.7, Math.min(0.62, 0.26 + p * 0.16));
    this.drop(x, y, z, Math.round(12 + p * 26), Math.min(6.4, 1.9 + power * 0.3), 0.42 + p * 0.1);
    const puffs = Math.round(2 + p * 3);
    for (let i = 0; i < puffs; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * p * 0.8;
      _v.set(x + Math.cos(a) * r, y + 0.15 + Math.random() * p * 0.35, z + Math.sin(a) * r);
      this.fx?.puff(_v, 0xeaf7ff, 0.5 + p * 0.55, 0.7 + p * 0.25);
    }
  }

  // Continuous trail while the player swims along the surface.
  wake(dt, x, y, z, moving) {
    this.wakeT -= dt;
    if (this.wakeT > 0) return;
    this.wakeT = moving ? 0.28 : 0.9;
    this.ring(x, y, z, moving ? 2.4 : 1.5, moving ? 0.3 : 0.16);
    if (moving) this.drop(x, y, z, 3, 1.5, 0.5);
  }

  update(dt, gravity = 9.8) {
    this.stepRings(dt);
    this.stepDrops(dt, gravity);
  }

  stepRings(dt) {
    for (let i = 0; i < RINGS; i++) {
      const m = this.rings[i];
      if (!m.visible) continue;
      const age = (this.ringAge[i] += dt), t = age / RING_LIFE;
      if (t >= 1) { m.visible = false; continue; }
      const grow = 1 - (1 - t) * (1 - t);
      m.scale.setScalar(0.35 + this.ringSize[i] * grow);
      m.material.opacity *= Math.pow(0.02, dt / RING_LIFE); // steady fade, no stored a0
    }
  }

  stepDrops(dt, gravity) {
    const p = this.dPos, v = this.dVel;
    for (let i = 0; i < DROPS; i++) {
      if (this.dLife[i] <= 0) continue;
      const j = i * 3;
      if ((this.dLife[i] -= dt) <= 0) { p[j + 1] = -1e5; continue; }
      v[j + 1] -= gravity * dt;
      p[j] += v[j] * dt;
      p[j + 1] += v[j + 1] * dt;
      p[j + 2] += v[j + 2] * dt;
      if (p[j + 1] < this.dFloor[i]) { this.dLife[i] = 0; p[j + 1] = -1e5; } // fell back in
    }
    this.dGeo.attributes.position.needsUpdate = true;
  }

  dispose() {
    for (const m of this.rings) { this.scene.remove(m); m.material.dispose(); }
    this.scene.remove(this.drops);
    this.ringGeo.dispose();
    this.dGeo.dispose();
    this.dMat.dispose();
  }
}
