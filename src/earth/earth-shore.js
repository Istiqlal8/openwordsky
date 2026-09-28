// Shore life around the player on Earth: fish schools in shallow water and seagulls wheeling
// over the nearest stretch of coast. Both are instanced and only shown when there is water near.
import * as THREE from 'three';
import { Rng } from '../core/rng.js';
import { EARTH_SEA } from './earth-terrain.js';

const SCHOOLS = 3, FISH = 12, GULLS = 9, LOOK_EVERY = 2.5;
const dummy = new THREE.Object3D();

function gullGeometry() {
  const v = [0, 0, 0, -0.1, 0.06, 0.45, 0.12, 0, 0.05, 0, 0, 0, 0.12, 0, -0.05, -0.1, 0.06, -0.45,
    0.25, 0, 0, -0.2, 0, 0.05, -0.2, 0, -0.05];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
  geo.computeVertexNormals();
  return geo;
}

function instanced(geo, color, n) {
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.6,
    side: THREE.DoubleSide }), n);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return mesh;
}

export class EarthShore {
  constructor(scene, h) {
    Object.assign(this, { scene, h, t: 0, look: 0 });
    this.rng = new Rng(0x5a0e);
    this.fish = instanced(new THREE.ConeGeometry(0.12, 0.5, 5).rotateZ(-Math.PI / 2), 0x8ab0d0, SCHOOLS * FISH);
    this.gulls = instanced(gullGeometry(), 0xf4f4f0, GULLS);
    this.schools = Array.from({ length: SCHOOLS }, () => ({ at: null, ph: this.rng.range(0, 9) }));
    this.coast = null;
    scene.add(this.fish, this.gulls);
  }

  // Random point near the player whose ground height is between lo and hi.
  find(player, r0, r1, lo, hi) {
    for (let i = 0; i < 16; i++) {
      const a = this.rng.range(0, Math.PI * 2), d = this.rng.range(r0, r1);
      const x = player.x + Math.cos(a) * d, z = player.z + Math.sin(a) * d, y = this.h(x, z);
      if (y > lo && y < hi) return new THREE.Vector3(x, y, z);
    }
    return null;
  }

  lookAround(player) {
    for (const s of this.schools) {
      if (!s.at || s.at.distanceTo(player) > 80) s.at = this.find(player, 8, 60, EARTH_SEA - 8, EARTH_SEA - 1.2);
    }
    if (!this.coast || this.coast.distanceTo(player) > 260) this.coast = this.find(player, 20, 240, EARTH_SEA - 0.5, EARTH_SEA + 1.5);
  }

  updateFish() {
    let n = 0;
    for (const s of this.schools) {
      if (!s.at) continue;
      for (let i = 0; i < FISH; i++) {
        const a = this.t * 0.9 + i * 0.52 + s.ph;
        const depth = Math.max(s.at.y + 0.5, EARTH_SEA - 1.6);
        dummy.position.set(s.at.x + Math.sin(a * 0.7) * 3, depth + Math.sin(a * 1.3) * 0.25, s.at.z + Math.cos(a) * 3);
        dummy.rotation.set(0, -a * 0.7 + Math.PI, 0);
        dummy.updateMatrix();
        this.fish.setMatrixAt(n++, dummy.matrix);
      }
    }
    this.fish.count = n;
    this.fish.visible = n > 0;
    this.fish.instanceMatrix.needsUpdate = true;
  }

  updateGulls() {
    this.gulls.visible = Boolean(this.coast);
    if (!this.coast) return;
    for (let i = 0; i < GULLS; i++) {
      const r = 14 + (i % 3) * 9, a = this.t * (0.35 + (i % 4) * 0.05) * (i % 2 ? 1 : -1) + i * 1.9;
      dummy.position.set(this.coast.x + Math.cos(a) * r, EARTH_SEA + 18 + (i % 5) * 4 + Math.sin(this.t + i) * 2, this.coast.z + Math.sin(a) * r);
      dummy.rotation.set(Math.sin(this.t * 7 + i) * 0.25, -a + (i % 2 ? 0 : Math.PI), (i % 2 ? 0.3 : -0.3), 'YXZ');
      dummy.scale.setScalar(1.4);
      dummy.updateMatrix();
      this.gulls.setMatrixAt(i, dummy.matrix);
    }
    this.gulls.instanceMatrix.needsUpdate = true;
  }

  update(dt, player) {
    this.t += dt;
    if ((this.look -= dt) <= 0) { this.look = LOOK_EVERY; this.lookAround(player); }
    this.updateFish();
    this.updateGulls();
  }

  nearest(pos, maxDist) {
    if (this.coast && this.gulls.visible) {
      const d = Math.hypot(this.coast.x - pos.x, this.coast.z - pos.z);
      if (d < maxDist) return { name: 'Camar', distance: d };
    }
    const s = this.schools.find((k) => k.at && k.at.distanceTo(pos) < maxDist);
    return s ? { name: 'Ikan', distance: s.at.distanceTo(pos) } : null;
  }

  dispose() {
    for (const m of [this.fish, this.gulls]) {
      this.scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
      m.dispose();
    }
  }
}
