// Pooled scorch marks on terrain: dark discs aligned to the ground slope that shrink away.
import * as THREE from 'three';

const CAPACITY = 48;
const LIFE = 18;
const UP = new THREE.Vector3(0, 1, 0);
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpN = new THREE.Vector3();

export class ScorchPool {
  // floorAt(x, z) -> ground height.
  constructor(parent, floorAt) {
    this.floorAt = floorAt;
    const mat = new THREE.MeshBasicMaterial({ color: 0x0c0906, transparent: true, opacity: 0.62, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.mesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), mat, CAPACITY);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    parent.add(this.mesh);
    this.items = Array.from({ length: CAPACITY }, () => ({ pos: new THREE.Vector3(), q: new THREE.Quaternion(), size: 1, age: LIFE }));
    this.next = 0;
    this.active = 0;
  }

  // Mark at a ground point x/z (y is re-read from the terrain) with radius `size`.
  add(point, size) {
    const it = this.items[this.next];
    this.next = (this.next + 1) % CAPACITY;
    const y = this.floorAt(point.x, point.z);
    if (Math.abs(point.y - y) > size + 2) return; // hit something above the ground
    this.normal(point.x, point.z, tmpN);
    it.pos.set(point.x, y, point.z).addScaledVector(tmpN, 0.08);
    it.q.setFromUnitVectors(UP, tmpN);
    it.size = size * (0.8 + Math.random() * 0.4);
    it.age = 0;
    this.active = Math.min(CAPACITY, this.active + 1);
  }

  normal(x, z, out) {
    const e = 0.8, f = this.floorAt;
    return out.set(f(x - e, z) - f(x + e, z), 2 * e, f(x, z - e) - f(x, z + e)).normalize();
  }

  update(dt) {
    if (!this.active) return;
    let n = 0;
    for (const it of this.items) {
      if (it.age >= LIFE) continue;
      it.age += dt;
      const k = Math.min(1, (LIFE - it.age) / 3); // shrink during the last 3 s
      tmpS.setScalar(Math.max(0.001, it.size * k));
      tmpM.compose(tmpP.copy(it.pos), tmpQ.copy(it.q), tmpS);
      this.mesh.setMatrixAt(n++, tmpM);
    }
    this.mesh.count = this.active = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}
