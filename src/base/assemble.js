// Lays out every base structure in the world through one GeoKit; returns anchors for the live parts.
import { LAYOUT, faceCenter, groundRange, groundY, pathSegments } from './site.js';
import { buildPlaza, buildPaths, buildPad, addLightPool } from './ground.js';
import { buildHangar, HANGAR } from './hangar.js';
import { buildWorkshop, WORKSHOP } from './workshop.js';
import { buildHouse, buildWaterTower, buildSolarField, HOUSE } from './houses.js';
import { buildStore, buildTower, buildGate, buildLamp, buildFlagPole, STORE, TOWER_H } from './extras.js';

const LAMP_GAP = 6.5;

// World point of a building-local (dx, dz) offset for a building at (x, z) with yaw.
function offset(b, dx, dz) {
  const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
  return { x: b.x + dx * c + dz * s, z: b.z - dx * s + dz * c };
}

// Floor on the highest ground (and above water); sets the kit frame there.
function place(ctx, slot, face, r, door) {
  const { kit, frame, h, planet } = ctx, t = planet.terrain;
  const x = frame.x(slot.x, slot.z), z = frame.z(slot.x, slot.z);
  const { lo, hi } = groundRange(h, x, z, r);
  const floor = Math.max(hi, t.hasWater ? t.waterY + 0.4 : -Infinity) + 0.15;
  const b = { x, z, floor, depth: floor - lo, yaw: frame.yaw + face };
  b.door = door ? offset(b, door.x, door.z) : { x, z };
  b.drop = floor - groundY(h, planet, b.door.x, b.door.z);
  kit.at(x, floor, z, b.yaw);
  return b;
}

// Kit frame on the ground at a base-local point.
function onGround(ctx, lx, lz, face = 0) {
  const { kit, frame, h, planet } = ctx, x = frame.x(lx, lz), z = frame.z(lx, lz);
  const y = groundY(h, planet, x, z);
  kit.at(x, y, z, frame.yaw + face);
  return { x, y, z };
}

function buildings(ctx, out) {
  const L = LAYOUT;
  out.porches = []; // extra halo points: porch lamps, hangar ceiling
  out.pad = place(ctx, L.pad, 0, L.pad.r, null);
  buildPad(ctx.kit, out.pad.depth);
  out.hangar = place(ctx, L.hangar, L.hangar.face, L.hangar.r, HANGAR.door);
  buildHangar(ctx.kit, out.hangar.depth, out.hangar.drop);
  out.shipSpot = offset(out.hangar, HANGAR.shipSpot.x, HANGAR.shipSpot.z);
  for (const lz of HANGAR.lights) {
    const p = offset(out.hangar, 0, lz);
    out.porches.push(p.x, out.hangar.floor + HANGAR.lightY - 0.2, p.z);
  }
  out.workshop = place(ctx, L.workshop, L.workshop.face, L.workshop.r, WORKSHOP.door);
  buildWorkshop(ctx.kit, out.workshop.depth, out.workshop.drop);
  out.arm = offset(out.workshop, -1.2, -3.2);
  out.store = place(ctx, L.store, faceCenter(L.store.x, L.store.z), L.store.r, STORE.door);
  buildStore(ctx.kit, out.store.depth, out.store.drop);
  out.houses = L.houses.map((q, i) => {
    const b = place(ctx, q, faceCenter(q.x, q.z), HOUSE.r, HOUSE.door);
    buildHouse(ctx.kit, i, q.sign, b.depth, b.drop);
    const p = offset(b, 0, HOUSE.porch.z);
    out.porches.push(p.x, b.floor + HOUSE.porch.y, p.z);
    return { ...b, home: Boolean(q.home) };
  });
}

function landmarks(ctx, out) {
  const L = LAYOUT, { h } = ctx;
  for (const [slot, fn] of [[L.tower, buildTower], [L.waterTower, buildWaterTower], [L.solar, buildSolarField]]) {
    const x = ctx.frame.x(slot.x, slot.z), z = ctx.frame.z(slot.x, slot.z), { lo } = groundRange(h, x, z, slot.r);
    ctx.kit.at(x, lo, z, ctx.frame.yaw);
    fn(ctx.kit);
    if (slot === L.tower) out.beacon = { x, y: lo + TOWER_H + 2.8, z };
  }
  onGround(ctx, 0, 10.5);
  buildGate(ctx.kit);
  out.flag = onGround(ctx, -5, -4.5);
  buildFlagPole(ctx.kit);
  out.flag.yaw = ctx.frame.yaw;
}

// Lamp posts alternating sides along every path; returns lamp head positions.
function lamps(ctx) {
  const heads = [];
  for (const [ax, az, bx, bz] of pathSegments()) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.floor(len / LAMP_GAP));
    const nx = -(bz - az) / len, nz = (bx - ax) / len;
    for (let i = 1; i <= n; i++) {
      const f = (i - 0.5) / n, side = i % 2 ? 1.9 : -1.9;
      const lx = ax + (bx - ax) * f + nx * side, lz = az + (bz - az) * f + nz * side;
      const p = onGround(ctx, lx, lz);
      buildLamp(ctx.kit);
      addLightPool(ctx.kit, ctx, lx, lz);
      heads.push(p.x, p.y + 2.9, p.z);
    }
  }
  return heads;
}

// ctx: { kit, frame, h, planet } -> anchors { pad, hangar, workshop, store, houses, shipSpot, arm, beacon, flag, lampHeads }
export function assembleBase(ctx) {
  const out = {};
  buildPlaza(ctx.kit, ctx);
  buildPaths(ctx.kit, ctx);
  buildings(ctx, out);
  landmarks(ctx, out);
  out.lampHeads = lamps(ctx).concat(out.porches);
  return out;
}
