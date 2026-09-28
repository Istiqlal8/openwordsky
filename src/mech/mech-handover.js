// Handing the planet's ship back and forth with the mech. Three cases: the pilot was on foot next
// to a parked ship, the pilot was flying it, and the mech folding back either lands the ship or
// hands it over still airborne. Pure functions over the surface view; holds no state.
import * as THREE from 'three';

const _off = new THREE.Vector3();

// Take the ship out of atmospheric flight without landing it: the mech is what flies now.
export function stopFlight(s) {
  const f = s.flight;
  f.active = false;
  f.surfacing = false;
  f.speed = 0;
  f.depth = 0;
  f.velocity.set(0, 0, 0);
  f.trail?.dispose();
  f.trail = null;
}

// Folding back while still off the ground hands the ship back in flight instead of parking it.
// `lift` is measured so the chase camera ends up where the mech's shoulder camera was: swapping
// frames must not drop the viewpoint. `speed` carries the mech's momentum into the hull.
export const FLIGHT_CHASE_UP = 3.5;   // src/view/surface-flight.js CHASE.y
export const BOARD_LIFT = 2;          // ...and the nudge board() adds on top

export function launchShip(s, pos, heading, lift, speed = 0) {
  const g = s.landed.model.group;
  g.position.set(pos.x, pos.y + Math.max(1, lift), pos.z);
  g.rotation.set(0, heading, 0);
  g.scale.setScalar(1);
  g.visible = true;
  s.yaw = heading;
  s.pitch = 0;
  s.flight.board();
  s.flight.speed = speed;             // board() zeroes it; the mech was moving, so the ship is too
}

// Fold the mech back into a parked ship and step the pilot out beside it.
export function parkShip(s, pos, heading) {
  const g = s.landed.model.group;
  g.position.set(pos.x, pos.y, pos.z);
  g.rotation.y = heading;
  g.scale.setScalar(1);
  s.landed.setDown(s.h, s.planet);
  g.visible = true;
  if (s.props) {
    s.props.clearZone = { x: g.position.x, z: g.position.z, r: 9 };
    s.props.rebuild(s.center.x, s.center.z);
  }
  const side = _off.set(Math.cos(heading), 0, -Math.sin(heading)).multiplyScalar((s.landed.radius ?? 4) + 4);
  s.feet.set(pos.x + side.x, 0, pos.z + side.z);
  s.feet.y = s.floorAt(s.feet.x, s.feet.z);
  s.velY = 0;
  s.onGround = true;
  s.updateCamera(0);
}

// While the pilot is inside, the surface view behaves as if they were flying the ship:
// no mining beam, no hand weapon, no boarding prompt. Returns the new shadowed state.
export function shadowView(s, on, shadowed, isActive) {
  if (!s) return shadowed;
  const f = s.flight;
  if (on && !shadowed) {
    Object.defineProperty(s, 'flying', { configurable: true, get: () => f.active || isActive() });
    f.canBoard = () => false;
    return true;
  }
  if (!on && shadowed) {
    delete s.flying;
    delete f.canBoard;
    return false;
  }
  return shadowed;
}
