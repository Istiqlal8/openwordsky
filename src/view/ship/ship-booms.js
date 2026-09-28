// Custom-only extras: twin tail booms with a stabilizer, and a racing stripe along the spine.
import * as THREE from 'three';
import { part } from './ship-materials.js';
import { topAt, zAt } from './ship-hull.js';

// Two booms running from mid-body past the tail, joined by a horizontal stabilizer.
export function buildBooms(p, mats) {
  const g = new THREE.Group();
  const x = p.width * 0.5 + 0.9, y = -p.height * 0.08;
  const front = zAt(p, 0.6), rear = p.length / 2 + 1.2, len = rear - front;
  const r = Math.max(0.14, p.height * 0.12);
  for (const s of [-1, 1]) {
    g.add(part(new THREE.CylinderGeometry(r, r * 0.8, len, 10).rotateX(Math.PI / 2), mats.hull, s * x, y, front + len / 2));
    g.add(part(new THREE.ConeGeometry(r, r * 3, 10).rotateX(-Math.PI / 2), mats.trim, s * x, y, front - r * 1.5));
    g.add(part(new THREE.BoxGeometry(0.08, p.height * 0.9, len * 0.22), mats.trim, s * x, y + p.height * 0.45, rear - len * 0.12));
    g.add(part(new THREE.BoxGeometry(x - p.width * 0.3, 0.1, len * 0.18), mats.dark, s * (x + p.width * 0.3) / 2, y, front + len * 0.2));
  }
  g.add(part(new THREE.BoxGeometry(x * 2, 0.1, len * 0.2), mats.hull, 0, y + p.height * 0.1, rear - len * 0.12));
  return g;
}

// Thin trim-colored strip following the top of the hull from tail to near the nose.
export function buildSpineStripe(p, mats) {
  const g = new THREE.Group();
  const n = 10, t0 = 0.06, t1 = 0.56, w = p.width * 0.14;
  for (let i = 0; i < n; i++) {
    const ta = t0 + ((t1 - t0) * i) / n, tb = t0 + ((t1 - t0) * (i + 1)) / n;
    const ya = topAt(p, ta), yb = topAt(p, tb), za = zAt(p, ta), zb = zAt(p, tb);
    const seg = part(new THREE.BoxGeometry(w, 0.03, Math.hypot(zb - za, yb - ya) * 1.02), mats.trim,
      0, (ya + yb) / 2 + 0.02, (za + zb) / 2);
    seg.rotation.x = Math.atan2(yb - ya, za - zb);
    g.add(seg);
  }
  return g;
}
