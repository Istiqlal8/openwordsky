// Pirate AI: pursue, circle-strafe, shoot with lead, evade when hit, flee when weak.
import * as THREE from 'three';
import { buildPirate, disposePirate, PIRATE_KINDS } from './pirate-model.js';
import { randomDir, pushOut } from './geom.js';

const BOLT_SPEED = 170;
const STRAFE_RADIUS = 75;
const FLEE_GONE = 1500;
const Z = new THREE.Vector3(0, 0, 1);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpN = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpM = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);
const ORIGIN = new THREE.Vector3();

export class Pirate {
  constructor(parent, kind, pos, rnd = Math.random) {
    this.kind = PIRATE_KINDS[kind];
    this.group = buildPirate(kind);
    this.group.position.copy(pos);
    parent.add(this.group);
    this.pos = this.group.position;
    this.vel = new THREE.Vector3();
    this.hp = this.kind.hp;
    this.radius = this.kind.radius;
    this.state = 'attack';
    this.timer = 0;
    this.cooldown = 1.5 + rnd() * 2;
    this.orbitAxis = randomDir(new THREE.Vector3(), rnd);
    this.evadeDir = new THREE.Vector3();
    this.alive = true;
    this.gone = false; // true when it escaped instead of dying
  }

  // ctx: { shipPos, shipVel, bolts, bodies, holdFire, onFire }
  update(dt, ctx) {
    const toShip = tmpA.subVectors(ctx.shipPos, this.pos);
    const dist = toShip.length();
    const desired = this.desiredVelocity(dt, toShip, dist, ctx);
    this.vel.lerp(desired, 1 - Math.exp(-2.2 * dt));
    this.pos.addScaledVector(this.vel, dt);
    for (const b of ctx.bodies) pushOut(this.pos, b.pos, b.radius * 1.2, tmpN);
    const aiming = this.state === 'attack' && dist < 280;
    const aimPoint = this.leadPoint(ctx, dist, tmpB);
    this.face(aiming ? tmpN.subVectors(aimPoint, this.pos) : this.vel, dt);
    this.cooldown -= dt;
    if (aiming && !ctx.holdFire && this.cooldown <= 0) this.tryFire(aimPoint, dist, ctx);
    if (this.state === 'flee' && dist > FLEE_GONE) this.gone = true;
  }

  desiredVelocity(dt, toShip, dist, ctx) {
    const out = tmpN;
    const speed = this.kind.speed;
    this.timer -= dt;
    if (this.state === 'evade' && this.timer <= 0) this.state = 'attack';
    if (this.state === 'flee') return out.copy(toShip).normalize().multiplyScalar(-speed * 1.25);
    if (this.state === 'evade') return out.copy(this.evadeDir).multiplyScalar(speed * 1.35);
    if (dist > 150) return out.copy(toShip).normalize().multiplyScalar(speed * (dist > 400 ? 1.5 : 1));
    // Circle-strafe: aim for a point on a ring around the ship.
    out.crossVectors(this.orbitAxis, toShip).normalize().multiplyScalar(STRAFE_RADIUS);
    out.add(ctx.shipPos).addScaledVector(toShip, -STRAFE_RADIUS / Math.max(dist, 1)).sub(this.pos);
    return out.normalize().multiplyScalar(speed);
  }

  // Where the ship will be when a bolt arrives.
  leadPoint(ctx, dist, out) {
    out.copy(ctx.shipPos).addScaledVector(ctx.shipVel, dist / BOLT_SPEED);
    return out;
  }

  face(dir, dt) {
    if (dir.lengthSq() < 1e-4) return;
    tmpM.lookAt(dir, ORIGIN, UP); // +Z of the model along dir
    tmpQ.setFromRotationMatrix(tmpM);
    this.group.quaternion.slerp(tmpQ, 1 - Math.exp(-4 * dt));
  }

  tryFire(aimPoint, dist, ctx) {
    const dir = tmpN.subVectors(aimPoint, this.pos).normalize();
    const nose = tmpA.copy(Z).applyQuaternion(this.group.quaternion);
    if (nose.dot(dir) < 0.94) return;
    const spread = 0.03 + dist * 0.00012;
    dir.x += (Math.random() - 0.5) * spread * 2;
    dir.y += (Math.random() - 0.5) * spread * 2;
    dir.z += (Math.random() - 0.5) * spread * 2;
    dir.normalize();
    tmpA.copy(this.pos).addScaledVector(dir, this.radius + 1);
    // World-space bolt along the lead direction (adding own velocity threw shots ~18° wide).
    ctx.bolts.fire(tmpA, dir.multiplyScalar(BOLT_SPEED), 4 + Math.floor(Math.random() * 4), 2.4);
    this.cooldown = this.kind.fireGap * (0.8 + Math.random() * 0.8);
    ctx.onFire?.(this);
  }

  // Returns true when destroyed.
  hit(damage) {
    this.hp -= damage;
    if (this.hp <= 0) { this.alive = false; return true; }
    if (this.hp < this.kind.hp * 0.25) this.state = 'flee';
    else if (this.state !== 'evade' && Math.random() < 0.6) this.evade();
    return false;
  }

  evade() {
    this.state = 'evade';
    this.timer = 0.9 + Math.random() * 0.8;
    randomDir(this.evadeDir);
  }

  // Put the ship far away and calm it down (used after player respawn).
  relocate(center, distance) {
    randomDir(tmpA);
    this.pos.copy(center).addScaledVector(tmpA, distance);
    this.vel.set(0, 0, 0);
    this.state = 'attack';
    this.cooldown = 4;
  }

  dispose() {
    disposePirate(this.group);
  }
}
