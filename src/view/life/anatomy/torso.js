// Torso lofted along a curved spine (chest, waist, hips), plus the segmented serpent/worm body.
import * as THREE from 'three';
import { loft, segment, bump } from './geo.js';

const RINGS = 14;
const se = (c, e) => Math.sign(c) * Math.abs(c) ** (2 / e);

// Cross-section at t (0 = rump, 1 = chest front): { x, y, rh, rw, dy }.
export function section(p, t) {
  const end = Math.max(0, 1 - (2 * t - 1) ** 4) ** 0.5;
  const k = 1 + p.chest * bump(t, 0.7, 0.15) + p.hip * bump(t, 0.24, 0.13) - p.waist * bump(t, 0.47, 0.1)
    + p.ripple * Math.cos(t * Math.PI * 12);
  return { x: -p.len / 2 + t * p.len, y: p.arch * Math.sin(Math.PI * t) + p.withers * bump(t, 0.75, 0.15),
    rh: Math.max(0.004, p.rh * k * end), rw: Math.max(0.004, p.rw * k * end * (1 - 0.12 * bump(t, 0.95, 0.1))),
    dy: -0.06 * p.rh * bump(t, 0.5, 0.25) };
}

// Surface point of the torso at t, angle a around (0 = top, PI/2 = +Z side), pushed out by k.
export function surfacePoint(p, t, a, k = 1) {
  const s = section(p, t);
  return [s.x, s.y + (se(Math.cos(a), p.exp) * s.rh + s.dy) * k, se(Math.sin(a), p.exp) * s.rw * k];
}

export function torsoGeometry(p) {
  const path = [];
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS, s = section(p, t);
    path.push({ p: [s.x, s.y, 0], rh: s.rh, rw: s.rw, dy: s.dy });
  }
  return loft(path, 12, new THREE.Vector3(0, 1, 0), p.exp);
}

// Serpent/worm: chain of pivots going -X from the head; returns the pivots (front first).
export function buildSpine(body, p, bin, mats) {
  const g = p.g, worm = g.body !== 'ular';
  const n = worm ? 6 + Math.round(g.stretch * 2) : 8 + Math.round(g.stretch * 3);
  const segLen = (worm ? 0.2 : 0.26) * (0.8 + 0.2 * g.stretch), r = p.rh * (worm ? 1.15 : 1);
  const rad = (i) => r * (i < 2 ? 0.9 + i * 0.05 : 1 - 0.78 * ((i - 2) / (n - 1)) ** 1.3);
  const chain = [];
  let parent = body;
  for (let i = 0; i < n; i++) {
    const piv = new THREE.Group();
    piv.position.set(i ? -segLen : 0, 0, 0);
    piv.userData = { tag: i === 1 ? 'tail' : 'spineSeg', spine: 1, i, n };
    bin().add(segment(segLen, rad(i), rad(i + 1), 8, worm ? 1 : 0.85), { uScale: 1.2, uOff: -i * segLen * 1.2 }).bake(piv, mats);
    parent.add(piv);
    chain.push(piv);
    parent = piv;
  }
  return { chain, segLen };
}
