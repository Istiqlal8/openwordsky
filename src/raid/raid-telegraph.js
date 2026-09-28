// Telegraphed ground attacks for the on-foot bosses: an expanding stomp ring, mortar markers
// that paint the ground before they land, and a sweeping lance. Every mesh is pooled and reused,
// so a whole fight allocates nothing after the first frame.
import * as THREE from 'three';

const RING_LIFE = 1.4;
const RING_BAND = 3.2;
const MORTARS = 6;
const MORTAR_WARN = 1.5;

function ringMesh(color, inner) {
  const geo = new THREE.RingGeometry(inner, 1, 40, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  mesh.renderOrder = 3;
  return { geo, mat, mesh };
}

export class Telegraph {
  constructor(scene, color, floorAt) {
    this.floorAt = floorAt;
    this.wave = ringMesh(color, 0.88);
    this.wave.t = 0;
    this.wave.hit = false;
    scene.add(this.wave.mesh);
    this.marks = [];
    for (let i = 0; i < MORTARS; i++) {
      const m = ringMesh(0xff7a3a, 0.6);
      m.t = -1;
      m.r = 5;
      scene.add(m.mesh);
      this.marks.push(m);
    }
  }

  // --- stomp ---------------------------------------------------------------
  stomp(x, z, r0) {
    const w = this.wave;
    w.mesh.position.set(x, this.floorAt(x, z) + 0.4, z);
    w.r0 = r0;
    w.t = 0;
    w.hit = false;
    w.mesh.visible = true;
  }

  // -> true on the frame the ring sweeps over a grounded player.
  stepWave(dt, feet, grounded, reach) {
    const w = this.wave;
    if (!w.mesh.visible) return false;
    w.t += dt;
    const k = w.t / RING_LIFE, r = w.r0 + reach * k;
    w.mesh.scale.setScalar(r);
    w.mat.opacity = 0.85 * (1 - k);
    if (k >= 1) { w.mesh.visible = false; return false; }
    const d = Math.hypot(feet.x - w.mesh.position.x, feet.z - w.mesh.position.z);
    if (w.hit || !grounded || Math.abs(d - r) > RING_BAND) return false;
    w.hit = true;
    return true;
  }

  // --- mortars -------------------------------------------------------------
  // Paints `n` circles around a point; they detonate after MORTAR_WARN seconds.
  mortar(x, z, spread, n, radius) {
    let placed = 0;
    for (const m of this.marks) {
      if (placed >= n) break;
      if (m.t >= 0) continue;
      const a = Math.random() * Math.PI * 2, d = Math.random() * spread;
      const mx = x + Math.cos(a) * d, mz = z + Math.sin(a) * d;
      m.mesh.position.set(mx, this.floorAt(mx, mz) + 0.3, mz);
      m.mesh.scale.setScalar(radius);
      m.r = radius;
      m.t = 0;
      m.mesh.visible = true;
      placed++;
    }
  }

  // -> array of {x, z, r} that detonated this frame.
  stepMortars(dt, out) {
    out.length = 0;
    for (const m of this.marks) {
      if (m.t < 0) continue;
      m.t += dt;
      m.mat.opacity = 0.35 + 0.5 * Math.abs(Math.sin(m.t * 7));
      if (m.t < MORTAR_WARN) continue;
      m.t = -1;
      m.mesh.visible = false;
      out.push({ x: m.mesh.position.x, z: m.mesh.position.z, r: m.r });
    }
    return out;
  }

  dispose() {
    for (const m of [this.wave, ...this.marks]) {
      m.mesh.removeFromParent();
      m.geo.dispose();
      m.mat.dispose();
    }
    this.marks.length = 0;
  }
}
