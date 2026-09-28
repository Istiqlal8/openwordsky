// Pooled thin additive tracer lines (pellets, railgun), sized in world units unlike FxSystem.beam.
import * as THREE from 'three';

const POOL = 24;
const UP = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();

export class Tracers {
  constructor(scene) {
    this.geo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0);
    this.group = new THREE.Group();
    this.items = [];
    this.next = 0;
    for (let i = 0; i < POOL; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.items.push({ mesh, age: 0, life: 1, width: 0.02 });
    }
    scene.add(this.group);
  }

  show(from, to, color, width = 0.02, life = 0.1) {
    const it = this.items[this.next];
    this.next = (this.next + 1) % POOL;
    const len = _d.subVectors(to, from).length();
    if (len < 1e-3) return;
    it.mesh.position.copy(from);
    it.mesh.quaternion.setFromUnitVectors(UP, _d.divideScalar(len));
    it.mesh.scale.set(width, len, width);
    it.mesh.material.color.set(color);
    it.mesh.material.opacity = 1;
    it.mesh.visible = true;
    Object.assign(it, { age: 0, life, width });
  }

  update(dt) {
    for (const it of this.items) {
      if (!it.mesh.visible) continue;
      it.age += dt;
      const k = 1 - it.age / it.life;
      if (k <= 0) { it.mesh.visible = false; continue; }
      it.mesh.material.opacity = k;
      it.mesh.scale.x = it.mesh.scale.z = it.width * (0.4 + 0.6 * k);
    }
  }

  clear() { for (const it of this.items) it.mesh.visible = false; }

  dispose() {
    for (const it of this.items) it.mesh.material.dispose();
    this.geo.dispose();
    this.group.removeFromParent();
  }
}
