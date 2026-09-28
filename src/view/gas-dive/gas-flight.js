// Ship flight inside a gas giant: the same feel as surface-flight.js (mouse look, W / Shift /
// S, Space-R / C lift) plus turbulence gusts and a shaking chase camera. No ground.
import * as THREE from 'three';
import { CRUSH_DEPTH } from './gas-atmosphere.js';

const CRUISE = 90, BOOST = 240, CLIMB = 40, ROLL = 1.6;
const SENS = 0.0022, PITCH_MAX = 1.2;
const CHASE = new THREE.Vector3(0, 3.5, 15);
const _dir = new THREE.Vector3(), _off = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YXZ');

export class GasFlight {
  constructor(model, design) {
    this.model = model;
    this.speedMul = design?.stats?.speed ?? 1;
    this.velocity = new THREE.Vector3();
    this.gust = new THREE.Vector3();
    this.gustTarget = new THREE.Vector3();
    this.gustTimer = 0;
    this.shakeKick = 0;
    this.time = 0;
    this.reset(0);
  }

  // Start at the cloud tops, nose slightly down, already moving (we come in from space).
  reset(y) {
    this.model.group.position.set(0, y, 0);
    Object.assign(this, { yaw: 0, pitch: -0.18, bank: 0, roll: 0, speed: CRUISE });
    this.gust.set(0, 0, 0);
    this.model.setLegs(false);
  }

  get position() { return this.model.group.position; }

  kick(amount) { this.shakeKick = Math.min(3, this.shakeKick + amount); }

  // turb: 0..1 turbulence at the ship.
  update(dt, input, turb) {
    this.time += dt;
    if (input.locked) {
      this.yaw -= input.mouse.dx * SENS;
      this.pitch = THREE.MathUtils.clamp(this.pitch - input.mouse.dy * SENS, -PITCH_MAX, PITCH_MAX);
    }
    this.throttle(dt, input);
    this.gusts(dt, turb);
    const lift = (input.down('Space') || input.down('KeyR') ? 1 : 0) - (input.down('KeyC') ? 1 : 0);
    _dir.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    this.velocity.copy(_dir).multiplyScalar(this.speed).add(this.gust);
    this.velocity.y += lift * CLIMB;
    const g = this.model.group;
    g.position.addScaledVector(this.velocity, dt);
    g.position.y = Math.max(g.position.y, CRUSH_DEPTH - 60);
    this.attitude(dt, input, turb);
    this.model.setThrust(this.speed / BOOST);
    this.shakeKick *= Math.exp(-2.5 * dt);
  }

  throttle(dt, input) {
    const boost = input.down('ShiftLeft') || input.down('ShiftRight');
    const target = input.down('KeyW') ? (boost ? BOOST : CRUISE) * this.speedMul : input.down('KeyS') ? 0 : this.speed * 0.98;
    this.speed += (target - this.speed) * (1 - Math.exp(-1.4 * dt));
  }

  // Random lateral / vertical shoves that get stronger with turbulence.
  gusts(dt, turb) {
    this.gustTimer -= dt;
    if (this.gustTimer <= 0) {
      this.gustTimer = 0.4 + Math.random() * 1.2;
      const k = turb * 38;
      this.gustTarget.set((Math.random() - 0.5) * 2 * k, (Math.random() - 0.5) * k, (Math.random() - 0.5) * 2 * k);
    }
    this.gust.lerp(this.gustTarget, 1 - Math.exp(-2.2 * dt));
  }

  attitude(dt, input, turb) {
    const rollIn = (input.down('KeyZ') ? 1 : 0) - (input.down('KeyX') ? 1 : 0);
    this.roll = rollIn ? this.roll + rollIn * ROLL * dt : this.roll * Math.exp(-2 * dt);
    const want = THREE.MathUtils.clamp(-input.mouse.dx * 0.03 - this.gust.x * 0.006, -0.7, 0.7);
    this.bank += (want - this.bank) * (1 - Math.exp(-4 * dt));
    const j = this.jitter(turb * 0.06 + this.shakeKick * 0.03);
    this.model.group.rotation.set(this.pitch + j * 0.7, this.yaw, this.bank + this.roll + j, 'YXZ');
  }

  // Smooth pseudo-random wobble (sum of sines), amplitude a.
  jitter(a, k = 0) {
    const t = this.time * 13 + k;
    return a * (Math.sin(t * 1.7) * 0.5 + Math.sin(t * 3.1 + 1.3) * 0.3 + Math.sin(t * 5.9 + 2.1) * 0.2);
  }

  // Chase camera; shake grows with turbulence and thunder kicks.
  placeCamera(cam, turb) {
    const g = this.model.group, amp = turb * 0.45 + this.shakeKick * 0.6;
    _e.set(this.pitch * 0.6, this.yaw, this.roll * 0.5);
    cam.rotation.copy(_e);
    cam.position.copy(g.position).add(_off.copy(CHASE).applyEuler(_e));
    cam.position.x += this.jitter(amp, 3);
    cam.position.y += this.jitter(amp, 7);
    cam.rotation.x += this.jitter(amp * 0.012, 11);
    cam.rotation.z += this.jitter(amp * 0.015, 17);
  }
}
