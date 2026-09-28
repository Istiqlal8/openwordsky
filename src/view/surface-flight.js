// Atmospheric flight on a planet surface with the player's own (landed) ship. On worlds with
// water the ship is amphibious: fly it into the sea and it keeps going as a submersible
// (slower, heavy drag, buoyant, bubbles) until it climbs back out.
import * as THREE from 'three';
import { BubbleTrail } from '../ocean/sub-fx.js';

const CRUISE = 90, BOOST = 240, CLIMB = 25;
const SEA_CRUISE = 26, SEA_BOOST = 55, SEA_CLIMB = 10; // submerged: the water holds the ship back
const DRAG = 0.55, BUOYANCY = 0.5, SPLASH = 0.45;       // coast decay/s, idle rise, entry speed loss
const CLEARANCE = 3;          // minimum height above ground/water
const SEA_CLEARANCE = 1.6;    // minimum height above the sea floor
const BOARD_RANGE = 14;       // how close the player must be to board
const EXIT_ALTITUDE = 8;      // max altitude to step out
export const SPACE_ALTITUDE = 600; // climbing above this leaves the planet
const CHASE = new THREE.Vector3(0, 3.5, 15);
const _dir = new THREE.Vector3(), _off = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _wake = new THREE.Vector3();

export class SurfaceFlight {
  constructor(view) {
    this.view = view;
    this.active = false;
    this.speed = 0;
    this.bank = 0;
    this.altitude = 0;
    this.depth = 0;
    this.surfacing = false;
    this.trail = null;
    this.velocity = new THREE.Vector3(); // world velocity (ship guns add it to their shots)
  }

  canBoard() {
    const ship = this.view.shipPosition;
    return Boolean(ship) && ship.distanceTo(this.view.feet) < BOARD_RANGE;
  }

  get canExit() { return this.active && this.altitude < EXIT_ALTITUDE && this.depth <= 0.5; }

  // Sea level on a world the ship can dive into (water, never lava), else null.
  get waterY() { return this.view.swim ? this.view.swim.waterY : null; }
  get submerged() { return this.depth > 0.5; }

  board() {
    const v = this.view, g = v.landed.model.group;
    this.active = true;
    this.surfacing = false;
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
    this.surfacing = false;
    this.depth = 0;
    this.velocity.set(0, 0, 0);
    this.trail?.dispose();
    this.trail = null;
    v.props.clearZone = { x: g.position.x, z: g.position.z, r: 9 };
    v.props.rebuild(v.center.x, v.center.z);
  }

  update(dt, input) {
    const v = this.view, g = v.landed.model.group, wet = this.submerged;
    v.look(input);
    v.pitch = Math.max(-1.1, Math.min(1.1, v.pitch));
    this.thrust(dt, input, wet);
    _dir.set(-Math.sin(v.yaw) * Math.cos(v.pitch), Math.sin(v.pitch), -Math.cos(v.yaw) * Math.cos(v.pitch));
    g.position.addScaledVector(_dir, this.speed * dt);
    const lift = this.lift(dt, input, wet);
    g.position.y += lift * dt;
    this.velocity.copy(_dir).multiplyScalar(this.speed).y += lift;
    this.clampY(g);
    this.bank += (THREE.MathUtils.clamp(-input.mouse.dx * 0.03, -0.7, 0.7) - this.bank) * (1 - Math.exp(-4 * dt));
    g.rotation.set(v.pitch, v.yaw, this.bank, 'YXZ');
    v.landed.model.setThrust(this.speed / (wet ? SEA_BOOST : BOOST));
    v.feet.copy(g.position);
    v.head.copy(g.position);
    this.wake(dt, g);
    this.placeCamera();
  }

  // Throttle: the sea caps the top speed and eats momentum much faster than air.
  thrust(dt, input, wet) {
    const max = wet ? SEA_CRUISE : CRUISE, boost = wet ? SEA_BOOST : BOOST;
    const coast = wet ? this.speed * (1 - DRAG * dt) : this.speed * 0.98;
    const target = input.down('KeyW') ? (input.down('ShiftLeft') ? boost : max) : input.down('KeyS') ? 0 : coast;
    this.speed += (target - this.speed) * (1 - Math.exp(-(wet ? 2.2 : 1.4) * dt));
  }

  // Vertical speed. Submerged the ship floats up on its own; E while deep surfaces it first.
  lift(dt, input, wet) {
    const up = input.down('Space') || input.down('KeyR') ? 1 : 0, down = input.down('KeyC') ? 1 : 0;
    if (!wet) { this.surfacing = false; return (up - down) * CLIMB; }
    if (this.surfacing) return SEA_CLIMB;
    if (up || down) return (up - down) * SEA_CLIMB;
    return Math.min(BUOYANCY, this.depth * 0.6); // idle: drift back toward the surface
  }

  // The ground is solid, the sea is not: over water the ship may sink to the sea floor.
  // Breaking the surface either way costs speed (splash and drag).
  clampY(g) {
    const v = this.view, wy = this.waterY, ground = v.h(g.position.x, g.position.z);
    const overSea = wy !== null && wy > ground + 0.5;
    const min = ground + (overSea ? SEA_CLEARANCE : CLEARANCE);
    if (g.position.y < min) {
      g.position.y = min;
      if (this.velocity.y < -4) this.speed *= 0.8; // gentle bump when driven into the bottom
    }
    const wasWet = this.submerged;
    this.depth = overSea ? Math.max(0, wy - g.position.y) : 0;
    if (this.submerged !== wasWet) this.speed *= SPLASH;
    this.altitude = g.position.y - (overSea ? Math.max(wy, ground) : ground);
    if (this.depth <= 0.5) this.surfacing = false;
  }

  // Bubbles stream off the hull while it is under water.
  wake(dt, g) {
    if (!this.submerged) { this.trail?.update(dt, g.position, 0); return; }
    this.trail ??= new BubbleTrail(this.view.scene, this.waterY);
    _wake.copy(g.position).addScaledVector(_dir, -(this.view.landed.radius ?? 3));
    this.trail.update(dt, _wake, 6 + Math.min(20, this.speed));
  }

  placeCamera() {
    const v = this.view, cam = v.camera, g = v.landed.model.group;
    _e.set(v.pitch * 0.6, v.yaw, 0);
    cam.rotation.copy(_e);
    cam.position.copy(g.position).add(_off.copy(CHASE).applyEuler(_e));
    // Underwater the sea floor is the limit, not the "never sink" wading floor.
    const floor = this.submerged ? v.h(cam.position.x, cam.position.z) : v.floorAt(cam.position.x, cam.position.z);
    cam.position.y = Math.max(cam.position.y, floor + 1);
    const wy = this.waterY; // don't let the camera sit exactly on the water plane (z-flicker)
    if (this.submerged && wy !== null && cam.position.y > wy - 0.3) cam.position.y = wy - 0.3;
  }

  // E while deep: rise to the surface first, then the player can step out.
  requestSurface() {
    if (!this.submerged) return false;
    this.surfacing = true;
    return true;
  }

  dispose() {
    this.trail?.dispose();
    this.trail = null;
  }
}
