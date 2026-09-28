// World addon: beacon pillars for a rescue 'beacons' stage on its target planet. Walk into one to reach it.
import * as THREE from 'three';
import { hub } from './hub.js';

const REACH = 4;
const RING = [22, 45];      // placement distance from the player
const RELOCATE = 260;       // unreached beacons this far away move near the new landing spot
const COLOR = { off: 0xff5a4a, on: 0x9dff6a };

export class RescueBeacons {
  constructor(ctx) {
    this.ctx = ctx;
    this.list = null;       // the rescue's beacon array these meshes were built for
    this.meshes = [];
    this.t = 0;
    this.geo = new THREE.CylinderGeometry(0.35, 0.8, 70, 8, 1, true).translate(0, 35, 0);
    this.base = new THREE.OctahedronGeometry(1.1, 0);
  }

  get feet() { return this.ctx.surface.feet; }

  update(dt, alive) {
    const rescue = hub.rescue;
    const list = rescue?.beaconsFor(this.ctx.planet.key) ?? null;
    if (rescue?.stage?.type === 'beacons' && !list && rescue.active.dest.key === this.ctx.planet.key) {
      rescue.placeBeacons(this.place(rescue.stage.n));
      return;
    }
    if (list !== this.list) this.rebuild(list);
    if (!list) return;
    this.t += dt;
    this.animate();
    if (alive) this.detect(rescue);
  }

  place(n) {
    const f = this.feet, a0 = Math.random() * Math.PI * 2;
    return Array.from({ length: n }, (_, i) => {
      const a = a0 + (i * Math.PI * 2) / n + (Math.random() - 0.5) * 0.8;
      const r = RING[0] + Math.random() * (RING[1] - RING[0]);
      return { x: f.x + Math.cos(a) * r, z: f.z + Math.sin(a) * r, hit: false };
    });
  }

  // Beacons stored in the save keep their spot; far-away ones (other landing site) move closer.
  relocate(list) {
    const open = list.filter((b) => !b.hit);
    if (!open.some((b) => Math.hypot(b.x - this.feet.x, b.z - this.feet.z) > RELOCATE)) return;
    const fresh = this.place(open.length);
    open.forEach((b, i) => { b.x = fresh[i].x; b.z = fresh[i].z; });
  }

  rebuild(list) {
    this.clearMeshes();
    this.list = list;
    if (!list) return;
    this.relocate(list);
    for (const b of list) this.meshes.push(this.pillar(b));
  }

  pillar(b) {
    const color = b.hit ? COLOR.on : COLOR.off;
    const g = new THREE.Group();
    const beam = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const gem = new THREE.Mesh(this.base, new THREE.MeshBasicMaterial({ color }));
    gem.position.y = 1.8;
    g.add(beam, gem);
    g.position.set(b.x, this.ctx.surface.floorAt(b.x, b.z), b.z);
    this.ctx.surface.scene.add(g);
    return { g, beam, gem, b };
  }

  animate() {
    for (const m of this.meshes) {
      m.gem.rotation.y = this.t * 1.5;
      m.gem.position.y = 1.8 + Math.sin(this.t * 2) * 0.3;
      m.beam.material.opacity = m.b.hit ? 0.2 : 0.35 + Math.sin(this.t * 4) * 0.12;
    }
  }

  detect(rescue) {
    const f = this.feet;
    this.list.forEach((b, i) => {
      if (b.hit || Math.hypot(b.x - f.x, b.z - f.z) > REACH) return;
      const total = this.list.length, done = this.list.filter((x) => x.hit).length + 1;
      this.ctx.sfx?.scan?.();
      rescue.reachBeacon(i);
      hub.toast?.(`Suar tercapai ${done}/${total}`);
      hub.changed?.();
      this.recolor(i);
    });
  }

  recolor(i) {
    const m = this.meshes[i];
    if (!m) return;
    m.beam.material.color.setHex(COLOR.on);
    m.gem.material.color.setHex(COLOR.on);
  }

  clearMeshes() {
    for (const m of this.meshes) {
      this.ctx.surface.scene.remove(m.g);
      m.beam.material.dispose();
      m.gem.material.dispose();
    }
    this.meshes = [];
  }

  dispose() {
    this.clearMeshes();
    this.geo.dispose();
    this.base.dispose();
  }
}
