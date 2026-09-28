// Fish schools (boids-lite): each school is one InstancedMesh; a leader wanders its depth
// zone and every fish chases its own slowly orbiting slot around the leader, scattering away
// from the camera (a diver or the submarine). Schools out of range respawn near the camera.
import * as THREE from 'three';
import { fishMaterial } from './ocean-kit.js';
import { plainFish, stripedFish, lanternFish } from './fish-geo.js';
import { waterSpot, clampToWater } from './water-spot.js';

// zones, count, size (m), speed (m/s), spread (m), band (water column), look
const SPECS = [
  { kind: 'clown', zones: ['reef'], n: 24, size: [0.12, 0.18], speed: 1.4, spread: 2.5, band: [0, 0.2], look: 'clown' },
  { kind: 'reef', zones: ['reef'], n: 60, size: [0.2, 0.42], speed: 1.8, spread: 5, band: [0.05, 0.5], look: 'mixed' },
  { kind: 'reef', zones: ['reef'], n: 60, size: [0.2, 0.42], speed: 1.8, spread: 5, band: [0.05, 0.5], look: 'mixed' },
  { kind: 'sardine', zones: ['reef', 'mid'], n: 150, size: [0.16, 0.24], speed: 3, spread: 6, band: [0.3, 0.8], look: 'silver' },
  { kind: 'sardine', zones: ['mid'], n: 150, size: [0.16, 0.24], speed: 3, spread: 7, band: [0.3, 0.8], look: 'silver' },
  { kind: 'tuna', zones: ['mid'], n: 40, size: [0.9, 1.5], speed: 5.5, spread: 9, band: [0.3, 0.8], look: 'tuna' },
  { kind: 'lantern', zones: ['abyss'], n: 80, size: [0.12, 0.2], speed: 1.4, spread: 7, band: [0.1, 0.7], look: 'lantern' },
  { kind: 'lantern', zones: ['abyss', 'mid'], n: 60, size: [0.12, 0.2], speed: 1.4, spread: 7, band: [0.05, 0.4], look: 'lantern' },
];
const RANGE = 140, SCARE = 6;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YZX');
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();

export class Schools {
  constructor(scene, ctx) {
    Object.assign(this, { scene, ctx, t: 0 });
    this.geos = { plain: plainFish(), clown: stripedFish(ctx.pal.earth ? 0xff7a1a : ctx.pal.fish[0]), lantern: lanternFish(ctx.pal.glow[0]) };
    this.mats = { lit: fishMaterial('fish'), unlit: fishMaterial('fish-glow', {}, true) };
    this.list = SPECS.map((spec) => this.makeSchool(spec));
  }

