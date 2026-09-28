// Mesh helpers for the player character. Geometries are per-avatar and freed by Avatar.dispose().
import * as THREE from 'three';

export function mesh(geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

export function pivot(x = 0, y = 0, z = 0, ...children) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (children.length) g.add(...children);
  return g;
}

export const sphere = (r, d = 14) => new THREE.SphereGeometry(r, d, Math.round(d * 0.7));
export const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 3, 8);
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt, rb, h, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg);
export const cone = (r, h, seg = 10) => new THREE.ConeGeometry(r, h, seg);
export const octa = (r) => new THREE.OctahedronGeometry(r);
export const torus = (r, t, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 6, 16, arc);
// Cap of a sphere: thetaStart..thetaStart+thetaLength in radians (0 = north pole).
export const shell = (r, theta0, theta1, d = 14) =>
  new THREE.SphereGeometry(r, d, Math.round(d * 0.7), 0, Math.PI * 2, theta0, theta1);

// Limb hanging from its pivot, matching the old Astronaut rig so muzzle() still finds the hand.
export function limb(mat, x, y, len, thick) {
  const p = pivot(x, y, 0);
  p.add(mesh(cap(thick, len), mat, 0, -len / 2 - thick * 0.5, 0));
  return p;
}

// Bounding box of a node's direct mesh children, in the node's own space.
export function directBox(node) {
  const out = new THREE.Box3(), tmp = new THREE.Box3();
  for (const o of node.children) {
    if (!o.isMesh) continue;
    o.updateMatrix();
    o.geometry.computeBoundingBox();
    out.union(tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrix));
  }
  return out.isEmpty() ? new THREE.Box3(new THREE.Vector3(-0.2, -0.2, -0.2), new THREE.Vector3(0.2, 0.2, 0.2)) : out;
}

// Local-space bounding box of a subtree (used to fit gear onto an alien body).
export function localBox(node) {
  node.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(node.matrixWorld).invert();
  const out = new THREE.Box3(), tmp = new THREE.Box3(), mat = new THREE.Matrix4();
  node.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    tmp.copy(o.geometry.boundingBox).applyMatrix4(mat.multiplyMatrices(inv, o.matrixWorld));
    out.union(tmp);
  });
  return out.isEmpty() ? new THREE.Box3(new THREE.Vector3(-0.2, -0.2, -0.2), new THREE.Vector3(0.2, 0.2, 0.2)) : out;
}
