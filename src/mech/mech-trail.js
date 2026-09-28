// Ribbon left behind the beam saber. Lives inside the mech's own group, so the trail rides along
// with the mech while it flies; samples are taken in that local space. Allocation-free per frame.
import * as THREE from 'three';

const SEG = 16;

export class BladeTrail {
  constructor(parent, color) {
    const n = SEG * 2;
    this.raw = new Float32Array(n * 3);
    this.pos = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const idx = [];
    for (let i = 0; i < SEG - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(idx);
    this.mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    parent.add(this.mesh);
    this.geo = geo;
    this.count = 0;
  }

  // base/tip are points in the parent's local space; the newest sample is the widest.
  push(base, tip) {
    for (let i = SEG - 1; i > 0; i--) {
      const d = i * 6, s = (i - 1) * 6;
      for (let k = 0; k < 6; k++) this.raw[d + k] = this.raw[s + k];
    }
    this.raw[0] = base.x; this.raw[1] = base.y; this.raw[2] = base.z;
    this.raw[3] = tip.x; this.raw[4] = tip.y; this.raw[5] = tip.z;
    if (this.count < SEG) this.count++;
    this.taper();
    this.mesh.visible = this.count > 2;
    this.geo.attributes.position.needsUpdate = true;
    this.geo.setDrawRange(0, Math.max(0, (this.count - 1) * 6));
    this.mat.opacity = 0.85;
  }

  // Older samples pull their tip back toward the hilt so the ribbon narrows to a point.
  taper() {
    for (let i = 0; i < this.count; i++) {
      const b = i * 6, t = b + 3;
      const k = 1 - i / SEG;
      for (let a = 0; a < 3; a++) {
        this.pos[b + a] = this.raw[b + a];
        this.pos[t + a] = this.raw[b + a] + (this.raw[t + a] - this.raw[b + a]) * k;
      }
    }
  }

  // No new sample this frame: let the ribbon dim out.
  fade(dt) {
    if (!this.mesh.visible) return;
    this.mat.opacity -= dt * 3.4;
    if (this.mat.opacity <= 0) { this.mesh.visible = false; this.count = 0; }
  }

  hide() {
    this.mesh.visible = false;
    this.count = 0;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
  }
}
