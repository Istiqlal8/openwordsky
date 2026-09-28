// Head gear: horns / antlers / nasal horn, tusks, trunk, antennae, crest feathers, neck frill, fangs.
import * as THREE from 'three';
import { curveLoft, slab } from './geo.js';

const X = new THREE.Vector3(1, 0, 0);
const IVORY = 0xefe6cf;
const has = (g, f) => !!g.features?.includes(f);
const cone = (r0) => (t) => { const r = r0 * (1 - t * 0.92); return [r, r]; };

function curved(bin, hs, s, col) {
  const pts = [[hs * 0.25, hs * 0.38, s * hs * 0.22], [hs * 0.1, hs * 0.7, s * hs * 0.5], [-hs * 0.28, hs * 0.72, s * hs * 0.78],
    [-hs * 0.3, hs * 0.35, s * hs * 0.95], [-hs * 0.05, hs * 0.2, s * hs * 1.05]];
  bin.add(curveLoft(pts, 7, cone(hs * 0.12), 6, X), { hard: true, tint: col });
}

function straight(bin, hs, s, col) {
  const pts = [[hs * 0.28, hs * 0.4, s * hs * 0.14], [hs * 0.05, hs * 1.1, s * hs * 0.2], [-hs * 0.45, hs * 1.8, s * hs * 0.26]];
  bin.add(curveLoft(pts, 5, cone(hs * 0.08), 5, X), { hard: true, tint: col });
}

function antler(bin, hs, s, col) {
  const beam = [[hs * 0.2, hs * 0.4, s * hs * 0.2], [hs * 0.05, hs * 1.0, s * hs * 0.45], [-hs * 0.3, hs * 1.6, s * hs * 0.6], [-hs * 0.2, hs * 2.1, s * hs * 0.75]];
  bin.add(curveLoft(beam, 6, cone(hs * 0.07), 5, X), { hard: true, tint: col });
  for (const [i, k] of [[1, 0.5], [2, 0.4]]) {
    const b = beam[i];
    const tine = [b, [b[0] + hs * 0.25, b[1] + hs * 0.25, b[2]], [b[0] + hs * 0.35, b[1] + hs * 0.55 * k * 2, b[2] + s * hs * 0.05]];
    bin.add(curveLoft(tine, 3, cone(hs * 0.045), 4, X), { hard: true, tint: col });
  }
}

function nasal(bin, hs, tip, big, col) {
  const x = tip - hs * (big ? 0.2 : 0.55), h = hs * (big ? 0.75 : 0.35);
  const pts = [[x, hs * 0.1, 0], [x + hs * 0.08, hs * 0.1 + h * 0.6, 0], [x - hs * 0.08, hs * 0.1 + h, 0]];
  bin.add(curveLoft(pts, 4, cone(hs * (big ? 0.15 : 0.1)), 6, X), { hard: true, tint: col });
}

function horns(p, bin, tip) {
  const g = p.g, h = p.head, hs = h.hs;
  if (!g.horns) return;
  if (g.horns !== 2) nasal(bin, hs, tip, true, h.hornColor);
  if (g.horns === 3) nasal(bin, hs, tip, false, h.hornColor);
  if (g.horns === 1) return;
  const f = { curved, straight, antler, nasal: curved }[h.horn] ?? curved;
  for (const s of [-1, 1]) f(bin, hs, s, h.hornColor);
}

function mouthGear(p, bin, tip) {
  const g = p.g, hs = p.head.hs;
  for (const s of [-1, 1]) {
    if (has(g, 'gading')) {
      const pts = [[tip * 0.75, -hs * 0.12, s * hs * 0.14], [tip + hs * 0.15, -hs * 0.45, s * hs * 0.22], [tip + hs * 0.55, -hs * 0.3, s * hs * 0.2]];
      bin.add(curveLoft(pts, 5, cone(hs * 0.08), 6, X), { hard: true, tint: IVORY });
    } else if (p.head.fangs) {
      bin.add(new THREE.ConeGeometry(hs * 0.035, hs * 0.2, 5), { at: [tip - hs * 0.1, -hs * 0.18, s * hs * 0.1], rot: [Math.PI, 0, 0], hard: true, tint: IVORY });
    }
  }
  if (!has(g, 'belalai')) return;
  const trunk = [[tip - hs * 0.05, -hs * 0.02, 0], [tip + hs * 0.3, -hs * 0.2, 0], [tip + hs * 0.45, -hs * 0.8, 0],
    [tip + hs * 0.35, -hs * 1.4, 0], [tip + hs * 0.55, -hs * 1.6, 0]];
  bin.add(curveLoft(trunk, 9, (t) => { const r = hs * (0.17 - t * 0.09); return [r, r]; }, 7, X), { uAxis: 1, uScale: 3 });
}

function antennae(p, bin) {
  const g = p.g, hs = p.head.hs;
  if (!g.antennae) return;
  for (const s of [-1, 1]) {
    const pts = [[hs * 0.45, hs * 0.35, s * hs * 0.12], [hs * 0.55, hs * 1.0, s * hs * 0.35], [hs * 0.2, hs * 1.6, s * hs * 0.55]];
    bin.add(curveLoft(pts, 4, () => [hs * 0.025, hs * 0.025], 4, X), { hard: true, tint: 0x2a2420 });
    bin.add(new THREE.SphereGeometry(hs * 0.07, 6, 4), { at: pts[2], slot: g.glow ? 'glow' : 'skin', hard: !g.glow, tint: g.secondary });
  }
}

function crestFrill(p, bin) {
  const g = p.g, hs = p.head.hs;
  if (has(g, 'jambul')) {
    for (let i = 0; i < 5; i++) {
      const l = hs * (0.9 - i * 0.12);
      const face = slab([[0, 0], [l * 0.3, hs * 0.07], [l, 0], [l * 0.3, -hs * 0.07]], 0.004);
      bin.add(face.rotateX(Math.PI / 2), { at: [hs * (0.35 - i * 0.12), hs * 0.45, 0], rot: [0, 0, 2.1 + i * 0.15], hard: true, tint: g.secondary });
    }
  }
  if (!has(g, 'rumbai')) return;
  const out = [], n = 13;
  for (let i = 0; i <= n; i++) {
    const a = -1.9 + (i / n) * 3.8, r = hs * (i % 2 ? 1.05 : 1.2);
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  for (let i = n; i >= 0; i--) { const a = -1.9 + (i / n) * 3.8; out.push([Math.cos(a) * hs * 0.4, Math.sin(a) * hs * 0.4]); }
  bin.add(slab(out, 0.006), { at: [-hs * 0.05, hs * 0.05, 0], rot: [0, 0, Math.PI / 2], hard: true, tint: g.secondary });
}

export function addHeadGear(p, bin, tip) {
  horns(p, bin, tip);
  mouthGear(p, bin, tip);
  antennae(p, bin);
  crestFrill(p, bin);
}
