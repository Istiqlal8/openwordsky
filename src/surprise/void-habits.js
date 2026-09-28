// One habit per void creature, so meeting a kraken is not the same as meeting a whale. Each is a
// single behaviour applied on top of the shared drifting and retaliation in void-fauna.js:
//
//   voidwhale  peaceful — shot at, it sounds a note and swims away out of the system for good
//   kraken     reels the ship in with its tentacles once you are inside its reach
//   hivequeen  keeps a brood of young that swarm whoever provokes her
//   guardian   dormant until provoked, then it leaves its orbit and hunts you across the system
//   starleech  feeds on the star, and its wake drains the ship's energy for as long as you linger
import * as THREE from 'three';

const PULL_REACH = 3.2; // kraken: multiples of its solid core
const PULL_FORCE = 170; // velocity per second added toward the beak; the flight damping eats most of it
const FLEE_SPEED = 260; // whale
const FLEE_FADE = 14; // seconds from bolt to gone
const HUNT_SPEED = 110; // guardian
const HUNT_REACH = 5000;
const DRAIN_REACH = 4.5; // starleech: multiples of its core
const DRAIN_RATE = 9; // ship energy per second
const _a = new THREE.Vector3();

// ctx: { space, player, shipPos, aggro, brood, onNotice }
export function applyHabit(b, dt, ctx) {
  const habit = HABITS[b.kind];
  if (habit) habit(b, dt, ctx);
}

// Peaceful: it does not fight, it leaves. Once it has gone the system is empty for good.
function whale(b, dt, ctx) {
  if (b.hp >= b.maxHp) return; // never touched: it just drifts
  b.flee = (b.flee ?? 0) + dt;
  if (b.flee === dt) {
    ctx.onNotice?.(`${b.name} melarikan diri`);
    if (b.mat) b.mat.transparent = true; // only now: transparency is not free
  }
  b.group.position.addScaledVector(_a.set(Math.cos(b.angle), 0.15, Math.sin(b.angle)), FLEE_SPEED * dt);
  const k = Math.max(0, 1 - b.flee / FLEE_FADE);
  if (b.mat) b.mat.opacity = k;
  if (b.flee < FLEE_FADE) return;
  b.group.visible = false;
  b.hitR = 0; // no longer solid, no longer a target
  if (b.hit) b.hit[0].alive = false;
}

// Tentacles: inside its reach the ship is dragged toward the beak, harder the closer you get.
function kraken(b, dt, ctx) {
  if (!ctx.shipPos) return;
  const reach = b.hitR * PULL_REACH;
  const d = _a.subVectors(b.at, ctx.shipPos).length();
  if (d > reach || d < 0.001) return;
  const k = 1 - d / reach;
  ctx.space.velocity?.addScaledVector(_a.divideScalar(d), PULL_FORCE * k * dt);
  if (!b.pulled && k > 0.25) { b.pulled = true; ctx.onNotice?.(`${b.name} menarikmu`); }
}

// The queen herself does nothing new; her brood is the behaviour (see void-brood.js).
function hivequeen(b, dt, ctx) {
  ctx.brood?.update(dt, ctx.shipPos, ctx.aggro);
}

// Dormant guard: it holds its orbit until shot, then it comes after you and does not stop.
function guardian(b, dt, ctx) {
  if (ctx.aggro <= 0 && b.hp >= b.maxHp) return;
  if (!ctx.shipPos) return;
  b.hunting = true;
  const d = _a.subVectors(ctx.shipPos, b.at).length();
  if (d > HUNT_REACH || d < b.hitR * 1.5) return;
  b.group.position.addScaledVector(_a.divideScalar(d), HUNT_SPEED * dt);
}

// Its feeding wake eats the ship's power: no explosion, just a slow, quiet problem.
function starleech(b, dt, ctx) {
  if (!ctx.shipPos || !ctx.player) return;
  const d = ctx.shipPos.distanceTo(b.at);
  if (d > b.hitR * DRAIN_REACH) return;
  const ship = ctx.player.ship;
  if (ship.energy <= 0) return;
  ship.energy = Math.max(0, ship.energy - DRAIN_RATE * dt);
  if (!b.drained) { b.drained = true; ctx.onNotice?.(`${b.name} menyedot daya kapalmu`); }
}

const HABITS = { voidwhale: whale, kraken, hivequeen, guardian, starleech };

// Which kinds need a brood built for them.
export function hasBrood(kind) {
  return kind === 'hivequeen';
}

// A fled whale is no longer in the system: the HUD should stop pointing at it.
export function stillPresent(b) {
  return !b || b.group.visible !== false;
}
