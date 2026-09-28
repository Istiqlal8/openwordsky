// Movement brains for Earth's animals. Every animal keeps to a home range (its herd's
// meadow, the dinosaur plains, a patch of desert, a stretch of sea), so the world has places
// worth travelling to. Each brain returns the animal's speed in m/s for the bone animator.
import * as THREE from 'three';
import { wrapAngle } from '../view/life/models/model-group.js';
import { actors } from '../life-sim/actors.js';

const SCARE = 24;

// Steps toward a.target; `ok` (optional) rejects steps into water and drops the target there.
export function walkTo(a, dt, speed, turnRate = 3, ok = null) {
  const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1.5) return 0;
  const v = Math.min(dist, speed * dt), nx = a.pos.x + (dx / dist) * v, nz = a.pos.z + (dz / dist) * v;
  if (ok && !ok(nx, nz)) { a.target.copy(a.pos); return 0; }
  a.pos.x = nx;
  a.pos.z = nz;
  a.root.rotation.y += wrapAngle(Math.atan2(-dz, dx) - a.root.rotation.y) * Math.min(1, dt * turnRate);
  return speed;
}

// Random point r0..r1 from `base` that passes `ok`, or null.
export function spotNear(rng, base, r0, r1, ok, tries = 8) {
  for (let i = 0; i < tries; i++) {
    const ang = rng.range(0, Math.PI * 2), r = rng.range(r0, r1);
    const x = base.x + Math.cos(ang) * r, z = base.z + Math.sin(ang) * r;
    if (ok(x, z)) return new THREE.Vector3(x, 0, z);
  }
  return null;
}

// Walks to a spot in the home range, pauses (grazing, looking around), picks another.
function roam(a, dt, speed, ok) {
  if (a.wait > 0) { a.wait -= dt; return 0; }
  const moved = walkTo(a, dt, speed, 2, ok);
  if (moved) return moved;
  a.wait = a.rng.range(2, 9);
  const home = a.herd?.home ?? a.home;
  const next = spotNear(a.rng, home, 0, a.range, ok);
  if (next) a.target.copy(next);
  return 0;
}

export function moveGrazer(a, dt, player, ok) {
  const herd = a.herd, d = Math.hypot(player.x - a.pos.x, player.z - a.pos.z);
  if (d < SCARE) herd.panic = 5;
  if (herd.panic > 0 && d < 90) {
    const k = 30 / Math.max(1, d);
    a.target.set(a.pos.x + (a.pos.x - player.x) * k, 0, a.pos.z + (a.pos.z - player.z) * k);
    if (!ok(a.target.x, a.target.z)) a.target.copy(herd.home);
    a.wait = 0;
    return walkTo(a, dt, a.spec.flee * a.scale, 5, ok);
  }
  return roam(a, dt, a.spec.speed * a.scale, ok);
}

// Hunters: roam until the player is in sight (and the landing grace period is over), then
// chase and bite; give up when dragged too far from home.
export function moveHunter(a, dt, player, ok, group) {
  const d = Math.hypot(player.x - a.pos.x, player.z - a.pos.z);
  const leash = a.pos.distanceTo(a.home) > a.range * 2.5;
  if (a.hostile && group.calm <= 0 && d < a.spec.sight && !leash && group.grounded(player)) {
    a.target.set(player.x, 0, player.z);
    a.wait = 0;
    a.biteCd -= dt;
    if (d < a.radius + 2.2 && a.biteCd <= 0) { a.biteCd = 1.4; group.onBite?.({ name: a.name }, a.spec.bite); }
    return walkTo(a, dt, a.spec.chase * a.scale, 4, ok);
  }
  if (a.fleeT > 0) return runOff(a, dt, ok);
  const npc = huntNpc(a, dt, ok, group, leash);
  if (npc >= 0) return npc;
  if (leash && a.wait <= 0) a.target.copy(a.home);
  return roam(a, dt, a.spec.speed * a.scale, ok);
}

// Hunters now and then go for a villager or explorer near their range (rationed by actors).
// Returns the speed, or -1 when not hunting an NPC.
function huntNpc(a, dt, ok, group, leash) {
  if (!a.npc) {
    if (leash || group.calm > 0 || (a.npcScan = (a.npcScan ?? a.seed * 5) - dt) > 0) return -1;
    a.npcScan = 2.5;
    a.npc = actors.claim(a, a.pos, Math.max(18, a.spec.sight * 0.7));
    if (!a.npc) return -1;
    a.att ??= { group, ref: a, name: a.name, pos: a.pos };
  }
  const t = a.npc, d = Math.hypot(t.pos.x - a.pos.x, t.pos.z - a.pos.z);
  if (!actors.holds(a, t) || d > a.spec.sight * 1.6) { actors.release(a); a.npc = null; a.npcScan = 25; return -1; }
  a.target.set(t.pos.x, 0, t.pos.z);
  a.wait = 0;
  a.biteCd -= dt;
  if (d < a.radius + 1.6 + t.radius && a.biteCd <= 0) { a.biteCd = 1.6; actors.bite(a.att, t, a.spec.bite * 0.6); }
  return walkTo(a, dt, a.spec.chase * a.scale * (d < 2.5 ? 0.3 : 1), 4, ok);
}

// Badly hurt by an NPC: give up the hunt and run from the shooter for a few seconds.
export function retreatHunter(a, from) {
  if (a.npc) actors.release(a);
  a.npc = null;
  a.npcScan = 30;
  a.fleeT = 6;
  const k = 30 / Math.max(1, Math.hypot(a.pos.x - from.x, a.pos.z - from.z));
  a.target.set(a.pos.x + (a.pos.x - from.x) * k, 0, a.pos.z + (a.pos.z - from.z) * k);
}

function runOff(a, dt, ok) {
  a.fleeT -= dt;
  return walkTo(a, dt, a.spec.chase * a.scale, 4, ok) || (a.fleeT = 0);
}

// Settlement animals: the owner (a rider) says where to go and how fast.
export function moveOwned(a, dt, ok) {
  const o = a.owner.drive(a, dt);
  a.target.set(o.x, 0, o.z);
  return o.speed > 0 ? walkTo(a, dt, o.speed, 3, ok) : 0;
}

// Whales cruise between deep-water spots, rising and sinking slowly near the surface.
export function moveSwimmer(a, dt, deep) {
  const moved = walkTo(a, dt, a.spec.speed, 0.6, deep);
  if (!moved) {
    const next = spotNear(a.rng, a.home, 0, a.range, deep);
    if (next) a.target.copy(next);
  }
  a.t += dt;
  return a.spec.speed;
}
