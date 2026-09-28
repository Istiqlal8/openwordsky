// Pooled blaster bolts fired by NPCs: short glowing streaks that fly to an animal and hit it
// through Wildlife.damage (same flinch, blood spray, kill and loot path as the player's shots).
import * as THREE from 'three';
import { Tracers } from '../weapons/tracers.js';
import { actors, aliveRef } from './actors.js';

const POOL = 24;
const SPEED = 38;
const UP = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();
const _aim = new THREE.Vector3();

export class Bolts {
  constructor(scene) {
    this.geo = new THREE.CapsuleGeometry(0.09, 1.3, 2, 6);
    this.group = new THREE.Group();
    this.items = [];
    this.next = 0;
    for (let i = 0; i < POOL; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.items.push({ mesh, from: new THREE.Vector3(), hit: null, amount: 0, left: 0 });
    }
    scene.add(this.group);
    this.tracers = new Tracers(scene);
  }

  // Thin beam line (scanners, mining lasers); purely visual.
  beam(from, to, color, width = 0.03, life = 0.12) { this.tracers.show(from, to, color, width, life); }

  // Instant mining-beam hit on an animal body.
  zap(from, hit, color, amount) {
    const aim = Bolts.aimOf(hit.body);
    this.beam(from, aim, color, 0.07, 0.25);
    this.impact({ mesh: {}, hit, amount, from }, aim, color);
  }

  // Aim point of a shootable body (chest height).
  static aimOf(body, out = _aim) {
    return out.copy(body.root.position).setY(body.root.position.y + body.radius * 0.8);
  }

  // hit: { group, body } from actors/wildlife; from: muzzle position (Vector3).
  fire(from, hit, color = 0xffa040, amount = 12) {
    const it = this.items[this.next];
    this.next = (this.next + 1) % POOL;
    it.mesh.position.copy(from);
    it.mesh.material.color.set(color);
    it.mesh.visible = true;
    it.from.copy(from);
    Object.assign(it, { hit, amount, left: 3 });
    const aim = Bolts.aimOf(hit.body);
    it.mesh.quaternion.setFromUnitVectors(UP, _d.subVectors(aim, from).normalize());
    this.tracers.show(from, aim, color, 0.025, 0.09); // faint streak along the line of fire
    actors.fx?.flash?.(from, color, 0.25);
    actors.fx?.sparks(from, color, 3, 0.3);
  }

  update(dt) {
    for (const it of this.items) if (it.mesh.visible) this.fly(it, dt);
    this.tracers.update(dt);
  }

  fly(it, dt) {
    const body = it.hit.body;
    it.left -= dt;
    if (!aliveRef(body.ref) || it.left <= 0) { it.mesh.visible = false; return; }
    const aim = Bolts.aimOf(body), m = it.mesh;
    _d.subVectors(aim, m.position);
    const d = _d.length(), step = SPEED * dt;
    if (d <= step + body.radius * 0.5) { this.impact(it, aim); return; }
    _d.divideScalar(d);
    m.position.addScaledVector(_d, step);
    m.quaternion.setFromUnitVectors(UP, _d);
  }

  impact(it, point, color = it.mesh.material.color.getHex()) {
    it.mesh.visible = false;
    const wl = actors.wildlife;
    actors.fx?.sparks(point, color, 6, 0.5);
    if (!wl || !wl.groups.includes(it.hit.group)) return;
    wl.damage(it.hit, point.clone(), { amount: it.amount, from: it.from, npc: true });
  }

  clear() { for (const it of this.items) it.mesh.visible = false; this.tracers.clear(); }

  dispose() {
    for (const it of this.items) it.mesh.material.dispose();
    this.geo.dispose();
    this.group.removeFromParent();
    this.tracers.dispose();
  }
}
