// Reusable capital-ship details built into a Parts collector: engines, bridge towers, masts,
// dishes, turrets, cargo stacks, portholes and hull greebles.
import * as THREE from 'three';
import { inBox } from './freighter-collide.js';

export const CONTAINER_COLORS = [0xb8452e, 0x2f6fa8, 0xd9a13a, 0x4d8a4a, 0x8a8f99, 0xc96a2b];
const WIN = { x: [0.5, 1, 2.2], z: [2.2, 1, 0.5], y: [2.2, 0.5, 1.4] };
const _v = new THREE.Vector3();

// Engine nozzle whose exhaust points along +Z (dir 'z') or -Y (dir '-y').
export function nozzle(p, x, y, z, r, len, dir = 'z') {
  const down = dir === '-y';
  p.cyl('dark', r * 0.8, r, len, x, down ? y - len / 2 : y, down ? z : z + len / 2, down ? 'y' : 'z', 18);
  p.cyl('engine', r * 0.86, r * 0.86, 0.5, x, down ? y - len - 0.3 : y, down ? z : z + len + 0.3, down ? 'y' : 'z', 18);
  p.cores.push({ p: new THREE.Vector3(x, down ? y - len - 4 : y, down ? z : z + len + 4), r });
}

// Mast with cross bars; returns the tip (strobe spot).
export function mast(p, x, y0, z, h) {
  p.cyl('dark', 0.6, 0.9, h, x, y0 + h / 2, z, 'y', 5);
  for (const k of [0.55, 0.78]) p.box('dark', h * 0.3 * (1.2 - k), 0.6, 0.6, x, y0 + h * k, z);
  return [x, y0 + h + 2, z];
}

export function dish(p, x, y, z, r, rot = [-0.7, 0, 0.4]) {
  p.add('hull', new THREE.SphereGeometry(r, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.35), x, y, z, rot);
  p.cyl('dark', 0.5, 0.5, r * 0.9, x, y - r * 0.3, z, 'y', 5);
}

// Bridge tower (scale k) standing on y0: block, wide bridge with window band, mast and dish.
export function tower(p, x, y0, z, k = 1) {
  p.block('plate', 22 * k, 26 * k, 26 * k, x, y0 + 13 * k, z);
  p.block('hull', 38 * k, 9 * k, 16 * k, x, y0 + 30 * k, z - 6 * k);
  p.box('window', 36 * k, 2.2, 0.6, x, y0 + 30.5 * k, z - 14.2 * k);
  for (const sd of [-1, 1]) p.box('window', 0.6, 2.2, 12 * k, x + sd * 19.1 * k, y0 + 30.5 * k, z - 6 * k);
  dish(p, x - 7 * k, y0 + 38 * k, z + 6 * k, 7 * k);
  return mast(p, x + 4 * k, y0 + 34 * k, z, 30 * k);
}

// Gun turret on a deck at y (flip = hanging under a deck): base, housing and twin barrels.
export function turret(p, x, y, z, k = 1, flip = false) {
  const s = flip ? -1 : 1;
  p.cyl('dark', 4 * k, 5 * k, 2 * k, x, y + s * k, z, 'y', 10);
  p.box('plate', 7 * k, 3 * k, 8 * k, x, y + s * 3.4 * k, z);
  for (const dx of [-1.6, 1.6]) p.cyl('dark', 0.7 * k, 0.7 * k, 12 * k, x + dx * k, y + s * 3.6 * k, z - 9 * k, 'z', 6);
}

// Scatter lit portholes on the given faces ('+x', '-x', '+z', '-z', '+y') of a box.
export function portholes(p, rng, n, c, size, faces, skip = null) {
  for (let i = 0; i < n; i++) {
    const f = faces[i % faces.length], ax = 'xyz'.indexOf(f[1]), sg = f[0] === '+' ? 1 : -1;
    const v = [0, 1, 2].map((k) => c[k] + (k === ax ? sg * (size[k] / 2 + 0.3) : rng.range(-0.45, 0.45) * size[k]));
    if (ax !== 1) v[1] = c[1] + Math.round(rng.range(-0.4, 0.4) * size[1] / 4) * 4;
    if (skip && inBox(_v.set(...v), skip)) continue;
    p.instance('box', 'window', ...v, ...WIN[f[1]]);
  }
}

// Scatter plating blocks on the given faces of a box.
export function greebles(p, rng, n, c, size, faces, skip = null) {
  for (let i = 0; i < n; i++) {
    const f = faces[i % faces.length], ax = 'xyz'.indexOf(f[1]), sg = f[0] === '+' ? 1 : -1;
    const v = [0, 1, 2].map((k) => c[k] + (k === ax ? sg * (size[k] / 2 + 0.5) : rng.range(-0.46, 0.46) * size[k]));
    if (skip && inBox(_v.set(...v), skip)) continue;
    const sc = [rng.range(2, 6), rng.range(0.8, 2.5), rng.range(3, 12)];
    sc[ax] = rng.range(0.8, 1.6);
    p.instance('box', 'greeble', ...v, ...sc);
  }
}

// Stacks of 11 x 6 x 15 containers on a deck at y, rows across x, from z0 to z1.
export function containers(p, rng, xs, y, z0, z1, maxRows = 3) {
  for (let z = z0; z < z1; z += 16) {
    const rows = 1 + rng.int(maxRows);
    for (let r = 0; r < rows; r++) {
      for (const x of xs) if (rng.chance(0.75)) p.instance('box', 'crate', x, y + 3.2 + r * 6.2, z, 11, 6, 15, rng.pick(CONTAINER_COLORS));
    }
  }
}

// Red/green running lights at the widest point plus a white bow strobe.
export function runningLights(p, halfW, y, z, bowZ, bowY = 0) {
  p.light(-halfW - 1, y, z, 0xff3a2a, 'port');
  p.light(halfW + 1, y, z, 0x3aff6a, 'star');
  p.light(0, bowY, bowZ, 0xffffff, 'strobe');
}
