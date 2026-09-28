// Wind streaks: short additive lines recycled in a box around the camera, stretched along
// the air's velocity relative to the ship. Denser and brighter in strong turbulence.
import * as THREE from 'three';

const N = 180, BOX = 70;
const _rel = new THREE.Vector3();

export class GasWind {
  constructor(scene, tint) {
    this.pts = new Float32Array(N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    this.mat = new THREE.LineBasicMaterial({ color: new THREE.Color(tint).lerp(new THREE.Color(0xffffff), 0.6),
      transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.lines = new THREE.LineSegments(geo, this.mat);
    this.lines.frustumCulled = false;
    scene.add(this.lines);
    this.seeded = false;
  }

  respawn(i, cam) {
    this.pts[i * 3] = cam.x + (Math.random() - 0.5) * 2 * BOX;
    this.pts[i * 3 + 1] = cam.y + (Math.random() - 0.5) * 2 * BOX;
    this.pts[i * 3 + 2] = cam.z + (Math.random() - 0.5) * 2 * BOX;
  }

  // air: world wind velocity (m/s); shipVel: ship velocity; turb: 0..1.
  update(dt, cam, air, shipVel, turb) {
    if (!this.seeded) { for (let i = 0; i < N; i++) this.respawn(i, cam); this.seeded = true; }
    _rel.copy(air).sub(shipVel);
    const speed = _rel.length();
    this.mat.opacity = Math.min(0.55, Math.max(0, (speed - 25) / 300) + turb * 0.25);
    const len = Math.min(0.12, 6 / Math.max(speed, 1));
    const arr = this.lines.geometry.attributes.position.array;
    for (let i = 0; i < N; i++) this.step(i, dt, cam, air, arr, len);
    this.lines.geometry.attributes.position.needsUpdate = true;
  }

  step(i, dt, cam, air, arr, len) {
    const p = this.pts, k = i * 3;
    p[k] += air.x * dt; p[k + 1] += air.y * dt; p[k + 2] += air.z * dt;
    if (Math.abs(p[k] - cam.x) > BOX || Math.abs(p[k + 1] - cam.y) > BOX || Math.abs(p[k + 2] - cam.z) > BOX) {
      this.respawn(i, cam);
    }
    const o = i * 6;
    arr[o] = p[k]; arr[o + 1] = p[k + 1]; arr[o + 2] = p[k + 2];
    arr[o + 3] = p[k] - _rel.x * len; arr[o + 4] = p[k + 1] - _rel.y * len; arr[o + 5] = p[k + 2] - _rel.z * len;
  }

  dispose() {
    this.lines.geometry.dispose();
    this.mat.dispose();
    this.lines.removeFromParent();
  }
}
