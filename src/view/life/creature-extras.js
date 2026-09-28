// Body extras: bending tail chain, two-part wings, hover tentacles, shell, fins and back spikes.
import * as THREE from 'three';
import { mixHex, shiftHex } from '../../core/color.js';
import { segment, slab, limb } from './anatomy/geo.js';
import { surfacePoint } from './anatomy/torso.js';
import { has } from './creature-kit.js';

function pivot(tag, x, y, z, extra) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.userData = { tag, ...extra };
  return g;
}

// Tail: n pivots, each carrying one tapered segment; first is tagged 'tail'.
export function addTail(body, p, newBin, mats) {
  const t = p.tail, g = p.g;
  if (!t.n || p.serpent) return [];
  const segLen = t.len / t.n, chain = [];
  let parent = body;
  for (let i = 0; i < t.n; i++) {
    const r0 = t.r0 * (1 - 0.8 * (i / t.n)), r1 = t.r0 * (1 - 0.8 * ((i + 1) / t.n));
    const piv = pivot(i ? 'tailSeg' : 'tail', i ? -segLen : t.x, i ? 0 : t.y, 0, { i, n: t.n, droop: t.droop });
    piv.rotation.z = t.droop;
    const bin = newBin().add(segment(segLen, r0, r1, 7), { uOff: -i * segLen * 0.9 });
    if (i === t.n - 1) tailTip(bin, g, segLen, r1);
    bin.bake(piv, mats);
    parent.add(piv);
    parent = piv;
    chain.push(piv);
  }
  return chain;
}

function tailTip(bin, g, len, r) {
  if (g.tail === 'club') bin.add(new THREE.IcosahedronGeometry(r * 3.2, 1), { at: [-len - r, 0, 0], hard: true, tint: shiftHex(g.secondary, 0, -0.2, -0.25) });
  if (has(g, 'sirip')) {
    const f = slab([[0, 0], [-len * 1.3, len * 0.5], [-len * 1.1, 0], [-len * 1.3, -len * 0.5]], 0.004);
    bin.add(f.rotateX(Math.PI / 2), { at: [-len, 0, 0], hard: true, tint: g.secondary });
  }
}

// Wing outline (x = chord forward, y = span outward) for the inner and outer part.
function wingShapes(c, s1, s2, feather) {
  const inner = [[c * 0.15, 0], [c * 0.2, s1], [-c * 0.85, s1], [-c * 0.8, 0]];
  const outer = [[c * 0.2, 0], [c * 0.02, s2], [-c * 0.2, s2 * 1.02]];
  const n = 5;
  for (let i = 1; i <= n; i++) {
    const k = 1 - i / n, notch = i % 2 && !feather ? 0.14 : 0;
    outer.push([-c * (0.3 + 0.55 * (i / n)) + (feather ? c * 0.12 * (i % 2) : 0), s2 * (k * 0.95 + notch * (1 - k))]);
  }
  outer.push([-c * 0.85, 0]);
  return { inner, outer };
}

export function addWings(body, p, newBin, mats) {
  if (!p.g.wings) return [];
  const L = p.serpent ? 0.45 : p.len, c = L * 0.5 + 0.1, s1 = L * 0.45 + 0.15, s2 = L * 0.6 + 0.2, feather = p.skin === 'fur';
  const { inner, outer } = wingShapes(c, s1, s2, feather);
  return [-1, 1].map((side) => {
    const root = pivot('wing', p.serpent ? -0.15 : p.len * 0.12, p.rh * 0.55, side * p.rw * 0.6, { side });
    const tip = pivot('wingTip', 0, 0, side * s1, { side });
    const mirror = [1, 1, side];
    const a = newBin(), b = newBin();
    a.add(slab(inner, 0.008), { scale: mirror, uAxis: 2 });
    a.add(limb(s1, 0.035, 0.028, 5), { rot: [side * -Math.PI / 2, 0, 0], at: [c * 0.12, 0, 0] });
    b.add(slab(outer, 0.006), { scale: mirror, uAxis: 2 });
    a.bake(root, mats);
    b.bake(tip, mats);
    root.add(tip);
    body.add(root);
    return root;
  });
}

// Hovering creatures without legs trail tentacle chains under the belly.
export function addTentacles(body, p, newBin, mats) {
  if (p.g.move !== 'melayang' || p.kind !== 'none' || p.serpent) return [];
  const n = 4 + (p.g.seed % 3), out = [], seg = 0.22 + p.len * 0.08;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    let parent = pivot('tentacle', Math.cos(a) * p.len * 0.25, -p.rh * 0.7, Math.sin(a) * p.rw * 0.6, { k, n });
    body.add(parent);
    out.push(parent);
    for (let i = 0; i < 4; i++) {
      const r = 0.07 * (1 - i * 0.2);
      newBin().add(limb(seg, r, r * 0.78, 6), { uAxis: 1 }).bake(parent, mats);
      if (i === 3) break;
      const next = pivot('tentacleSeg', 0, -seg, 0, { i });
      parent.add(next);
      parent = next;
    }
  }
  return out;
}

// Shell, dorsal fin and back spikes go into the torso bin.
export function decorate(bin, p) {
  const g = p.g;
  if (has(g, 'cangkang')) {
    const col = mixHex(shiftHex(g.secondary, 0, -0.25, -0.15), g.primary, 0.35);
    bin.add(new THREE.SphereGeometry(1, 16, 7, 0, Math.PI * 2, 0, Math.PI * 0.5), { at: [0, p.rh * 0.05, 0], scale: [p.len * 0.44, p.rh * 1.25, p.rw * 1.22], hard: true, tint: col });
    bin.add(new THREE.TorusGeometry(1, 0.035, 5, 24).rotateX(Math.PI / 2), { at: [0, p.rh * 0.05, 0], scale: [p.len * 0.45, 1, p.rw * 1.24], hard: true, tint: shiftHex(col, 0, 0, 0.12) });
  }
  if (has(g, 'sirip')) {
    const [x, y] = surfacePoint(p, 0.55, 0, 0.9), l = p.len * 0.45;
    const f = slab([[l * 0.5, 0], [-l * 0.1, l * 0.55], [-l * 0.5, l * 0.45], [-l * 0.45, 0]], 0.006);
    bin.add(f.rotateX(-Math.PI / 2), { at: [x, y, 0], hard: true, tint: g.secondary });
  }
  if (!g.spikes || has(g, 'cangkang')) return;
  for (let t = 0.2; t <= 0.85; t += 0.09) {
    const at = surfacePoint(p, t, 0, 0.92), h = p.rh * (0.35 + 0.35 * Math.sin(Math.PI * t));
    bin.add(new THREE.ConeGeometry(h * 0.3, h, 5), { at: [at[0], at[1] + h * 0.4, 0], rot: [0, 0, 0.35], hard: true, tint: mixHex(g.secondary, 0xe8e0d0, 0.4) });
  }
}

