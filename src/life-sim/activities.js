// Villager activities beyond the basic walk/sit/work routine, plus the reaction to animal attacks.
// Each activity: (v, dt, ctx) -> pose name; v is a Villager, ctx its settlement context
// (ctx.life = VillageLife with chat pairs, the kids' tag game, riders and herders).
import * as THREE from 'three';
import { actors } from './actors.js';

const RUN = 3.6;
const _from = new THREE.Vector3();
const _to = new THREE.Vector3();

// Hand / ground points in front of a villager (for beams).
function handAndAhead(v, reach, drop) {
  const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
  _from.set(v.feet.x + fx * 0.55 + fz * 0.29, v.feet.y + 1.3, v.feet.z + fz * 0.55 - fx * 0.29);
  _to.set(v.feet.x + fx * reach, v.feet.y + drop, v.feet.z + fz * reach);
}

// Mining: at the work spot, aim a hot beam at the rock face with sparks.
function mine(v, dt, ctx) {
  const pose = v.roam(dt, ctx);
  if (pose !== 'aim' || v.vitals.active === false || (v.beamT = (v.beamT ?? 0) - dt) > 0) return pose;
  v.beamT = 0.12;
  handAndAhead(v, 3.2, 0.4);
  actors.bolts?.beam(_from, _to, 0xff7a3a, 0.05, 0.14);
  if (Math.random() < 0.3) actors.fx?.sparks(_to, 0xffb060, 3, 0.35);
  return pose;
}

// Scanning: sweep a thin cyan scanner line over the ground ahead.
function scan(v, dt, ctx) {
  const pose = v.roam(dt, ctx);
  if (pose !== 'scan' || !v.vitals.active || (v.beamT = (v.beamT ?? 0) - dt) > 0) return pose;
  v.beamT = 0.08;
  handAndAhead(v, 2.2 + Math.sin(v.t * 2) * 0.8, 0.05);
  actors.bolts?.beam(_from, _to, 0x5ff4ff, 0.02, 0.1);
  return pose;
}

// Chat pairs meet at a spot, face each other and take turns talking.
function chat(v, dt, ctx) {
  const p = v.pair;
  if (!p) return v.roam(dt, ctx);
  const side = v === p.a ? 1 : -1, x = p.spot.x + p.dx * 0.7 * side, z = p.spot.z + p.dz * 0.7 * side;
  if (!v.moveTo(x, z, 1.4, dt, 0.2)) return 'walk';
  const o = v === p.a ? p.b : p.a;
  v.turnTo(o.feet.x - v.feet.x, o.feet.z - v.feet.z, dt * 4);
  const turn = Math.floor(p.t / 3.2) % 2 === (v === p.a ? 0 : 1);
  return turn ? 'talk' : 'listen';
}

// Guards patrol a ring around the square and stop at each post, blaster in hand.
function guard(v, dt, ctx) {
  const n = 6, dir = v.seed % 2 ? 1 : -1;
  v.post ??= v.seed % n;
  if (v.pause > 0) { v.pause -= dt; return 'guard'; }
  const a = (v.post / n) * Math.PI * 2, r = ctx.life.patrolR;
  if (!v.moveTo(ctx.hub.x + Math.cos(a) * r, ctx.hub.z + Math.sin(a) * r, 1.3, dt, 0.4)) return 'walk';
  v.post = (v.post + dir + n) % n;
  v.pause = 2 + ctx.rand() * 3;
  v.turnTo(v.feet.x - ctx.hub.x, v.feet.z - ctx.hub.z, 1); // look outward
  return 'guard';
}

// Children's tag: "it" runs after the nearest kid; the others dodge when it comes close.
function play(v, dt, ctx) {
  const g = ctx.life.game;
  if (!g) return v.roam(dt, ctx);
  if (v === g.it) {
    if (g.freeze > 0) return 'cheer';
    const prey = ctx.life.nearestKid(v);
    if (!prey) return v.roam(dt, ctx);
    if (v.moveTo(prey.feet.x, prey.feet.z, 3.1, dt, 0.6)) { g.it = prey; g.freeze = 1.6; }
    return 'run';
  }
  const it = g.it, dx = v.feet.x - it.feet.x, dz = v.feet.z - it.feet.z, d = Math.hypot(dx, dz);
  const home = Math.hypot(v.feet.x - ctx.hub.x, v.feet.z - ctx.hub.z);
  if (d > 5 || g.freeze > 0 || home > 14) return v.roam(dt, ctx);
  v.moveTo(v.feet.x + dx / d * 3, v.feet.z + dz / d * 3, 2.8, dt);
  return 'run';
}

function ride(v, dt, ctx) { return ctx.life.riders.get(v)?.update(dt, ctx) ?? v.roam(dt, ctx); }
function herd(v, dt, ctx) { return ctx.life.herders.get(v)?.update(dt, ctx) ?? v.roam(dt, ctx); }

export const ACTIVITIES = { mine, scan, chat, guard, play, ride, herd };

// Under attack (vitals mode): fight, flee indoors, lie down, get up, cheer.
export function defend(v, mode, dt, ctx) {
  if (v.riding) ctx.life.riders.get(v)?.dismount();
  v.group.visible = !v.vitals.hidden;
  if (mode === 'down') return 'lie';
  if (mode === 'up') return 'kneel';
  if (mode === 'cheer') return 'cheer';
  if (mode === 'fight') return fight(v, dt);
  return flee(v, dt, ctx);
}

function fight(v, dt) {
  const t = v.vitals.target?.ref?.root?.position;
  if (!t) return 'idle';
  v.person.holdGun(true);
  const dx = t.x - v.feet.x, dz = t.z - v.feet.z;
  v.turnTo(dx, dz, dt * 8);
  if (Math.hypot(dx, dz) < 2.2 + (v.vitals.target.ref.radius ?? 0) * 0.3) { v.moveTo(v.feet.x - dx, v.feet.z - dz, 2, dt); return 'walk'; }
  v.vitals.shoot(v.kid ? 0.85 : 1.35);
  return 'aim';
}

// Run to the nearest door and wait inside until the danger has passed.
function flee(v, dt, ctx) {
  if (v.vitals.hidden) { v.group.visible = false; return 'idle'; }
  v.refuge ??= ctx.life.nearestDoor(v.feet);
  if (!v.refuge || v.moveTo(v.refuge.x, v.refuge.z, RUN, dt, 0.5)) {
    v.vitals.hidden = true;
    v.vitals.modeT = Math.max(v.vitals.modeT, 8);
    v.refuge = null;
    v.group.visible = false;
    return 'idle';
  }
  return 'run';
}
