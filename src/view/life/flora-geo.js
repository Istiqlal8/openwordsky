// Geometry helpers shared by flora shape tables.
import * as THREE from 'three';

// Concatenate geometries (non-indexed) so a cluster renders as one instanced part.
export function merge(geos) {
  const flat = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const total = flat.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3);
  let o = 0;
  for (const g of flat) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

export const at = (g, x, y, z) => g.translate(x, y, z);
export const tilt = (g, rx, rz) => g.rotateX(rx).rotateZ(rz);
export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Tube along a smooth curve through points.
export function tube(points, radius, seg = 12, radial = 5) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), seg, radius, radial, false);
}

// Same geometry repeated n times around the Y axis.
export function ring(n, make) {
  return merge(Array.from({ length: n }, (_, i) => make(i, (i / n) * Math.PI * 2)));
}
