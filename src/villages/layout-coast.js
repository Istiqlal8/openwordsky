// Fishing village layout: local -Z faces the sea. Street along the shore, two rows of houses, piers and boats.
import { shoreZ, buildPier, beachedBoat, dryingRack, BOAT_COLORS } from './coast.js';
import { buildBench } from './town.js';
import { newLayout, placeHouse, entranceBoard } from './layout-common.js';

const SAND = 0xd8c89a, STREET = 0xbdb5a3;

export function layoutFishing(b, rng, signKey) {
  const out = newLayout(b, 5);
  out.hub = b.world(0, 6);
  b.disc(0, 6, 5, SAND, 0.1);
  b.strip(-30, 6, 30, 6, 2.6, STREET);
  houseRows(b, rng, out);
  piers(b, rng, out);
  for (const x of [-18, 18]) dryingRack(b, x, 2, 0);
  for (const x of [-26, -6, 14, 28]) b.lamp(x, 8.2);
  for (const x of [-4, 4]) out.seats.push(buildBench(b, x, 2.6, 0));
  out.beacon = lighthouse(b, rng, out);
  entranceBoard(b, signKey, 33, 9, Math.PI / 2);
  return out;
}

// Row A faces the sea just behind the street; row B sits higher up, offset between them.
function houseRows(b, rng, out) {
  for (let i = 0; i < 5; i++) {
    const d = placeHouse(b, rng, out, -24 + i * 12 + rng.range(-1, 1), 14 + rng.range(0, 2), Math.PI);
    b.strip(d.x, d.z, d.x, 6, 1.6, STREET);
  }
  for (let i = 0; i < 3 + rng.int(2); i++) {
    const d = placeHouse(b, rng, out, -18 + i * 12 + rng.range(-1, 1), 28 + rng.range(0, 3), Math.PI);
    b.strip(d.x, d.z, d.x - 6, 6, 1.4, STREET);
  }
}

// Two piers where the shore allows, boats moored beside them and a few on the beach.
function piers(b, rng, out) {
  for (const lx of [-11, 11]) {
    const zs = shoreZ(b, lx, 2);
    if (zs === null) continue;
    const pier = buildPier(b, lx, zs, 16 + rng.int(8));
    out.fish.push({ ...pier.end, y: pier.deck + 0.08, yaw: b.frame.yaw });
    out.work.push(b.world(lx, zs + 1));
    const t = b.planet.terrain;
    out.movers.push({ kind: 'boat', at: { ...pier.side, y: t.waterY - 0.05, yaw: b.frame.yaw + rng.range(-0.3, 0.3) },
      opt: { hex: rng.pick(BOAT_COLORS) } });
  }
  for (const lx of [-20, 22]) {
    const zs = shoreZ(b, lx, 2, 30);
    if (zs !== null && zs < -3) beachedBoat(b, lx, zs + 2.5, Math.PI / 2 + rng.range(-0.4, 0.4), rng.pick(BOAT_COLORS));
  }
}

// Striped light tower on the shore; returns its beacon point.
function lighthouse(b, rng, out) {
  const p = b.place(-34, 4, 0, 2.6, { x: 0, z: 3 }), kit = b.kit;
  kit.cyl('hull', 0x8d8375, 2.6, 2.6, 0.4 + p.depth, 10, 0, -p.depth - 0.2, 0);
  for (let i = 0; i < 5; i++) kit.cyl('hull', i % 2 ? 0xe0463a : 0xf4f4f0, 1.8 - i * 0.15, 1.95 - i * 0.15, 2.4, 10, 0, i * 2.4, 0);
  kit.cyl('glow', 0xffe0a0, 1, 1, 1.4, 8, 0, 12, 0);
  kit.cyl('hull', 0x3b424c, 0.3, 1.3, 0.8, 8, 0, 13.4, 0);
  kit.box('hull', 0x6b4630, 1, 2, 0.1, 0, 1, 1.85);
  out.work.push(p.door);
  return { x: p.x, y: p.floor + 12.7, z: p.z };
}