  makeSchool(spec) {
    const geo = spec.look === 'clown' ? this.geos.clown : spec.look === 'lantern' ? this.geos.lantern : this.geos.plain;
    const mesh = new THREE.InstancedMesh(geo, spec.look === 'lantern' ? this.mats.unlit : this.mats.lit, spec.n);
    mesh.frustumCulled = false;
    mesh.visible = false;
    const fish = Array.from({ length: spec.n }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(),
      o: new THREE.Vector3().randomDirection().multiply(_v.set(1, 0.35, 1)).multiplyScalar(0.3 + Math.random() * 0.7),
      s: spec.size[0] + Math.random() * (spec.size[1] - spec.size[0]) }));
    fish.forEach((f, i) => mesh.setColorAt(i, this.colorOf(spec.look, i)));
    this.scene.add(mesh);
    return { spec, mesh, fish, name: this.ctx.names[spec.kind], center: new THREE.Vector3(), target: new THREE.Vector3(),
      dir: new THREE.Vector3(1, 0, 0), placed: false, retry: Math.random() * 0.5, spin: Math.random() * 6 };
  }

  colorOf(look, i) {
    const pal = this.ctx.pal;
    if (look === 'mixed') return _c.set(pal.fish[i % pal.fish.length]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
    if (look === 'silver') return _c.set(pal.earth ? 0xc4d2dc : pal.fish[2]).offsetHSL(0, -0.1, 0.15);
    if (look === 'tuna') return _c.set(pal.earth ? 0x40648c : pal.fish[1]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
    return _c.set(0xffffff);
  }

  place(sc, cam) {
    if (!waterSpot(this.ctx, cam, 25, 105, sc.spec.zones, sc.center, sc.spec.band)) return false;
    sc.target.copy(sc.center);
    for (const f of sc.fish) f.p.copy(f.o).multiplyScalar(sc.spec.spread).add(sc.center);
    sc.placed = true;
    sc.mesh.visible = true;
    return true;
  }

  // Leader: cruise to a new point in the same zone; bolt away when the camera gets close.
  lead(sc, dt, cam) {
    const spec = sc.spec, d = sc.center.distanceTo(cam);
    if (d < spec.spread + SCARE) sc.target.copy(sc.center).addScaledVector(_v.subVectors(sc.center, cam).normalize(), 14);
    else if (sc.center.distanceTo(sc.target) < 2 && !waterSpot(this.ctx, sc.center, 10, 35, spec.zones, sc.target, spec.band)) sc.target.copy(sc.center);
    _v.subVectors(sc.target, sc.center);
    const len = _v.length(), sp = spec.speed * (d < spec.spread + SCARE ? 2 : 1);
    if (len > 0.01) {
      sc.dir.lerp(_v.divideScalar(len), Math.min(1, dt * 1.5)).normalize();
      sc.center.addScaledVector(sc.dir, Math.min(len, sp * dt));
    }
    if (!clampToWater(this.ctx, sc.center, 0.8, 0.8)) sc.target.copy(sc.center).addScaledVector(sc.dir, -10);
  }

  // Each fish steers toward its orbiting slot and away from the camera.
  swim(sc, dt, cam) {
    const spec = sc.spec, t = this.t * 0.25 + sc.spin, cs = Math.cos(t), sn = Math.sin(t);
    const top = this.ctx.waterY - 0.3, bottom = this.ctx.h(sc.center.x, sc.center.z) + 0.2;
    sc.fish.forEach((f, i) => {
      _p.set(f.o.x * cs - f.o.z * sn, f.o.y, f.o.x * sn + f.o.z * cs).multiplyScalar(spec.spread).add(sc.center);
      _v.subVectors(_p, f.p).multiplyScalar(1.6);
      const dc = f.p.distanceTo(cam);
      if (dc < SCARE) _v.addScaledVector(_s.subVectors(f.p, cam).normalize(), (SCARE - dc) * 4);
      f.v.lerp(_v.addScaledVector(sc.dir, spec.speed), Math.min(1, dt * 2.5));
      const max = spec.speed * 2.2, len = f.v.length();
      if (len > max) f.v.multiplyScalar(max / len);
      f.p.addScaledVector(f.v, dt);
      f.p.y = Math.max(bottom, Math.min(top, f.p.y));
      this.orient(sc.mesh, i, f);
    });
    sc.mesh.instanceMatrix.needsUpdate = true;
  }

  orient(mesh, i, f) {
    const h = Math.hypot(f.v.x, f.v.z);
    _e.set(0, Math.atan2(-f.v.z, f.v.x), Math.atan2(f.v.y, h) * 0.7);
    _m.compose(f.p, _q.setFromEuler(_e), _s.setScalar(f.s));
    mesh.setMatrixAt(i, _m);
  }

  update(dt, cam) {
    this.t += dt;
    for (const sc of this.list) {
      if (sc.placed && sc.center.distanceTo(cam) > RANGE) { sc.placed = false; sc.mesh.visible = false; }
      if (!sc.placed && (sc.retry -= dt) <= 0) { sc.retry = 0.5; if (!this.place(sc, cam)) continue; }
      if (!sc.placed) continue;
      this.lead(sc, dt, cam);
      this.swim(sc, dt, cam);
    }
  }

  get visibleCount() { return this.list.reduce((s, sc) => s + (sc.placed ? sc.fish.length : 0), 0); }

  // Placed schools as sonar/label targets: { name, position, radius, count }.
  targets() {
    return this.list.filter((sc) => sc.placed).map((sc) => ({ name: sc.name, position: sc.center, radius: sc.spec.spread, count: sc.fish.length }));
  }

  dispose() {
    for (const sc of this.list) { this.scene.remove(sc.mesh); sc.mesh.dispose(); }
    Object.values(this.geos).forEach((g) => g.dispose());
    Object.values(this.mats).forEach((m) => m.dispose());
    this.list = [];
  }
}
