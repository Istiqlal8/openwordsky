// Building blocks for procedural weapon models: per-model materials and primitive parts.
// Models face -Z with the grip at the origin; a `muzzle` Object3D marks the barrel tip.
import * as THREE from 'three';

// Viewmodel materials join the transparent list (drawn last, after a depth clear, see viewmodel.js).
export function overlayFlags(mat) {
  mat.transparent = true;
  mat.fog = false;
  return mat;
}

export function weaponMaterials(color, overlay) {
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, ...o });
  const mats = {
    metal: std(0x3a414c, { metalness: 0.6, roughness: 0.45 }),
    plate: std(0xd8d2c4, { metalness: 0.2, roughness: 0.6 }),
    dark: std(0x1a1d23, { metalness: 0.4, roughness: 0.7 }),
    glow: std(color, { emissive: color, emissiveIntensity: 1.4, toneMapped: false }),
    grip: std(0x2b2320, { roughness: 0.9 }),
  };
  if (overlay) Object.values(mats).forEach(overlayFlags);
  return mats;
}

export class PartBuilder {
  constructor(group, mats) {
    this.group = group;
    this.mats = mats;
  }

  add(geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, this.mats[mat]);
    m.position.set(x, y, z);
    this.group.add(m);
    return m;
  }

  box(w, h, d, mat, x, y, z) {
    return this.add(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  }

  // Cylinder along the Z axis (barrels, cells, scopes).
  tube(r0, r1, len, mat, x, y, z, seg = 10) {
    return this.add(new THREE.CylinderGeometry(r0, r1, len, seg).rotateX(Math.PI / 2), mat, x, y, z);
  }

  ring(r, t, mat, x, y, z) {
    return this.add(new THREE.TorusGeometry(r, t, 6, 14), mat, x, y, z);
  }

  ball(r, mat, x, y, z) {
    return this.add(new THREE.IcosahedronGeometry(r, 1), mat, x, y, z);
  }

  grip(x = 0, y = -0.06, z = 0.05) {
    this.box(0.045, 0.12, 0.06, 'grip', x, y, z).rotation.x = -0.25;
  }

  muzzle(z, y = 0) {
    const m = new THREE.Object3D();
    m.position.set(0, y, z);
    this.group.add(m);
    return m;
  }
}

export function disposeGroup(group, mats) {
  group.removeFromParent();
  group.traverse((o) => o.geometry?.dispose());
  Object.values(mats).forEach((m) => m.dispose());
}
