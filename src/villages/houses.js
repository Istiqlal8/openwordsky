// Earth buildings: gable-roofed houses, two-storey shops and the big barn (kit frame at the floor, front +Z).
import * as THREE from 'three';
import { foundation, stairs } from '../base/ground.js';
import { addSign } from './signs.js';

const WALLS = [0xf1e3c6, 0xe8d5b0, 0xd9e2e8, 0xf0d0c0, 0xcfe0c4, 0xfafafa, 0xe6c79c, 0xbfd6e6];
const ROOFS = [0xb5482e, 0x8a3b2a, 0x5a6a7a, 0x3f6f4a, 0x9a5a2a, 0x6b4a8a, 0xc0643f];
const WARM = 0xffd08a, WOOD = 0x6b4630, BRICK = 0x8a4a3a;

// Triangular prism: base width d (along Z), height h, length w (along X); base at y = 0.
export function prism(w, d, h) {
  const x = w / 2, z = d / 2;
  const v = [[-x, 0, -z], [-x, 0, z], [-x, h, 0], [x, 0, -z], [x, 0, z], [x, h, 0]];
  const tris = [[0, 1, 2], [3, 5, 4], [1, 4, 5], [1, 5, 2], [0, 2, 5], [0, 5, 3], [0, 3, 4], [0, 4, 1]];
  const pos = new Float32Array(tris.flatMap((t) => t.flatMap((i) => v[i])));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

// Random house look: size, colours, chimney, porch.
export function houseStyle(rng, big = false) {
  return {
    w: rng.range(5, 7) + (big ? 2 : 0), d: rng.range(4.4, 5.8), h: rng.range(2.6, 3.2), pitch: rng.range(1.4, 2.3),
    wall: rng.pick(WALLS), roof: rng.pick(ROOFS), chimney: rng.chance(0.6), porch: rng.chance(0.5),
  };
}

function windows(kit, s) {
  const y = s.h * 0.58;
  for (const side of [-1, 1]) {
    kit.box('glow', WARM, 0.9, 0.8, 0.08, side * s.w * 0.3, y, s.d / 2 + 0.03);
    kit.box('glow', WARM, 0.9, 0.8, 0.08, side * s.w * 0.25, y, -s.d / 2 - 0.03);
    kit.box('glow', WARM, 0.08, 0.8, 0.9, side * (s.w / 2 + 0.03), y, 0);
    kit.box('hull', 0xffffff, 1.1, 0.1, 0.16, side * s.w * 0.3, y - 0.45, s.d / 2 + 0.05); // sill
  }
}

// Returns { door, chimney } in model-local coords (chimney null when absent).
export function buildHouse(kit, s, depth, drop) {
  foundation(kit, { w: s.w + 0.4, d: s.d + 0.4 }, depth, 0x8d8375);
  kit.box('hull', s.wall, s.w, s.h, s.d, 0, s.h / 2, 0);
  kit.add('hull', prism(s.w + 0.7, s.d + 0.9, s.pitch), s.roof, 0, s.h, 0);
  windows(kit, s);
  kit.box('hull', WOOD, 1, 2, 0.1, 0, 1, s.d / 2 + 0.03);
  kit.box('lamp', WARM, 0.22, 0.22, 0.12, 0.8, 2.25, s.d / 2 + 0.08);
  if (s.porch) {
    kit.box('hull', 0x9a6b43, 2.6, 0.12, 1.6, 0, s.h - 0.35, s.d / 2 + 0.8);
    for (const x of [-1.2, 1.2]) kit.box('hull', 0x9a6b43, 0.14, s.h - 0.35, 0.14, x, (s.h - 0.35) / 2, s.d / 2 + 1.5);
  }
  stairs(kit, drop, 1.4, s.d / 2 + (s.porch ? 1.7 : 0.3));
  let chimney = null;
  if (s.chimney) {
    const cx = s.w * 0.28, cz = -s.d * 0.15, top = s.h + s.pitch * 0.9;
    kit.box('hull', BRICK, 0.55, top - s.h + 0.6, 0.55, cx, (top + s.h) / 2 - 0.3 + 0.3, cz);
    chimney = { x: cx, y: top + 0.6, z: cz };
  }
  return { door: { x: 0, z: s.d / 2 + (s.porch ? 2.2 : 1.2) }, chimney };
}

// Two-storey shop with a flat roof, striped awning and a sign board.
export function buildShop(kit, rng, sign, depth, drop) {
  const w = rng.range(6, 8), d = 6, h = rng.range(5.2, 6.6), wall = rng.pick(WALLS), stripe = rng.pick([0xe0463a, 0x3f8fd0, 0x3fb06a, 0xf0a030]);
  foundation(kit, { w: w + 0.4, d: d + 0.4 }, depth, 0x8d8375);
  kit.box('hull', wall, w, h, d, 0, h / 2, 0);
  kit.box('hull', 0x7a7064, w + 0.4, 0.4, d + 0.4, 0, h + 0.2, 0);
  kit.box('glow', WARM, w * 0.7, 1.7, 0.08, 0, 1.4, d / 2 + 0.03);
  for (const x of [-w * 0.3, 0, w * 0.3]) kit.box('glow', WARM, 0.9, 0.9, 0.08, x, h * 0.72, d / 2 + 0.03);
  for (let i = 0; i < 6; i++) {
    kit.add('hull', new THREE.BoxGeometry(w / 6, 0.07, 1.6), i % 2 ? 0xffffff : stripe, -w / 2 + (i + 0.5) * (w / 6), 2.7, d / 2 + 0.75, [0.3, 0, 0]);
  }
  kit.box('hull', 0x1b2230, 3.4, 0.9, 0.08, 0, h * 0.5 + 0.9, d / 2 + 0.03);
  addSign(kit, sign, 3.2, 0, h * 0.5 + 0.9, d / 2 + 0.09);
  stairs(kit, drop, 2, d / 2 + 0.3);
  return { door: { x: 0, z: d / 2 + 1.3 }, w, d };
}

// Big red barn with white trim and a hay loft door.
export function buildBarn(kit, depth, drop) {
  const w = 10, d = 8, h = 4.2;
  foundation(kit, { w: w + 0.4, d: d + 0.4 }, depth, 0x8d8375);
  kit.box('hull', 0xa8322a, w, h, d, 0, h / 2, 0);
  kit.add('hull', prism(w + 0.8, d + 1, 3), 0x4a3a34, 0, h, 0);
  kit.box('hull', 0x5a2a22, 3.2, 3.2, 0.1, 0, 1.6, d / 2 + 0.03);
  for (const [a, b] of [[[-1.6, 0], [1.6, 3.2]], [[1.6, 0], [-1.6, 3.2]]]) {
    kit.beam('hull', 0xffffff, [a[0], a[1] + 0.05, d / 2 + 0.1], [b[0], b[1], d / 2 + 0.1], 0.07, 4);
  }
  kit.box('glow', WARM, 1.2, 1, 0.08, 0, h + 1, d / 2 + 0.3);
  stairs(kit, drop, 3.2, d / 2 + 0.3);
  return { door: { x: 0, z: d / 2 + 1.4 } };
}

// Garden bed with flowers beside a house (model-local, at floor level).
export function flowerBed(kit, x, z) {
  kit.box('hull', 0x5b4330, 2.2, 0.3, 1.2, x, 0.15, z);
  const colors = [0xf2c14e, 0xe55d87, 0xffffff, 0xb07cf0, 0xff7a3a];
  for (let i = 0; i < 6; i++) {
    kit.add('hull', new THREE.IcosahedronGeometry(i % 2 ? 0.3 : 0.17, 0), i % 2 ? 0x3f7f2e : colors[i % 5],
      x - 0.7 + (i % 3) * 0.7, 0.5, z - 0.25 + Math.floor(i / 3) * 0.5);
  }
}
