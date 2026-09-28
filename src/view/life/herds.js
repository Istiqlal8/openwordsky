// Herds of procedural fauna species: walkers, hoppers, hoverers, crawlers and flyers.
// Behaviour lives in anatomy/brain.js, locomotion in anatomy/gait.js + motion.js.
import * as THREE from 'three';
import { Rng } from '../../core/rng.js';
import { buildCreatureTemplate, riggedParts } from './creature-builder.js';
import { think, scare, temper, isPredator } from './anatomy/brain.js';
import { steer, place, hopStep } from './anatomy/locomotion.js';
import { animateLegs, animateBody } from './anatomy/gait.js';
import { animateBreath, animateHead, animateTail, animateSpine, animateWings, animateTentacles } from './anatomy/motion.js';

const MAX_ANIMALS = 36;
const HOSTILE = ['Agresif', 'Pemangsa', 'Teritorial'];
const NEAR = 55; // full IK / slope sampling within this distance of the player
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
  constructor(scene, planet, heightFn, origin) {
    this.scene = scene;
    this.origin = origin;
    this.calm = 10; // seconds before hostile species start hunting
    this.heightFn = heightFn;
    this.hasWater = !!planet.terrain.hasWater;
    this.waterY = planet.terrain.hasWater ? planet.terrain.waterY : -Infinity;
    this.rng = new Rng(planet.seed ^ 0x4e2d);
    this.templates = [];
    this.animals = [];
    this.list = [];
    this.onBite = null;
    for (const sp of planet.species.fauna) this.addSpecies(sp);
  }

  addSpecies(sp) {
    const tpl = buildCreatureTemplate(sp);
    this.templates.push(tpl);
    const g = sp.genes, flying = g.move === 'terbang' || g.move === 'melayang';
    const center = this.landSpot(flying);
    let leader = null;
    for (let i = 0; i < sp.herd && this.animals.length < MAX_ANIMALS; i++) {
      const root = tpl.root.clone();
      const scale = g.size * this.rng.range(0.8, 1.2);
      root.scale.setScalar(scale);
      const pos = center.clone().add(tmp.set(this.rng.range(-4, 4), 0, this.rng.range(-4, 4)));
      root.rotation.y = this.rng.range(0, Math.PI * 2);
      this.scene.add(root);
      const a = this.makeAnimal(root, sp, pos, scale, leader);
      leader ??= a;
      this.animals.push(a);
    }
    this.refreshBodies();
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

  // Dry ground 30..70 units from spawn (flyers can start anywhere).
  landSpot(flying) {
    const out = new THREE.Vector3();
    for (let i = 0; i < 24; i++) {
      const a = this.rng.range(0, Math.PI * 2), r = this.rng.range(30, 70 + i * 5);
      out.set(this.origin.x + Math.cos(a) * r, 0, this.origin.z + Math.sin(a) * r);
      if (flying || this.dry(out.x, out.z)) break;
    }
    return out;
  }

  dry(x, z) { return this.heightFn(x, z) > this.waterY + 0.3; }

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
    this.env ??= { heightFn: this.heightFn, dt, near: true };
    for (let i = 0; i < this.animals.length; i++) {
      const a = this.animals[i];
      think(this, a, player, dt);
      hopStep(this, a, dt);
      steer(this, a, dt, i);
      place(this, a, dt);
      const dx = a.pos.x - player.x, dz = a.pos.z - player.z;
      this.animate(a, dt, dx * dx + dz * dz < NEAR * NEAR);
    }
  }

  refreshBodies() {
    this.list = this.animals.map((a) => (a.body ??= { root: a.root, radius: Math.max(0.6, a.sp.genes.size * 0.8), ref: a, hp: 20 + a.sp.genes.size * 15 }));
  }

  // Shootable bodies: { root, radius, ref }.
  bodies() { return this.list; }

  kill(a) {
    const i = this.animals.indexOf(a);
    if (i < 0) return;
    this.scene.remove(a.root);
    this.animals.splice(i, 1);
    const heir = this.animals.find((b) => b.sp === a.sp) ?? null;
    for (const b of this.animals) if (b.leader === a) b.leader = b === heir ? null : heir;
    this.refreshBodies();
  }

  // Shot: timid species bolt with their herd, the rest turn on the player.
  provoke(a) {
    if (temper(a.sp).shy) {
      const from = this.player ?? a.root.position;
      scare(a, from, 8);
      for (const b of this.animals) if (b !== a && b.sp === a.sp) scare(b, from, 6);
      return;
    }
    a.hostile = true;
    this.calm = 0;
  }

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
    for (const tpl of this.templates) {
      tpl.root.traverse((o) => o.geometry?.dispose());
      tpl.materials.forEach((m) => m.dispose());
    }
    this.animals = [];
    this.list = [];
    this.templates = [];
  }
}
