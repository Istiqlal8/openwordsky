// Continuous weapon beam visual: up to 4 flickering segments (one per muzzle) that meet at the
// hit point, each drawn as a bright core inside a soft additive halo. Allocation-free per frame.
import * as THREE from 'three';

const SEGMENTS = 4;
const Z = new THREE.Vector3(0, 0, 1);
const tmpD = new THREE.Vector3();

function beamMaterial(color, opacity) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false });
}

export class ShipBeam {
  constructor(parent, color, core) {
    this.geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
    this.coreMat = beamMaterial(core, 0.95);
    this.haloMat = beamMaterial(color, 0.45);
    this.segs = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const core = new THREE.Mesh(this.geo, this.coreMat);
      const halo = new THREE.Mesh(this.geo, this.haloMat);
      for (const m of [core, halo]) { m.visible = false; m.frustumCulled = false; parent.add(m); }
      this.segs.push({ core, halo });
    }
    this.time = 0;
  }

  // Draws segments from each muzzle to `to`; width in world units.
  show(muzzles, to, width, dt) {
    this.time += dt;
    const n = Math.min(SEGMENTS, muzzles.length);
    for (let i = 0; i < SEGMENTS; i++) {
      const s = this.segs[i];
      const on = i < n;
      s.core.visible = s.halo.visible = on;
      if (!on) continue;
      const from = muzzles[i];
      const len = tmpD.subVectors(to, from).length();
      tmpD.divideScalar(Math.max(len, 1e-4));
      const flicker = 1 + 0.25 * Math.sin(this.time * 60 + i * 2.1);
      for (const [m, w] of [[s.core, width * 0.35], [s.halo, width * flicker]]) {
        m.position.copy(from);
        m.quaternion.setFromUnitVectors(Z, tmpD);
        m.scale.set(w, w, len);
      }
    }
  }

  hide() {
    for (const s of this.segs) s.core.visible = s.halo.visible = false;
  }

  dispose() {
    for (const s of this.segs) { s.core.removeFromParent(); s.halo.removeFromParent(); }
    this.geo.dispose();
    this.coreMat.dispose();
    this.haloMat.dispose();
  }
}
