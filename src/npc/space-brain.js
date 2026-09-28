// NPC ship behaviour in space: a small state machine run once per frame per flight leader.
// States: cruise -> (pulse) -> approach -> landed -> depart -> cruise | spool -> gone; flyby.
import * as THREE from 'three';

const PULSE_SPEED = 2600;
const ORIGIN = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const rand = (a, b) => a + Math.random() * (b - a);

// Leader flash is shared by its wingmen (landing glow, warp flash).
export function flashFlight(npc, size, dur) {
  npc.flash(size, dur);
  for (const w of npc.wingmen) w.flash(size, dur);
}

export function enter(npc, state, timer = 0) {
  npc.state = state;
  npc.timer = timer;
}

// Random unit vector, flattened toward the orbit plane.
export function flatDir(out, rnd = Math.random, flat = 0.35) {
  const a = rnd() * Math.PI * 2;
  return out.set(Math.cos(a), (rnd() * 2 - 1) * flat, Math.sin(a)).normalize();
}

function pickTarget(npc, bodies) {
  if (!bodies.length) return null;
  let b = bodies[Math.floor(Math.random() * bodies.length)];
  if (b === npc.target && bodies.length > 1) b = bodies[(bodies.indexOf(b) + 1) % bodies.length];
  return b;
}

export function startCruise(npc, world) {
  npc.target = pickTarget(npc, world.bodies);
  enter(npc, npc.target ? 'cruise' : 'spool');
}

// Push `out` away from a sphere (center c, radius r) when inside its keep-out zone.
function repel(out, pos, c, r) {
  const away = tmpC.subVectors(pos, c);
  const d = away.length();
  const zone = r * 2 + 80;
  if (d >= zone || d < 1e-3) return;
  const k = ((zone - d) / (zone - r)) * 2.5 / d;
  out.addScaledVector(away, k);
  out.addScaledVector(away.cross(UP).normalize(), k * d * 0.5); // slide around, never stall head-on
  if (d < r * 1.05) pos.copy(c).addScaledVector(tmpC.subVectors(pos, c).normalize(), r * 1.05);
}

// Direction to steer: desired (unit) plus repulsion from every body but `ignore`, and the star.
function avoid(npc, world, desired, ignore) {
  const out = tmpB.copy(desired);
  const pos = npc.root.position;
  for (const b of world.bodies) if (b !== ignore) repel(out, pos, b.pos, b.radius);
  repel(out, pos, ORIGIN, world.starSize);
  return out.lengthSq() < 1e-6 ? out.copy(desired) : out.normalize();
}

function cruise(npc, world, dt) {
  const b = npc.target;
  const to = tmpA.subVectors(b.pos, npc.root.position);
  const d = to.length();
  if (d < b.radius * 2.2 + 60) {
    npc.landDir.copy(to).negate().normalize().addScaledVector(flatDir(tmpC), 0.3).normalize();
    return enter(npc, 'approach');
  }
  if (d > 6000 && npc.pulseCd <= 0 && Math.random() < dt * 0.15) return enter(npc, 'pulse', rand(2, 5));
  npc.fly(dt, avoid(npc, world, to.divideScalar(d), b), npc.cruise);
}

function pulse(npc, world, dt) {
  const b = npc.target;
  const to = tmpA.subVectors(b.pos, npc.root.position);
  const d = to.length();
  npc.pulsing = true;
  if (npc.timer <= 0 || d < b.radius * 6 + 1500) {
    npc.pulsing = false;
    npc.pulseCd = rand(15, 40);
    npc.speed = npc.cruise * 1.5;
    return enter(npc, 'cruise');
  }
  npc.fly(dt, avoid(npc, world, to.divideScalar(d), b), PULSE_SPEED, 2);
}

// Descend onto the surface point above landDir; vanish into the atmosphere with a small glow.
function approach(npc, world, dt) {
  const b = npc.target;
  const spot = tmpA.copy(b.pos).addScaledVector(npc.landDir, b.radius);
  const to = spot.sub(npc.root.position);
  const d = to.length();
  if (npc.root.position.distanceTo(b.pos) < b.radius * 1.05) {
    flashFlight(npc, 0.05, 0.9);
    npc.setVisible(false);
    return enter(npc, 'landed', rand(20, 60));
  }
  npc.fly(dt, to.divideScalar(Math.max(d, 1e-3)), THREE.MathUtils.clamp(d * 0.35, 40, npc.cruise), 1.6);
}

function landed(npc) {
  if (npc.timer > 0) return;
  const b = npc.target;
  npc.root.position.copy(b.pos).addScaledVector(npc.landDir, b.radius * 1.1);
  npc.face(npc.landDir);
  npc.speed = 30;
  npc.setVisible(true);
  flashFlight(npc, 0.04, 0.8);
  enter(npc, 'depart', rand(5, 9));
}

function depart(npc, world, dt) {
  npc.fly(dt, npc.landDir, npc.cruise * 0.6);
  if (npc.timer > 0) return;
  if (Math.random() < 0.18) return enter(npc, 'spool', 1.6);
  startCruise(npc, world);
}

// Short spool-up then a warp flash: the flight leaves the system.
function spool(npc, world, dt) {
  tmpA.set(0, 0, -1).applyQuaternion(npc.root.quaternion);
  npc.fly(dt, tmpA, 900, 2.5);
  if (npc.timer > 0) return;
  flashFlight(npc, 0.3, 0.7);
  npc.setVisible(false);
  enter(npc, 'gone', rand(15, 40));
}

// Fly past a waypoint (placed near the player), then carry on to a planet.
function flyby(npc, world, dt) {
  const to = tmpA.subVectors(npc.waypoint, npc.root.position);
  const d = to.length();
  const ahead = tmpC.set(0, 0, -1).applyQuaternion(npc.root.quaternion).dot(to) > 0;
  if (npc.timer <= 0 || d < 40 || (!ahead && d < 400)) return startCruise(npc, world);
  npc.fly(dt, avoid(npc, world, to.divideScalar(d), null), npc.cruise);
}

const STATES = { cruise, pulse, approach, landed, depart, spool, flyby, gone: () => {} };

export function think(npc, world, dt) {
  npc.timer -= dt;
  npc.pulseCd -= dt;
  STATES[npc.state](npc, world, dt);
}
