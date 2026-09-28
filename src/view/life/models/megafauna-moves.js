// Movement brains for the megafauna: skittish grazing herds, prowling giant lizards, circling birds.
// Each returns the animal's ground/air speed in m/s for the bone animator.
import { wrapAngle } from './model-group.js';

const SCARE = 22; // grazers bolt when the player gets this close
const LIZARD_SIGHT = 18;
const ROAM = 150;

// Steps toward a.target; a step that would enter water cancels the target (land animals stay dry).
function walkTo(a, dt, speed, turnRate = 3, dry = null) {
  const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1.5) return 0;
  const v = Math.min(dist, speed * dt);
  const nx = a.pos.x + (dx / dist) * v, nz = a.pos.z + (dz / dist) * v;
  if (dry && !dry(nx, nz)) { a.target.copy(a.pos); return 0; }
  a.pos.x = nx;
  a.pos.z = nz;
  a.root.rotation.y += wrapAngle(Math.atan2(-dz, dx) - a.root.rotation.y) * Math.min(1, dt * turnRate);
  return speed;
}

// Writes a random dry point r0..r1 from `base` into `out` (keeps `out` when none is found).
function wander(rng, out, base, r0, r1, dry) {
  for (let i = 0; i < 6; i++) {
    const ang = rng.range(0, Math.PI * 2), r = rng.range(r0, r1);
    const x = base.x + Math.cos(ang) * r, z = base.z + Math.sin(ang) * r;
    if (dry(x, z)) { out.set(x, 0, z); return; }
  }
}

export function moveGrazer(a, dt, player, dry) {
  const herd = a.herd;
  const d = Math.hypot(player.x - a.pos.x, player.z - a.pos.z);
  if (d < SCARE) herd.panic = 5;
  if (herd.panic > 0) {
    const k = 30 / Math.max(1, d);
    a.target.set(a.pos.x + (a.pos.x - player.x) * k, 0, a.pos.z + (a.pos.z - player.z) * k);
    herd.center.set(a.target.x, 0, a.target.z);
    return walkTo(a, dt, a.type.flee * a.scale, 5, dry);
  }
  if (herd.center.distanceTo(player) > ROAM) wander(a.rng, herd.center, player, 50, 90, dry);
  const moved = walkTo(a, dt, a.type.speed * a.scale, 3, dry);
  if (!moved && a.rng.next() < dt * 0.3) wander(a.rng, a.target, herd.center, 2, 12, dry);
  return moved;
}

export function moveLizard(a, dt, player, dry, group) {
  const d = Math.hypot(player.x - a.pos.x, player.z - a.pos.z);
  const hunting = a.hostile && group.calm <= 0 && d < LIZARD_SIGHT;
  if (hunting) {
    a.target.set(player.x, 0, player.z);
    a.biteCd -= dt;
    if (d < a.radius + 2 && a.biteCd <= 0) { a.biteCd = 1.5; group.onBite?.({ name: a.name }, 6 + a.height * 3); }
    return walkTo(a, dt, a.type.chase * a.scale, 4, dry);
  }
  const moved = walkTo(a, dt, a.type.speed * a.scale, 1.5, dry);
  if (!moved && a.rng.next() < dt * 0.15) wander(a.rng, a.target, a.pos.distanceTo(player) > ROAM ? player : a.pos, 6, 25, dry);
  return moved;
}

// Birds circle their flock center high above the terrain, banking into the turn.
export function moveBird(a, dt, player, heightFn) {
  const c = a.flock.center;
  const dx = player.x - c.x, dz = player.z - c.z, far = Math.hypot(dx, dz);
  if (far > 90) { c.x += (dx / far) * 6 * dt; c.z += (dz / far) * 6 * dt; }
  a.angle += (a.type.speed / a.orbit) * dt * a.dir;
  a.pos.x = c.x + Math.cos(a.angle) * a.orbit;
  a.pos.z = c.z + Math.sin(a.angle) * a.orbit;
  const ground = Math.max(heightFn(a.pos.x, a.pos.z), a.waterY);
  a.pos.y += (ground + a.altitude + Math.sin(a.angle * 2) * 4 - a.pos.y) * Math.min(1, dt);
  const hx = -Math.sin(a.angle) * a.dir, hz = Math.cos(a.angle) * a.dir;
  a.root.rotation.y = Math.atan2(-hz, hx);
  a.root.rotation.x = 0.35 * a.dir;
  return a.type.speed;
}
