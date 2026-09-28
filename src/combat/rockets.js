// Homing rockets: small pooled meshes with a glow and smoke trail.
// Options tune the pool for other seekers (ship missiles, micro-missile swarms).
import * as THREE from 'three';
import { glowTexture } from '../assets/textures.js';

const DEFAULTS = { capacity: 8, maxSpeed: 300, turn: 6, life: 5, scale: 1, flame: 0xffcc88, trail: 0x8a8a90, trailGap: 0.03 };
const Z = new THREE.Vector3(0, 0, 1);
const tmpD = new THREE.Vector3();

function rocketMesh(body, mat, o) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(body, mat));
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(0xffaa44), color: o.flame, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  flame.position.z = -1;
  flame.scale.setScalar(2.4);
  g.add(flame);
  g.scale.setScalar(o.scale);
  g.visible = false;
  return g;
}

export class RocketPool {
  constructor(parent, opts = {}) {
    const o = { ...DEFAULTS, ...opts };
    Object.assign(this, { maxSpeed: o.maxSpeed, turn: o.turn, life: o.life, trailColor: o.trail, trailGap: o.trailGap, trailSize: 0.7 * o.scale });
    this.body = new THREE.CylinderGeometry(0.16, 0.22, 1.4, 6).rotateX(Math.PI / 2);
    this.mat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, metalness: 0.5, roughness: 0.4, emissive: 0x222222 });
    this.items = [];
    for (let i = 0; i < o.capacity; i++) {
      const group = rocketMesh(this.body, this.mat, o);
      parent.add(group);
      this.items.push({ group, pos: group.position, prev: new THREE.Vector3(), dir: new THREE.Vector3(), speed: 0,
        target: null, age: 0, trail: 0, alive: false, damage: 0, radius: 0 });
    }
  }

  // Returns the launched rocket (callers may set damage/radius), or null when all are in flight.
  fire(pos, dir, speed, target) {
    const r = this.items.find((it) => !it.alive);
    if (!r) return null;
    r.pos.copy(pos);
    r.prev.copy(pos);
    r.dir.copy(dir).normalize();
    r.speed = speed;
    r.target = target;
    r.age = 0;
    r.trail = 0;
    r.alive = true;
    r.group.visible = true;
    return r;
  }

  // hit(rocket) returns true to detonate; detonate(rocket) is called on impact or timeout.
  update(dt, fx, hit, detonate) {
    for (const r of this.items) {
      if (!r.alive) continue;
      r.age += dt;
      this.steer(r, dt);
      r.prev.copy(r.pos);
      r.pos.addScaledVector(r.dir, r.speed * dt);
      r.group.quaternion.setFromUnitVectors(Z, r.dir);
      r.trail -= dt;
      if (r.trail <= 0) { r.trail = this.trailGap; fx.puff(r.prev, this.trailColor, this.trailSize, 0.7); }
      if (r.age >= this.life || hit(r)) {
        this.kill(r);
        detonate(r);
      }
    }
  }

  steer(r, dt) {
    r.speed = Math.min(this.maxSpeed, r.speed + 220 * dt);
    if (!r.target?.alive || r.age < 0.15) return;
    tmpD.subVectors(r.target.pos, r.pos).normalize();
    r.dir.lerp(tmpD, 1 - Math.exp(-this.turn * dt)).normalize();
  }

  kill(r) {
    r.alive = false;
    r.group.visible = false;
  }

  clear() {
    for (const r of this.items) this.kill(r);
  }

  dispose() {
    for (const r of this.items) {
      r.group.removeFromParent();
      r.group.children[1].material.dispose();
    }
    this.body.dispose();
    this.mat.dispose();
  }
}
