// Herds of procedural fauna species: walkers, hoppers, hoverers, crawlers and flyers.
// Herds are streamed around the player (life-sim/herd-stream.js); settlements can adopt
// animals as mounts or livestock (a.owner drives them). Behaviour lives in anatomy/brain.js,
// locomotion in anatomy/gait.js + motion.js.
import * as THREE from 'three';
import { Rng } from '../../core/rng.js';
import { buildCreatureTemplate, riggedParts } from './creature-builder.js';
import { think, scare, temper, isPredator, retreat } from './anatomy/brain.js';
import { steer, place, hopStep } from './anatomy/locomotion.js';
import { animateLegs, animateBody } from './anatomy/gait.js';
import { animateBreath, animateHead, animateTail, animateSpine, animateWings, animateTentacles } from './anatomy/motion.js';
import { HerdStream } from '../../life-sim/herd-stream.js';
import { HerdLod } from '../../life-sim/herd-lod.js';
import { pickMountSpecies, pickFlockSpecies, driveOwned } from '../../life-sim/adopt.js';

const HOSTILE = ['Agresif', 'Pemangsa', 'Teritorial'];
const NEAR = 55;   // full IK / slope sampling within this distance of the player
const LOD = 75;    // beyond this, drawn as a static far instance (life-sim/herd-lod.js)
const FAR = 240;   // beyond this, hidden (owned animals keep travelling)
const tmp = new THREE.Vector3();

// Neck rotation needed for the mouth to reach the ground.
function grazeAngle(plan, angle) {
  if (!plan.neckLen) return 0.3;
  const base = plan.bodyY + plan.rh * 0.25, reachLen = plan.neckLen + plan.hs * 0.9;
  return angle + Math.asin(Math.min(1, Math.max(-1, (base - plan.hs * 0.3) / reachLen)));
}

function animState(parts, seed) {
  const neck = parts.necks[0];
  return { phase: 0, g: 0, beta: 0.6, stride: 0.3, move: 0, pant: 0, breath: seed % 7, squash: 0, crouch: 0,
    blinkT: 1 + (seed % 5), seed: 1 + (seed % 2147483646), tailT: seed % 5, tailLag: new Float32Array(parts.tails.length),
    graze: neck ? grazeAngle(parts.plan, neck.userData.angle) : 0, wingT: 0, glideT: 2, flapAmp: 1 };
}

export class Herds {
  // opts: { species?: fauna list (default: the planet's), pick?(x, z, rng, nearSite), dry?(x, z), mounts?: false }
  constructor(scene, planet, heightFn, origin, opts = {}) {
    this.scene = scene;
    this.origin = origin;
    this.calm = 10; // seconds before hostile species start hunting
    this.heightFn = heightFn;
    this.hasWater = !!planet.terrain.hasWater;
    this.waterY = planet.terrain.hasWater ? planet.terrain.waterY : -Infinity;
    this.dryFn = opts.dry ?? null;
    this.mounts = opts.mounts !== false;
    this.rng = new Rng(planet.seed ^ 0x4e2d);
    this.templates = new Map();
    this.animals = [];
    this.list = [];
    this.onBite = null;
    this.frame = 0;
    this.lod = new HerdLod(scene);
    this.species = (opts.species ?? planet.species.fauna).filter((sp) => sp.herd > 0);
    this.stream = new HerdStream(this, planet.seed, this.species, { pick: opts.pick });
    this.stream.update(0, origin, true);
  }

  isHunter(sp) { return isPredator(sp) || HOSTILE.includes(sp.lore.temperament); }

  template(sp) {
    if (!this.templates.has(sp)) this.templates.set(sp, buildCreatureTemplate(sp));
    return this.templates.get(sp);
  }

  // One herd of `sp` around (x, z) -> spawned animals (at most `cap`).
  spawnHerd(sp, x, z, spread, cap = 99) {
    const flying = sp.genes.move === 'terbang' || sp.genes.move === 'melayang';
    const center = this.landSpot(x, z, spread, flying);
    if (!center) return [];
    const out = [];
    let leader = null;
    for (let i = 0; i < Math.min(sp.herd, cap); i++) {
      const pos = center.clone().add(tmp.set(this.rng.range(-4, 4), 0, this.rng.range(-4, 4)));
      const a = this.spawn(sp, pos, sp.genes.size * this.rng.range(0.8, 1.2), leader);
      leader ??= a;
      out.push(a);
    }
    this.refreshBodies();
    return out;
  }

