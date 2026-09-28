// The allied swarm: 100-200 fighters drawn as ONE InstancedMesh plus one Points cloud of
// running lights, so the whole armada costs two draw calls. Behaviours are three states
// (run in, peel off, rally) and only ships inside LOD_RANGE get a hull and fire tracers.
import * as THREE from 'three';
import { Rng } from '../core/rng.js';
import { BoltPool } from '../combat/bolts.js';

const LOD_RANGE = 7000;        // beyond this a fighter is just a running light
const FIRE_RANGE = 1700;       // distance to its target before it shoots
const MAX_SHOTS = 6;           // tracers spawned per frame, whole swarm
export const RALLY_R = 3000;   // radius of the holding sphere around the entity

const RACE_COLORS = [0x6fe3ff, 0xffc866, 0xff7a7a, 0xa8ff9c, 0xd8a0ff, 0xffffff];
const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const SCALE = new THREE.Vector3(1, 1, 1);

function hullGeometry() {
  const geo = new THREE.ConeGeometry(4.5, 22, 4);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function randomOn(sphere, out, rng) {
  const u = rng.next() * 2 - 1;
  const th = rng.next() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return out.set(Math.cos(th) * s, u * 0.55, Math.sin(th) * s).multiplyScalar(sphere);
}

export class Swarm {
  constructor(parent, seed, count, center) {
    this.rng = new Rng(seed ^ 0x57a3);
    this.count = count;
    this.root = new THREE.Group();
    parent.add(this.root);
    this.mesh = new THREE.InstancedMesh(hullGeometry(), new THREE.MeshStandardMaterial({
      flatShading: true, roughness: 0.6, metalness: 0.3, emissive: 0x101820 }), count);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.lights = this.buildLights(count);
    this.bolts = new BoltPool(this.root, { color: 0x8ff0ff, capacity: 140, length: 130, width: 6 });
    this.root.add(this.mesh, this.lights);
    this.ships = [];
    this.losses = 0;
    this.build(count, center);
  }

  buildLights(count) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 5, sizeAttenuation: false,
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false;
    return pts;
  }

  build(count, center) {
    const rng = this.rng;
    const col = new THREE.Color();
    const cattr = this.lights.geometry.attributes.color;
    this.mesh.setColorAt(0, col.set(1, 1, 1));
    for (let i = 0; i < count; i++) {
      const hex = RACE_COLORS[i % RACE_COLORS.length];
      col.set(hex);
      this.mesh.setColorAt(i, col);
      cattr.setXYZ(i, col.r, col.g, col.b);
      const s = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), aim: new THREE.Vector3(),
        state: 'rally', timer: rng.range(0, 6), speed: rng.range(260, 460), cd: rng.range(0, 1.2),
        alive: true, hex, home: null };
      randomOn(RALLY_R * rng.range(0.7, 1.25), s.pos, rng).add(center);
      s.vel.set(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)).normalize().multiplyScalar(s.speed);
      this.ships.push(s);
    }
    this.mesh.instanceColor.needsUpdate = true;
    cattr.needsUpdate = true;
  }

  // ctx: { center, targets: Vector3[], camPos, dt, bursts, hot }
  update(ctx) {
    const { dt, camPos } = ctx;
    let drawn = 0;
    let shots = 0;
    const pos = this.lights.geometry.attributes.position;
    for (let i = 0; i < this.ships.length; i++) {
      const s = this.ships[i];
      if (!s.alive) { this.respawn(s, dt, ctx); pos.setXYZ(i, 0, -1e6, 0); continue; }
      this.steer(s, dt, ctx);
      pos.setXYZ(i, s.pos.x, s.pos.y, s.pos.z);
      const near = camPos.distanceToSquared(s.pos) < LOD_RANGE * LOD_RANGE;
      if (near && drawn < this.count) this.draw(s, drawn++);
      if (near && shots < MAX_SHOTS && this.tryFire(s, dt)) shots++;
    }
    pos.needsUpdate = true;
    this.mesh.count = drawn;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.bolts.update(dt, () => false);
  }

  steer(s, dt, ctx) {
    s.timer -= dt;
    s.cd -= dt;
    if (s.timer <= 0) this.retarget(s, ctx);
    tmpA.subVectors(s.aim, s.pos);
    const d = tmpA.length() || 1;
    tmpA.multiplyScalar(1 / d);
    s.vel.addScaledVector(tmpA, s.speed * 2.2 * dt).clampLength(0, s.speed);
    s.pos.addScaledVector(s.vel, dt);
    if (s.state === 'run' && d < 420) this.retarget(s, ctx, 'peel');
  }

  retarget(s, ctx, force = null) {
    const rng = this.rng;
    const next = force ?? (s.state === 'run' ? 'peel' : rng.chance(0.72) ? 'run' : 'rally');
    s.state = next;
    if (next === 'run') {
      const t = ctx.targets[rng.int(ctx.targets.length)] ?? ctx.center;
      s.aim.copy(t).addScaledVector(randomOn(1, tmpB, rng), 260);
      s.timer = rng.range(5, 11);
      return;
    }
    randomOn(RALLY_R * rng.range(0.75, 1.3), s.aim, rng).add(ctx.center);
    s.timer = next === 'peel' ? rng.range(2.5, 5) : rng.range(4, 9);
  }

  tryFire(s, dt) {
    if (s.state !== 'run' || s.cd > 0 || s.pos.distanceToSquared(s.aim) > FIRE_RANGE * FIRE_RANGE) return false;
    s.cd = 0.35 + this.rng.next() * 0.5;
    tmpA.subVectors(s.aim, s.pos).normalize().multiplyScalar(3400);
    this.bolts.fire(s.pos, tmpA, 0, 0.7);
    return true;
  }

  draw(s, index) {
    tmpA.copy(s.vel).normalize();
    tmpQ.setFromUnitVectors(Z, tmpA);
    tmpM.compose(s.pos, tmpQ, SCALE);
    this.mesh.setMatrixAt(index, tmpM);
  }

  // Kill `n` random fighters near `at` (the devourer's sweeping beam).
  cull(n, at, radius, bursts) {
    let killed = 0;
    for (const s of this.ships) {
      if (killed >= n) break;
      if (!s.alive || s.pos.distanceTo(at) > radius) continue;
      s.alive = false;
      s.timer = 5 + this.rng.range(0, 9);
      this.losses++;
      killed++;
      bursts?.blast(s.pos, 0xffb060, 7);
    }
    return killed;
  }

  respawn(s, dt, ctx) {
    s.timer -= dt;
    if (s.timer > 0) return;
    s.alive = true;
    const from = ctx.launchPoints?.length ? ctx.launchPoints[this.rng.int(ctx.launchPoints.length)] : null;
    if (from) s.pos.copy(from);
    else randomOn(RALLY_R * 1.4, s.pos, this.rng).add(ctx.center);
    s.vel.set(0, 0, 0);
    this.retarget(s, ctx, 'run');
  }

  get alive() {
    let n = 0;
    for (const s of this.ships) if (s.alive) n++;
    return n;
  }

  dispose() {
    this.bolts.dispose();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
    this.lights.geometry.dispose();
    this.lights.material.dispose();
    this.root.removeFromParent();
  }
}
