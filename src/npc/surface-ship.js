// An NPC ship on a planet surface: parked, landing from the sky, taking off, or flying over.
import * as THREE from 'three';
import { buildShip } from '../view/ship/ship-model.js';
import { glowTexture } from '../assets/textures.js';

const LAND_TIME = 9;
const LAND_HEIGHT = 320;
const LIFT_TIME = 3;
const LIFT_HEIGHT = 22;
const LEAVE_TIME = 14;
const tmpV = new THREE.Vector3();
const easeOut = (t) => 1 - (1 - t) ** 3;

export class SurfaceShip {
  constructor(scene, design) {
    this.scene = scene;
    this.design = design;
    this.model = buildShip(design);
    this.group = this.model.group;
    this.group.rotation.order = 'YXZ'; // yaw first, so pitch/roll stay in the ship's frame
    this.dust = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(design.palette.glow),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    this.dust.scale.setScalar(design.parts.length * 1.6);
    scene.add(this.group, this.dust);
    this.rest = new THREE.Vector3();
    this.start = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.state = 'parked';
    this.t = 0;
  }

  get position() { return this.group.position; }
  get footprint() { return this.design.parts.length * 0.35; }

  // Rest pose: pads on the ground at (x, groundY, z).
  park(x, groundY, z, yaw) {
    this.rest.set(x, groundY + this.model.groundOffset - 0.15, z);
    this.group.position.copy(this.rest);
    this.group.rotation.set(0, yaw, 0);
    this.model.setLegs(true);
    this.model.setThrust(0);
    this.dust.material.opacity = 0;
    this.state = 'parked';
  }

  // Descend from high above and behind to the rest pose.
  land(x, groundY, z, yaw) {
    this.park(x, groundY, z, yaw);
    this.start.set(0, 0, 160).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw).add(this.rest);
    this.start.y += LAND_HEIGHT;
    this.group.position.copy(this.start);
    this.model.setLegs(false);
    this.state = 'landing';
    this.t = 0;
  }

  takeOff() {
    this.state = 'lifting';
    this.t = 0;
  }

  // Straight pass at `altitude` above the terrain from `from` along `dir` (unit, XZ) for `length`.
  flyOver(from, dir, altitude, length, speed) {
    Object.assign(this, { altitude, length, speed, state: 'flyover', t: 0 });
    this.start.copy(from);
    this.vel.copy(dir).multiplyScalar(speed);
    this.group.position.copy(from);
    this.group.rotation.set(0, Math.atan2(-dir.x, -dir.z), 0);
    this.model.setLegs(false);
    this.model.setThrust(0.8);
  }

  update(dt, h) {
    this.t += dt;
    if (this.state === 'landing') this.updateLanding();
    else if (this.state === 'lifting') this.updateLifting();
    else if (this.state === 'leaving') this.updateLeaving(dt);
    else if (this.state === 'flyover') this.updateFlyover(dt, h);
    this.updateDust();
  }

  updateLanding() {
    const k = Math.min(1, this.t / LAND_TIME);
    this.group.position.lerpVectors(this.start, this.rest, easeOut(k));
    this.model.setLegs(k > 0.75);
    this.model.setThrust(k < 1 ? 0.9 - k * 0.5 : 0);
    if (k >= 1) this.state = 'parked';
  }

  updateLifting() {
    const k = Math.min(1, this.t / LIFT_TIME);
    this.group.position.copy(this.rest);
    this.group.position.y += LIFT_HEIGHT * k * k;
    this.model.setLegs(k < 0.4);
    this.model.setThrust(0.5 + k * 0.3);
    if (k < 1) return;
    this.state = 'leaving';
    this.t = 0;
    this.vel.set(0, 6, -10).applyQuaternion(this.group.quaternion);
  }

  // Nose up and accelerate away, then vanish.
  updateLeaving(dt) {
    this.group.rotation.x = Math.min(0.45, this.group.rotation.x + dt * 0.12);
    this.vel.addScaledVector(tmpV.set(0, 0.5, -1).applyQuaternion(this.group.quaternion), dt * 30);
    this.group.position.addScaledVector(this.vel, dt);
    this.model.setThrust(1);
    if (this.t > LEAVE_TIME) this.hide();
  }

  updateFlyover(dt, h) {
    const p = this.group.position;
    p.x += this.vel.x * dt;
    p.z += this.vel.z * dt;
    const target = h(p.x, p.z) + this.altitude;
    p.y += (Math.max(target, p.y - 30 * dt) - p.y) * (1 - Math.exp(-1.5 * dt)); // climb fast, sink slowly
    this.group.rotation.z = Math.sin(this.t * 0.7) * 0.08;
    if (this.t * this.speed > this.length) this.hide();
  }

  // Glow on the ground under the engines while hovering low.
  updateDust() {
    const air = this.group.position.y - this.rest.y;
    const low = (this.state === 'landing' || this.state === 'lifting') && air < 40;
    this.dust.material.opacity = low ? 0.7 * (1 - air / 40) : 0;
    this.dust.position.set(this.group.position.x, this.rest.y - this.model.groundOffset + 0.5, this.group.position.z);
  }

  hide() {
    this.group.visible = false;
    this.dust.visible = false;
    this.state = 'gone';
  }

  dispose() {
    this.scene.remove(this.group, this.dust);
    this.model.dispose();
    this.dust.material.dispose(); // glow texture is cached, kept alive
  }
}
