// Pooled particle primitives for FxSystem: billboard sprites and tumbling debris.
import * as THREE from 'three';
import { puffTexture } from './fx-textures.js';

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpC = new THREE.Color();

// Round-robin sprite pool: oldest particle is recycled when the pool is full.
export class SpritePool {
  constructor(parent, size, additive) {
    this.items = [];
    this.next = 0;
    const blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    for (let i = 0; i < size; i++) {
      const mat = new THREE.SpriteMaterial({ map: puffTexture(), transparent: true, depthWrite: false, blending });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      parent.add(sprite);
      this.items.push({ sprite, vel: new THREE.Vector3(), age: 0, life: 1, s0: 1, s1: 1, a0: 1, drag: 1, fade: 1 });
    }
  }

  // life in seconds, scale s0 -> s1, opacity a0 fading out. Caller may set item.vel / drag / fade.
  spawn(pos, map, color, life, s0, s1, a0 = 1) {
    const it = this.items[this.next];
    this.next = (this.next + 1) % this.items.length;
    it.sprite.position.copy(pos);
    it.sprite.material.map = map;
    it.sprite.material.color.set(color);
    it.sprite.material.rotation = Math.random() * Math.PI * 2;
    it.sprite.visible = true;
    it.vel.set(0, 0, 0);
    it.age = 0; it.life = life; it.s0 = s0; it.s1 = s1; it.a0 = a0; it.drag = 1; it.fade = 1;
    this.apply(it, 0);
    return it;
  }

  apply(it, t) {
    const grow = 1 - (1 - t) * (1 - t); // ease-out
    it.sprite.scale.setScalar(it.s0 + (it.s1 - it.s0) * grow);
    it.sprite.material.opacity = it.a0 * Math.pow(1 - t, it.fade);
  }

  update(dt) {
    for (const it of this.items) {
      if (!it.sprite.visible) continue;
      it.age += dt;
      if (it.age >= it.life) { it.sprite.visible = false; continue; }
      it.sprite.position.addScaledVector(it.vel, dt);
      if (it.drag !== 1) it.vel.multiplyScalar(Math.pow(it.drag, dt));
      this.apply(it, it.age / it.life);
    }
  }

  clear() {
    for (const it of this.items) it.sprite.visible = false;
  }

  dispose() {
    for (const it of this.items) {
      it.sprite.removeFromParent();
      it.sprite.material.dispose();
    }
  }
}

// Instanced flat-shaded chunks that tumble, cool from hot orange to grey, then shrink away.
export class DebrisPool {
  constructor(parent, size) {
    const geo = new THREE.DodecahedronGeometry(1, 0);
    geo.scale(1, 0.55, 0.8);
    const mat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.85, metalness: 0.2, emissive: 0x2a0e00 });
    this.mesh = new THREE.InstancedMesh(geo, mat, size);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, tmpC.set(1, 1, 1));
    parent.add(this.mesh);
    this.items = [];
    this.next = 0;
    for (let i = 0; i < size; i++) {
      this.items.push({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Quaternion(),
        axis: new THREE.Vector3(1, 0, 0), spin: 0, size: 1, age: 0, life: 1, hot: new THREE.Color(), cold: new THREE.Color() });
    }
  }

  spawn(pos, vel, size, life, hot, cold) {
    const it = this.items[this.next];
    this.next = (this.next + 1) % this.items.length;
    it.alive = true;
    it.pos.copy(pos);
    it.vel.copy(vel);
    it.axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    it.rot.setFromAxisAngle(it.axis, Math.random() * 6.28);
    it.spin = 2 + Math.random() * 8; it.size = size; it.age = 0; it.life = life;
    it.hot.set(hot);
    it.cold.set(cold);
  }

  update(dt) {
    let n = 0;
    for (const it of this.items) {
      if (!it.alive) continue;
      it.age += dt;
      if (it.age >= it.life) { it.alive = false; continue; }
      const t = it.age / it.life;
      it.pos.addScaledVector(it.vel, dt);
      it.rot.multiply(tmpQ.setFromAxisAngle(it.axis, it.spin * dt));
      tmpS.setScalar(it.size * (t < 0.8 ? 1 : (1 - t) * 5));
      this.mesh.setMatrixAt(n, tmpM.compose(it.pos, it.rot, tmpS));
      this.mesh.setColorAt(n, tmpC.copy(it.hot).lerp(it.cold, Math.min(1, t * 3)));
      n++;
    }
    if (n === 0 && this.mesh.count === 0) return;
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }

  clear() {
    for (const it of this.items) it.alive = false;
    this.mesh.count = 0;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}
