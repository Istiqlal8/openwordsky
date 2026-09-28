// Small faceted-solid helpers shared by every mech part. Geometry only, no state.
import * as THREE from 'three';

const R = 0.5;

// Faceted block: `seg` sided prism scaled to w x h x d, `taper` shrinks the top face.
// seg 4 = beveled box, 6/8 = armour drum. The flat face points at -Z (the mech's front).
export function block(w, h, d, taper = 1, seg = 4) {
  const g = new THREE.CylinderGeometry(R * taper, R, h, seg, 1);
  g.rotateY(Math.PI / seg);
  const k = 1 / Math.cos(Math.PI / seg);
  g.scale(w * k, 1, d * k);
  return g;
}

// Wedge lying along Z: a block whose top face is pushed forward (toes, knee caps, chins).
export function wedge(w, h, d, shift) {
  const g = block(w, h, d);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0) pos.setZ(i, pos.getZ(i) - shift);
  g.computeVertexNormals();
  return g;
}

// Flat swept blade (wings, binders, fins) extruded along its thickness, lying in the XY plane.
export function blade(len, rootC, tipC, sweep, thick) {
  const s = new THREE.Shape([
    [0, rootC * 0.5], [len, tipC * 0.5 - sweep], [len, -tipC * 0.5 - sweep], [0, -rootC * 0.5],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
  g.translate(0, 0, -thick / 2);
  return g;
}

export function rod(r, len, seg = 8) {
  return new THREE.CylinderGeometry(r, r, len, seg);
}

// Joint pin: a drum whose axis runs left-right (elbows, knees, shoulders).
export function pin(r, len, seg = 10) {
  return new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2);
}
