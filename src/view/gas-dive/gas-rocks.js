// Floating mineral rocks: one instanced mesh of lumpy boulders drifting and tumbling in the gas.
import * as THREE from 'three';
import { Rng, hash32 } from '../../core/rng.js';

const COUNT = 16, SPAN = 6000;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3();
const _s = new THREE.Vector3();

function lumpyGeometry(rng) {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    _p.fromBufferAttribute(pos, i);
    _p.multiplyScalar(0.8 + 0.35 * Math.sin(_p.x * 3.1 + rng.range(0, 0.4)) * Math.cos(_p.y * 2.3 + _p.z * 1.7));
    pos.setXYZ(i, _p.x, _p.y, _p.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export class GasRocks {
  constructor(scene, pal) {
    const rng = new Rng(hash32(pal.seed, 0x70c5));
    this.geo = lumpyGeometry(rng);
    this.mat = new THREE.MeshStandardMaterial({ color: 0x5a5048, roughness: 0.9, metalness: 0.2, flatShading: true,
      emissive: pal.glow, emissiveIntensity: 0.08 });
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, COUNT);
    this.mesh.frustumCulled = false;
    this.rocks = Array.from({ length: COUNT }, () => ({
      base: new THREE.Vector3(rng.range(-0.5, 0.5) * SPAN, rng.range(-2700, -150), rng.range(-0.5, 0.5) * SPAN),
      size: new THREE.Vector3(rng.range(8, 50), rng.range(6, 40), rng.range(8, 50)),
      spin: new THREE.Vector3(rng.range(-0.1, 0.1), rng.range(-0.1, 0.1), rng.range(-0.1, 0.1)),
      drift: rng.range(-4, 4),
    }));
    scene.add(this.mesh);
  }

  update(time, cam) {
    for (let i = 0; i < COUNT; i++) {
      const r = this.rocks[i];
      const x = r.base.x + r.drift * time - cam.x, z = r.base.z - cam.z;
      _p.set(cam.x + x - SPAN * Math.round(x / SPAN), r.base.y + Math.sin(time * 0.2 + i) * 8, cam.z + z - SPAN * Math.round(z / SPAN));
      _q.setFromEuler(_e.set(r.spin.x * time, r.spin.y * time, r.spin.z * time));
      this.mesh.setMatrixAt(i, _m.compose(_p, _q, _s.copy(r.size)));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
    this.mesh.dispose();
    this.mesh.removeFromParent();
  }
}
