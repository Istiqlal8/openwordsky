// On-foot player inside the freighter: WASD + mouse look, Shift sprint, Space jump,
// V toggles first/third person. The camera never leaves the walkable space.
import * as THREE from 'three';
import { Astronaut } from '../view/astronaut.js';
import { ceilingAt } from './interior-shell.js';

const EYE = 1.7, WALK = 4.5, SPRINT = 9, GRAVITY = 9.8;
const JUMP_V = Math.sqrt(2 * GRAVITY * 1.1);
const SENS = 0.0022, PITCH_MAX = 1.45;
const CHASE = new THREE.Vector3(0.6, 0.55, 3.6);
const _off = new THREE.Vector3(), _cam = new THREE.Vector3();

export class Walker {
  constructor(camera, walkable) {
    this.camera = camera;
    this.camera.rotation.order = 'YXZ';
    this.walkable = walkable;
    this.feet = new THREE.Vector3();
    this.head = new THREE.Vector3();
    this.avatar = new Astronaut(0xffa040);
    Object.assign(this, { yaw: 0, pitch: 0, velY: 0, onGround: true, speed: 0, thirdPerson: true, bobT: 0 });
  }

  place(x, z, yaw) {
    this.feet.set(x, 0, z);
    this.yaw = yaw;
    this.pitch = -0.08;
    this.velY = 0;
    this.onGround = true;
    this.updateCamera(0);
  }

  update(dt, input) {
    if (input.pressed('KeyV')) this.thirdPerson = !this.thirdPerson;
    if (input.locked) {
      this.yaw -= input.mouse.dx * SENS;
      this.pitch = THREE.MathUtils.clamp(this.pitch - input.mouse.dy * SENS, -PITCH_MAX, PITCH_MAX);
    }
    this.move(dt, input);
    this.jump(dt, input);
    this.avatar.group.visible = this.thirdPerson;
    this.avatar.update(dt, this.feet, this.yaw, this.speed, this.onGround);
    const moving = this.speed > 0 && this.onGround;
    this.bobT = moving ? this.bobT + dt * this.speed * 1.1 : 0;
    this.updateCamera(moving ? Math.sin(this.bobT) * 0.04 : 0);
  }

  move(dt, input) {
    const sprint = input.down('ShiftLeft') || input.down('ShiftRight');
    let f = (input.down('KeyW') ? 1 : 0) - (input.down('KeyS') ? 1 : 0);
    let s = (input.down('KeyD') ? 1 : 0) - (input.down('KeyA') ? 1 : 0);
    const len = Math.hypot(f, s);
    if (len > 0) { f /= len; s /= len; }
    const speed = sprint ? SPRINT : WALK;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    this.walkable.move(this.feet, (-sin * f + cos * s) * speed * dt, (-cos * f - sin * s) * speed * dt);
    this.speed = len > 0 ? speed : 0;
  }

  jump(dt, input) {
    if (this.onGround && input.pressed('Space')) { this.velY = JUMP_V; this.onGround = false; }
    if (this.onGround) return;
    this.velY -= GRAVITY * dt;
    this.feet.y += this.velY * dt;
    if (this.feet.y <= 0) { this.feet.y = 0; this.velY = 0; this.onGround = true; }
  }

  // Third person: pull the camera in until it sits inside the room (no seeing through walls).
  updateCamera(bob) {
    const cam = this.camera;
    this.head.set(this.feet.x, this.feet.y + EYE + bob, this.feet.z);
    cam.rotation.set(this.pitch, this.yaw, 0);
    cam.position.copy(this.head);
    if (!this.thirdPerson) return;
    _off.copy(CHASE).applyEuler(cam.rotation);
    for (let k = 1; k > 0.1; k -= 0.1) {
      _cam.copy(this.head).addScaledVector(_off, k);
      if (this.walkable.inside(_cam.x, _cam.z, 0.2) && _cam.y > 0.2 && _cam.y < ceilingAt(_cam.x, _cam.z) - 0.2) break;
    }
    cam.position.copy(_cam);
  }

  dispose() {
    this.avatar.dispose();
  }
}
