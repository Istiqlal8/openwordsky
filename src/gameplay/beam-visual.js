// Glowing mining beam: a stretched additive cylinder from the multitool to the hit point.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();

function glowMat(color, opacity) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false });
}

export class BeamVisual {
  constructor(scene, color = 0xffa630) {
    this.scene = scene;
    const geo = new THREE.CylinderGeometry(1, 0.3, 1, 8, 1, true).translate(0, 0.5, 0);
    this.core = new THREE.Mesh(geo, glowMat(0xfff1c8, 0.9));
    this.glow = new THREE.Mesh(geo, glowMat(color, 0.45));
    this.tip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), glowMat(color, 0.8));
    this.group = new THREE.Group();
    this.group.add(this.core, this.glow);
    this.group.visible = this.tip.visible = false;
    for (const o of [this.core, this.glow, this.tip, this.group]) o.frustumCulled = false;
    scene.add(this.group, this.tip);
    this.t = 0;
  }

  // Show the beam from `from` to `to`; `hit` toggles the impact glow.
  show(from, to, dt, hit) {
    this.t += dt;
    const len = _dir.subVectors(to, from).length();
    if (len < 1e-3) return this.hide();
    this.group.position.copy(from);
    this.group.quaternion.setFromUnitVectors(UP, _dir.divideScalar(len));
    const flick = 0.8 + Math.sin(this.t * 60) * 0.12 + Math.sin(this.t * 23) * 0.08;
    this.core.scale.set(0.018 * flick, len, 0.018 * flick);
    this.glow.scale.set(0.06 * flick, len, 0.06 * flick);
    this.tip.position.copy(to);
    this.tip.scale.setScalar(flick * (hit ? 1.4 : 0.6));
    this.group.visible = true;
    this.tip.visible = true;
  }

  hide() {
    this.group.visible = this.tip.visible = false;
  }

  dispose() {
    this.scene.remove(this.group, this.tip);
    this.core.geometry.dispose();
    this.tip.geometry.dispose();
    for (const m of [this.core, this.glow, this.tip]) m.material.dispose();
  }
}