  spawn(sp, pos, scale, leader = null) {
    const root = this.template(sp).root.clone();
    root.scale.setScalar(scale);
    root.rotation.y = this.rng.range(0, Math.PI * 2);
    this.scene.add(root);
    const a = this.makeAnimal(root, sp, pos, scale, leader);
    this.animals.push(a);
    return a;
  }

  // Settlement animals: role 'mount' (big walker to ride) or 'flock' (livestock) -> animal | null.
  adopt(role, pos, owner) {
    if (role === 'mount' && !this.mounts) return null;
    const sp = owner.species ??= role === 'mount' ? pickMountSpecies(this.species) : pickFlockSpecies(this.species, owner.seed ?? 0);
    if (!sp) return null;
    const scale = role === 'mount' ? Math.min(2.4, Math.max(sp.genes.size, 1.5)) : sp.genes.size * this.rng.range(0.85, 1.1);
    const a = this.spawn(sp, new THREE.Vector3(pos.x, 0, pos.z), scale);
    Object.assign(a, { owner, hostile: false, predator: false });
    this.refreshBodies();
    return a;
  }

  makeAnimal(root, sp, pos, scale, leader) {
    const g = sp.genes, parts = riggedParts(root), seed = this.rng.int(1e9);
    const walk = (0.7 + g.speed * 0.15) * Math.sqrt(scale) * (g.move === 'merayap' ? 0.6 : 1);
    return { root, parts, sp, pos, target: pos.clone(), dest: pos.clone(), t: this.rng.range(0, 9), scale,
      hop: 0, vy: 0, biteCd: 0, hostile: HOSTILE.includes(sp.lore.temperament), predator: isPredator(sp),
      flying: g.move === 'terbang' || g.move === 'melayang', hopper: g.move === 'lompat' && !parts.plan.serpent, walkSpeed: walk, runSpeed: Math.max(walk * 2, g.speed * 1.7),
      speed: 0, want: 0, turn: 0, climb: 0, bank: 0, alt: 0, state: 'idle', stateT: this.rng.range(0, 4), fleeT: 0,
      threat: new THREE.Vector3(), looking: false, lookAt: new THREE.Vector3(), leader, prey: null, huntT: 0,
      hunger: 10 + this.rng.range(0, 20), fleeing: false, anim: animState(parts, seed),
      pose: { head: 0, lie: 0, mouth: 0, alert: 0, sleep: false }, goal: { head: 0, lie: 0, mouth: 0, alert: 0, sleep: false } };
  }

  // Dry ground near (x, z) (flyers can start anywhere), or null.
  landSpot(x, z, spread, flying) {
    const out = new THREE.Vector3();
    for (let i = 0; i < 10; i++) {
      out.set(x + this.rng.range(-spread, spread), 0, z + this.rng.range(-spread, spread));
      if (flying || this.dry(out.x, out.z)) return out;
    }
    return null;
  }

  dry(x, z) { return this.dryFn ? this.dryFn(x, z) : this.heightFn(x, z) > this.waterY + 0.3; }

  flies(a) { return a.flying; }

  // Sets a.dest to a nearby spot at the water's edge; false when none is close.
  shore(a) {
    for (let r = 6; r <= 36; r += 6) {
      for (let k = 0; k < 12; k++) {
        const ang = (k / 12) * Math.PI * 2, x = a.pos.x + Math.cos(ang) * r, z = a.pos.z + Math.sin(ang) * r;
        if (this.heightFn(x, z) > this.waterY) continue;
        const back = 1.2 + a.scale;
        a.dest.set(x - Math.cos(ang) * back, 0, z - Math.sin(ang) * back);
        return this.dry(a.dest.x, a.dest.z);
      }
    }
    return false;
  }

  animate(a, dt, near) {
    const env = this.env;
    env.dt = dt;
    env.near = near;
    const p = a.pose, k = Math.min(1, dt * 3);
    p.head += (a.goal.head - p.head) * k;
    p.lie += (a.goal.lie - p.lie) * dt * 0.8 * (a.goal.lie > p.lie ? 1 : 2.5);
    p.lie = Math.max(0, Math.min(1, p.lie));
    p.mouth += (a.goal.mouth - p.mouth) * Math.min(1, dt * 8);
    p.alert += (a.goal.alert - p.alert) * k;
    p.sleep = a.goal.sleep && p.lie > 0.9;
    animateBody(a, env);
    animateLegs(a, env);
    animateBreath(a, dt);
    animateHead(a, dt);
    animateTail(a, dt);
    animateSpine(a, dt);
    animateWings(a, dt);
    animateTentacles(a, dt);
  }

