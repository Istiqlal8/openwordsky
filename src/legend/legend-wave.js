// Stomp shockwave: a glowing ring that races outward over the ground. Players standing on the
// ground where the ring passes take damage once per wave; jumping over it avoids the hit.
import * as THREE from 'three';

const LIFE = 1.3;
const REACH = 26;  // extra radius beyond the beast's body
const BAND = 2.6;  // ring thickness that hurts

export class Shockwave {
  constructor(scene, color) {
    this.geo = new THREE.RingGeometry(0.86, 1, 48, 1);
    this.geo.rotateX(-Math.PI / 2);
    this.mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.visible = false;
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
    this.t = 0;
    this.hit = false;
  }

  get active() { return this.mesh.visible; }

  start(x, y, z, r0) {
    this.mesh.position.set(x, y + 0.3, z);
    this.r0 = r0;
    this.t = 0;
    this.hit = false;
    this.mesh.visible = true;
  }

  // -> true on the frame the ring catches a grounded player.
  update(dt, feet, grounded) {
    if (!this.mesh.visible) return false;
    this.t += dt;
    const k = this.t / LIFE, r = this.r0 + REACH * k;
    this.mesh.scale.setScalar(r);
    this.mat.opacity = 0.85 * (1 - k);
    if (k >= 1) { this.mesh.visible = false; return false; }
    const d = Math.hypot(feet.x - this.mesh.position.x, feet.z - this.mesh.position.z);
    if (this.hit || !grounded || Math.abs(d - r) > BAND) return false;
    this.hit = true;
    return true;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
  }
}
