// Small allocation-free geometry helpers for combat collision.
export function randomDir(out, rnd = Math.random) {
  const u = rnd() * 2 - 1;
  const th = rnd() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return out.set(Math.cos(th) * s, u, Math.sin(th) * s);
}

// True if segment a->b passes within r of point c.
export function segmentHits(a, b, c, r) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const acx = c.x - a.x, acy = c.y - a.y, acz = c.z - a.z;
  const len2 = abx * abx + aby * aby + abz * abz;
  let t = len2 > 0 ? (acx * abx + acy * aby + acz * abz) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = acx - abx * t, dy = acy - aby * t, dz = acz - abz * t;
  return dx * dx + dy * dy + dz * dz <= r * r;
}

// Push pos out of a sphere; returns the outward normal length (0 if no contact). n receives the normal.
export function pushOut(pos, center, minDist, n) {
  n.subVectors(pos, center);
  const len = n.length();
  if (len >= minDist || len === 0) return 0;
  n.divideScalar(len);
  pos.copy(center).addScaledVector(n, minDist);
  return minDist - len;
}
