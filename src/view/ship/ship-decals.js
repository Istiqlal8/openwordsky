// Flat paint decals on a wing's top surface (wing-local space; planform y points to the nose).
import * as THREE from 'three';
import { part } from './ship-materials.js';

const TOP = 0.072;   // just above the 0.12-thick wing's top face
const THICK = 0.02;

// Planform points are [root-lead, tip-lead, tip-trail, root-trail]; sample them at span fraction f.
function sampler(pts) {
  const [a, b, c, d] = pts;
  return (f) => ({ x: a.x + (b.x - a.x) * f, lead: a.y + (b.y - a.y) * f, trail: d.y + (c.y - d.y) * f });
}

// Box patch centered at planform (x, y), size (sx along span, sy along chord), turned by angle.
function patch(mat, x, y, sx, sy, angle = 0) {
  const m = part(new THREE.BoxGeometry(Math.abs(sx), THICK, Math.abs(sy)), mat, x, TOP, -y);
  m.rotation.y = angle;
  return m;
}

function stripe(at, span, mats) {
  const s = at(0.62);
  return [patch(mats.trim, s.x, (s.lead + s.trail) / 2, span * 0.16, (s.lead - s.trail) * 0.9)];
}

// Two bars parallel to the leading edge; mirrored wings together read as a chevron.
function chevron(at, mats) {
  const out = [];
  for (const frac of [0.22, 0.46]) {
    const p0 = at(0.12), p1 = at(0.78);
    const y0 = p0.lead - (p0.lead - p0.trail) * frac, y1 = p1.lead - (p1.lead - p1.trail) * frac;
    const dx = p1.x - p0.x, dz = -(y1 - y0);
    const bar = patch(mats.trim, (p0.x + p1.x) / 2, (y0 + y1) / 2, Math.hypot(dx, dz), 0.16);
    bar.rotation.y = Math.atan2(-dz, dx);
    out.push(bar);
  }
  return out;
}

function checker(at, span, mats) {
  const out = [];
  const cols = 4, rows = 2;
  for (let i = 0; i < cols; i++) {
    const s = at(0.5 + (i + 0.5) * (0.42 / cols));
    const chord = s.lead - s.trail, cell = Math.min(Math.abs(span) * 0.42 / cols, chord * 0.3);
    for (let j = 0; j < rows; j++) {
      const y = s.lead - chord * 0.25 - (j - 0.5) * cell;
      out.push(patch((i + j) % 2 ? mats.dark : mats.trim, s.x, y, cell * 0.98, cell * 0.98));
    }
  }
  return out;
}

// Returns decal meshes for one wing; `decal` is 'stripe' | 'chevron' | 'checker'.
export function wingDecals(pts, decal, mats) {
  const at = sampler(pts), span = pts[1].x;
  if (decal === 'stripe') return stripe(at, span, mats);
  if (decal === 'chevron') return chevron(at, mats);
  if (decal === 'checker') return checker(at, span, mats);
  return [];
}
