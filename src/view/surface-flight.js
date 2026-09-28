// Atmospheric flight on a planet surface with the player's own (landed) ship.
import * as THREE from 'three';

const CRUISE = 90, BOOST = 240, CLIMB = 25;
const CLEARANCE = 3;          // minimum height above ground/water
const BOARD_RANGE = 14;       // how close the player must be to board
const EXIT_ALTITUDE = 8;      // max altitude to step out
export const SPACE_ALTITUDE = 600; // climbing above this leaves the planet
const CHASE = new THREE.Vector3(0, 3.5, 15);
const _dir = new THREE.Vector3(), _off = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YXZ');

export class SurfaceFlight {
  constructor(view) {
    this.view = view;
    this.active = false;
    this.speed = 0;
    this.bank = 0;
    this.altitude = 0;
  }

  canBoard() {
    const ship = this.view.shipPosition;
    return Boolean(ship) && ship.distanceTo(this.view.feet) < BOARD_RANGE;
  }

  get canExit() { return this.active && this.altitude < EXIT_ALTITUDE; }

  board() {
    const v = this.view, g = v.landed.model.group;
    this.active = true;
    this.speed = 0;
    v.yaw = g.rotation.y;
    v.pitch = 0;
    g.position.y += 2;
    v.landed.model.setLegs(false);
  }

  // Land where we hover and step out beside the ship.
  exit() {
    const v = this.view, g = v.landed.model.group;
    v.landed.setDown(v.h, v.planet);
    const side = _off.set(Math.cos(v.yaw), 0, -Math.sin(v.yaw)).multiplyScalar(v.landed.radius + 3);
    v.feet.set(g.position.x + side.x, 0, g.position.z + side.z);
    v.feet.y = v.floorAt(v.feet.x, v.feet.z);
    v.velY = 0;
    this.active = false;
    v.props.clearZone = { x: g.position.x, z: g.position.z, r: 9 };
    v.props.rebuild(v.center.x, v.center.z);
  }

  update(dt, input) {
    const v = this.view, g = v.landed.model.group;
    v.look(input);
    v.pitch = Math.max(-1.1, Math.min(1.1, v.pitch));
    const target = input.down('KeyW') ? (input.down('ShiftLeft') ? BOOST : CRUISE) : input.down('KeyS') ? 0 : this.speed * 0.98;
    this.speed += (target - this.speed) * (1 - Math.exp(-1.4 * dt));
    _dir.set(-Math.sin(v.yaw) * Math.cos(v.pitch), Math.sin(v.pitch), -Math.cos(v.yaw) * Math.cos(v.pitch));
    g.position.addScaledVector(_dir, this.speed * dt);
    const lift = (input.down('Space') || input.down('KeyR') ? 1 : 0) - (input.down('KeyC') ? 1 : 0);
    g.position.y += lift * CLIMB * dt;
    const ground = v.floorAt(g.position.x, g.position.z);
    g.position.y = Math.max(g.position.y, ground + CLEARANCE);
    this.altitude = g.position.y - ground;
    this.bank += (THREE.MathUtils.clamp(-input.mouse.dx * 0.03, -0.7, 0.7) - this.bank) * (1 - Math.exp(-4 * dt));
    g.rotation.set(v.pitch, v.yaw, this.bank, 'YXZ');
    v.landed.model.setThrust(this.speed / BOOST);
    v.feet.copy(g.position);
    v.head.copy(g.position);
    this.placeCamera();
  }

  placeCamera() {
    const v = this.view, cam = v.camera, g = v.landed.model.group;
    _e.set(v.pitch * 0.6, v.yaw, 0);
    cam.rotation.copy(_e);
    cam.position.copy(g.position).add(_off.copy(CHASE).applyEuler(_e));
    cam.position.y = Math.max(cam.position.y, v.floorAt(cam.position.x, cam.position.z) + 1);
  }
}
