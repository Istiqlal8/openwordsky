// Pooled laser bolts drawn as two InstancedMeshes (bright core + soft halo).
import * as THREE from 'three';

const Z = new THREE.Vector3(0, 0, 1);
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpD = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();

// shape 'box' = laser streak, 'ball' = stretched glowing blob (plasma).
function boltMesh(w, len, color, opacity, cap, shape) {
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const geo = shape === 'ball' ? new THREE.IcosahedronGeometry(0.5, 2).scale(w, w, len) : new THREE.BoxGeometry(w, w, len);
  const mesh = new THREE.InstancedMesh(geo, mat, cap);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return mesh;
}

export class BoltPool {
  constructor(parent, { color, capacity = 160, length = 3.2, width = 0.16, shape = 'box' }) {
    this.length = length;
    this.core = boltMesh(width, length, shape === 'ball' ? 0xeaffd0 : 0xffffff, 0.95, capacity, shape);
    this.halo = boltMesh(width * 2.6, length * 1.2, color, shape === 'ball' ? 0.35 : 0.5, capacity, shape);
    parent.add(this.halo, this.core);
    this.items = [];
    for (let i = 0; i < capacity; i++) {
      this.items.push({ pos: new THREE.Vector3(), prev: new THREE.Vector3(), vel: new THREE.Vector3(), damage: 0, age: 0, life: 1, splash: 0 });
    }
    this.active = 0;
  }

  // Returns the pooled bolt (callers may set extra fields like splash), or null when full.
  fire(pos, vel, damage, life = 1.6) {
    if (this.active >= this.items.length) return null;
    const b = this.items[this.active++];
    b.pos.copy(pos);
    b.prev.copy(pos);
    b.vel.copy(vel);
    b.damage = damage;
    b.age = 0;
    b.life = life;
    b.splash = 0;
    return b;
  }

  kill(i) {
    const last = --this.active;
    const tmpB = this.items[i];
    this.items[i] = this.items[last];
    this.items[last] = tmpB;
  }

  // Moves bolts; hit(bolt) returning true consumes the bolt.
  update(dt, hit) {
    for (let i = this.active - 1; i >= 0; i--) {
      const b = this.items[i];
      b.age += dt;
      b.prev.copy(b.pos);
      b.pos.addScaledVector(b.vel, dt);
      if (b.age >= b.life || hit(b)) this.kill(i);
    }
    this.draw();
  }

  draw() {
    for (let i = 0; i < this.active; i++) {
      const b = this.items[i];
      const speed = b.vel.length();
      tmpD.copy(b.vel).divideScalar(speed || 1);
      tmpQ.setFromUnitVectors(Z, tmpD);
      // A fresh bolt grows out of the muzzle instead of poking back through the ship/camera.
      const k = Math.min(1, Math.max(0.05, (b.age * speed) / this.length));
      tmpP.copy(b.pos).addScaledVector(tmpD, -this.length * 0.5 * k);
      tmpM.compose(tmpP, tmpQ, tmpS.set(1, 1, k));
      this.core.setMatrixAt(i, tmpM);
      this.halo.setMatrixAt(i, tmpM);
    }
    this.core.count = this.halo.count = this.active;
    this.core.instanceMatrix.needsUpdate = true;
    this.halo.instanceMatrix.needsUpdate = true;
  }

  clear() {
    this.active = 0;
    this.draw();
  }

  dispose() {
    for (const m of [this.core, this.halo]) {
      m.removeFromParent();
      m.geometry.dispose();
      m.material.dispose();
      m.dispose();
    }
  }
}
