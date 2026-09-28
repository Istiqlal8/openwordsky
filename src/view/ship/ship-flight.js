// Space flight model for the player ship: steering, thrust, speed caps, collisions.
import * as THREE from 'three';

export const BASE_SPEED = 60;
export const BOOST_SPEED = 320;
export const PULSE_SPEED = 1600;
const LOOK_SENS = 0.0022;
const ROLL_RATE = 1.3;
const AX = new THREE.Vector3(1, 0, 0);
const AY = new THREE.Vector3(0, 1, 0);
const AZ = new THREE.Vector3(0, 0, 1);
const ORIGIN = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

// Mouse yaw/pitch plus Z/X roll, scaled by the ship's agility stat.
export function steer(q, dt, input, agility = 1) {
  if (input.locked) {
    q.multiply(tmpQ.setFromAxisAngle(AY, -input.mouse.dx * LOOK_SENS));
    q.multiply(tmpQ.setFromAxisAngle(AX, -input.mouse.dy * LOOK_SENS));
  }
  const roll = (input.down('KeyZ') ? 1 : 0) - (input.down('KeyX') ? 1 : 0);
  if (roll) q.multiply(tmpQ.setFromAxisAngle(AZ, roll * ROLL_RATE * agility * dt));
  q.normalize();
}

// Ease velocity toward the input direction; returns forward throttle 0..1 for the engine glow.
// With `pulse` the ship always drives forward (auto-throttle), steering still works.
export function thrust(q, velocity, dt, input, cap, pulse = false) {
  const axis = (a, b) => (input.down(a) ? 1 : 0) - (input.down(b) ? 1 : 0);
  const target = tmpA.set(axis('KeyD', 'KeyA'), axis('KeyR', 'KeyC'), pulse ? -1 : axis('KeyS', 'KeyW'));
  const forward = Math.max(0, -target.z);
  const thrusting = target.lengthSq() > 0;
  if (thrusting) target.normalize().applyQuaternion(q).multiplyScalar(cap);
  velocity.lerp(target, 1 - Math.exp(-(thrusting ? 1.6 : 0.7) * dt));
  const len = velocity.length();
  if (len > cap) velocity.setLength(cap + (len - cap) * Math.exp(-4 * dt));
  return thrusting ? Math.max(forward, 0.35) : 0;
}

// Slow down near any surface so boosting never overshoots a planet.
export function speedCap(pos, bodies, starSize, boost, speedMul = 1, pulse = false) {
  let cap = (pulse ? PULSE_SPEED : boost ? BOOST_SPEED : BASE_SPEED) * speedMul;
  cap = Math.min(cap, 10 + (pos.length() - starSize) * 2.5);
  for (const b of bodies) cap = Math.min(cap, 5 + (pos.distanceTo(b.pos) - b.radius) * 2.5);
  return Math.max(cap, 4);
}

export function collide(pos, velocity, bodies, starSize) {
  for (const b of bodies) pushOut(pos, velocity, b.pos, b.radius * 1.15);
  pushOut(pos, velocity, ORIGIN, starSize * 1.3);
}

function pushOut(pos, velocity, center, minDist) {
  const n = tmpB.subVectors(pos, center);
  const len = n.length();
  if (len >= minDist || len === 0) return;
  n.divideScalar(len);
  pos.copy(center).addScaledVector(n, minDist);
  const vn = velocity.dot(n);
  if (vn < 0) velocity.addScaledVector(n, -vn);
}
