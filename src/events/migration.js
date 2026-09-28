// Planet event: a herd of one calm species crosses right past the player. Q on a migrating
// animal gives +2 products (see animal-gather.js, a.migrating).
import * as THREE from 'three';

const SIDE = 55;      // start/end distance from the player along the path
const OFFSET = 10;    // the path passes this far beside the player
const HURRY = 1.5;    // walk speed multiplier while migrating
const ARRIVED = 6;

export class Migration {
  constructor(ctx) {
    this.ctx = ctx;
    this.id = 'migrasi';
    this.duration = 90 + Math.random() * 60;
    this.participated = false;
    this.animals = this.pickHerd();
    this.failed = this.animals.length < 2;
    this.dustT = 0;
    if (this.failed) return;
    const name = this.animals[0].sp.name;
    this.title = `Migrasi: kawanan ${name} melintas. Q untuk bonus`;
    this.endText = `Migrasi ${name} selesai`;
    this.plan();
  }

  get helped() { return this.participated; }
  set helped(v) { this.participated = v; }

  // Largest calm species in the procedural herds.
  pickHerd() {
    const list = (this.ctx.creatures?.groups?.[0]?.animals ?? []).filter((a) => !a.dead && !a.hostile && a.sp);
    const bySp = new Map();
    for (const a of list) (bySp.get(a.sp) ?? bySp.set(a.sp, []).get(a.sp)).push(a);
    return [...bySp.values()].sort((x, y) => y.length - x.length)[0] ?? [];
  }

  // Teleport the herd to one side of the player and send it across.
  plan() {
    const f = this.ctx.surface.feet, ang = Math.random() * Math.PI * 2;
    const s = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)), t = new THREE.Vector3(-s.z, 0, s.x);
    const mid = new THREE.Vector3(f.x, 0, f.z).addScaledVector(t, OFFSET);
    const from = mid.clone().addScaledVector(s, -SIDE);
    this.to = mid.clone().addScaledVector(s, SIDE);
    this.animals.forEach((a, i) => {
      a.slot = new THREE.Vector3((i % 3 - 1) * 3, 0, Math.floor(i / 3) * 3);
      a.pos.set(from.x + a.slot.x, 0, from.z + a.slot.z);
      a.walkSpeed0 = a.walkSpeed;
      a.walkSpeed *= HURRY;
      a.migrating = this;
    });
  }

  // Runs before the herd brain each frame: keep every animal wandering toward the far side.
  update(dt) {
    this.animals = this.animals.filter((a) => !a.dead && this.ctx.creatures?.groups?.[0]?.animals.includes(a));
    let moving = 0;
    for (const a of this.animals) {
      const dx = this.to.x + a.slot.x - a.pos.x, dz = this.to.z + a.slot.z - a.pos.z;
      if (Math.hypot(dx, dz) < ARRIVED) continue;
      moving++;
      a.dest.set(this.to.x + a.slot.x, 0, this.to.z + a.slot.z);
      if (a.state !== 'flee') { a.state = 'wander'; a.stateT = Math.max(a.stateT, 2); }
    }
    this.dust(dt);
    if (!moving) this.done = true;
  }

  dust(dt) {
    this.dustT -= dt;
    if (this.dustT > 0) return;
    this.dustT = 0.4;
    for (const a of this.animals.slice(0, 4)) {
      if (!a.flying && a.speed > 0.5) this.ctx.fx?.puff(a.root.position, 0x9a8a70, 1.2, 1.2);
    }
  }

  dispose() {
    for (const a of this.animals) {
      if (a.walkSpeed0) a.walkSpeed = a.walkSpeed0;
      a.migrating = null;
    }
    this.animals = [];
  }
}