  update(dt, player) {
    this.calm -= dt;
    this.player = player;
    this.frame++;
    this.env ??= { heightFn: this.heightFn, dt, near: true };
    this.stream.update(dt, player);
    this.lod.begin();
    const gone = [];
    for (let i = 0; i < this.animals.length; i++) {
      const a = this.animals[i];
      if (a.dead) { if (this.corpse(a, dt)) gone.push(a); continue; }
      const dx = a.pos.x - player.x, dz = a.pos.z - player.z, d2 = dx * dx + dz * dz;
      if (a.owner) driveOwned(this, a, dt);
      else think(this, a, player, dt);
      hopStep(this, a, dt);
      steer(this, a, dt, i);
      place(this, a, dt);
      this.draw(a, dt, d2);
    }
    this.lod.end();
    for (const a of gone) this.kill(a);
  }

  // Near: full rig animation; mid: static far instance; beyond FAR: hidden.
  draw(a, dt, d2) {
    const far = d2 > LOD * LOD;
    a.root.visible = d2 < FAR * FAR && !(far && this.lod.put(a, this.template(a.sp)));
    if (a.root.visible) this.animate(a, dt, d2 < NEAR * NEAR);
  }

  // Caught by a predator: stop moving and drop onto its side.
  killPrey(prey) {
    prey.dead = true;
    prey.corpseT = 14;
    prey.fleeT = 0;
  }

  // Lies still, rolls onto its side and sinks away; true when it should be removed.
  corpse(a, dt) {
    a.corpseT -= dt;
    const r = a.root.rotation;
    r.z += (1.35 - r.z) * Math.min(1, dt * 3);
    if (a.corpseT < 3) a.root.position.y -= dt * 0.4;
    return a.corpseT <= 0;
  }

  refreshBodies() {
    this.list = this.animals.map((a) => (a.body ??= { root: a.root, radius: Math.max(0.6, a.sp.genes.size * 0.8), ref: a, hp: 20 + a.sp.genes.size * 15 }));
  }

  // Shootable bodies: { root, radius, ref }.
  bodies() { return this.list; }

  // Removed from the world (streamed out, tamed, killed); herd mates pick a new leader.
  remove(a) {
    const i = this.animals.indexOf(a);
    if (i < 0) return;
    this.scene.remove(a.root);
    a.dead = true;
    this.animals.splice(i, 1);
    const heir = this.animals.find((b) => b.sp === a.sp && !b.owner) ?? null;
    for (const b of this.animals) if (b.leader === a) b.leader = b === heir ? null : heir;
    this.refreshBodies();
  }

  kill(a) { this.remove(a); }

  // Shot: timid species bolt with their herd, the rest turn on the shooter.
  provoke(a, from = this.player) {
    if (a.owner) return;
    if (temper(a.sp).shy) {
      const at = from ?? a.root.position;
      scare(a, at, 8);
      for (const b of this.animals) if (b !== a && b.sp === a.sp) scare(b, at, 6);
      return;
    }
    a.hostile = true;
    this.calm = 0;
  }

  // Hit by an NPC: badly hurt attackers back off from the shooter.
  npcHit(a, from, left = 0) { if (!a.owner && left < 0.45) retreat(a, from); }

  nearest(pos, maxDist = 30) {
    let best = null;
    for (const a of this.animals) {
      const d = a.root.position.distanceTo(pos);
      if (d < maxDist && (!best || d < best.distance)) best = { name: a.sp.name, species: a.sp, distance: d };
    }
    return best;
  }

  dispose() {
    for (const a of this.animals) this.scene.remove(a.root);
    for (const tpl of this.templates.values()) {
      tpl.root.traverse((o) => o.geometry?.dispose());
      tpl.materials.forEach((m) => m.dispose());
    }
    this.stream.clear();
    this.lod.dispose();
    this.animals = [];
    this.list = [];
    this.templates.clear();
  }
}
