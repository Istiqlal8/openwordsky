// Bioluminescent jellyfish swarms: additive, pulsing InstancedMeshes that drift in the dark
// water (mostly the abyss, one swarm also in open water).
import * as THREE from 'three';
import { mergeParts, jellyMaterial } from './ocean-kit.js';
import { waterSpot } from './water-spot.js';

const SWARMS = [{ zones: ['abyss'], n: 50 }, { zones: ['abyss'], n: 45 }, { zones: ['mid', 'abyss'], n: 40 }];
const RANGE = 140, SPREAD = 11;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _c = new THREE.Color();

// Bell (y 0..0.5), inner glow and trailing tentacles (y < 0).
function jellyGeometry() {
  const parts = [
    { geo: new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), color: 0x9a9a9a },
    { geo: new THREE.SphereGeometry(0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.02, 0), color: 0xffffff },
  ];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, len = 1.2 + (i % 3) * 0.5;
    parts.push({ geo: new THREE.PlaneGeometry(0.03, len, 1, 6).translate(0, -len / 2, 0).rotateY(a).translate(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4), color: 0x707070 });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    parts.push({ geo: new THREE.PlaneGeometry(0.1, 0.9, 1, 5).translate(0, -0.45, 0).rotateY(a).translate(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08), color: 0xb0b0b0 });
  }
  return mergeParts(parts);
}

export class Jellies {
  constructor(scene, ctx) {
    Object.assign(this, { scene, ctx, t: 0 });
    this.geo = jellyGeometry();
    this.mat = jellyMaterial('jelly');
    this.swarms = SWARMS.map((spec, k) => this.makeSwarm(spec, k));
  }

  makeSwarm(spec, k) {
    const mesh = new THREE.InstancedMesh(this.geo, this.mat, spec.n);
    mesh.frustumCulled = false;
    mesh.visible = false;
    const glow = this.ctx.pal.glow;
    const members = Array.from({ length: spec.n }, (_, i) => {
      mesh.setColorAt(i, _c.set(glow[(k + (i % 3 === 0 ? 1 : 0)) % glow.length]));
      return { o: new THREE.Vector3().randomDirection().multiply(_s.set(1, 0.5, 1)).multiplyScalar(Math.random()),
        s: 0.35 + Math.random() * 0.9, ph: Math.random() * 20, tilt: Math.random() * 0.4 };
    });
    this.scene.add(mesh);
    return { spec, mesh, members, center: new THREE.Vector3(), placed: false, retry: 0, name: this.ctx.names.jelly };
  }

  update(dt, cam) {
    this.t += dt;
    for (const sw of this.swarms) {
      if (sw.placed && sw.center.distanceTo(cam) > RANGE) { sw.placed = false; sw.mesh.visible = false; }
      if (!sw.placed && (sw.retry -= dt) <= 0) {
        sw.retry = 0.7;
        sw.placed = Boolean(waterSpot(this.ctx, cam, 20, 100, sw.spec.zones, sw.center, [0.25, 0.75]));
        sw.mesh.visible = sw.placed;
      }
      if (sw.placed) this.drift(sw);
    }
  }

  // Slow bobbing rise-and-sink around the swarm center; the shader does the pulse.
  drift(sw) {
    const floor = this.ctx.h(sw.center.x, sw.center.z) + 1, top = this.ctx.waterY - 1.5;
    sw.members.forEach((j, i) => {
      const t = this.t * 0.25 + j.ph;
      _p.copy(j.o).multiplyScalar(SPREAD).add(sw.center);
      _p.x += Math.sin(t * 0.7) * 1.5;
      _p.z += Math.cos(t * 0.6) * 1.5;
      _p.y = Math.max(floor, Math.min(top, _p.y + Math.sin(t) * 1.6));
      _e.set(Math.sin(t * 1.3) * j.tilt, t, Math.cos(t * 1.1) * j.tilt);
      _m.compose(_p, _q.setFromEuler(_e), _s.setScalar(j.s));
      sw.mesh.setMatrixAt(i, _m);
    });
    sw.mesh.instanceMatrix.needsUpdate = true;
  }

  get visibleCount() { return this.swarms.reduce((s, sw) => s + (sw.placed ? sw.members.length : 0), 0); }

  targets() {
    return this.swarms.filter((sw) => sw.placed).map((sw) => ({ name: sw.name, position: sw.center, radius: SPREAD, count: sw.members.length }));
  }

  dispose() {
    for (const sw of this.swarms) { this.scene.remove(sw.mesh); sw.mesh.dispose(); }
    this.geo.dispose();
    this.mat.dispose();
  }
}
