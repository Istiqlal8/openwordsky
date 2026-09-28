// Earth's animals: deer herds on the meadows near the landing site, an eagle flock overhead,
// a "Jurassic" plain further inland with triceratops, brontosaurus, raptors and a T-rex,
// monitor lizards out in the desert, humpback whales in the bay, and small procedural
// critters around the player (rabbits, butterflies, fish, seagulls; see earth-critters.js).
// Same group API as the other Wildlife groups: update / nearest / bodies / kill / provoke.
import * as THREE from 'three';
import { Rng } from '../core/rng.js';
import { ModelGroup } from '../view/life/models/model-group.js';
import { moveBird } from '../view/life/models/megafauna-moves.js';
import { moveGrazer, moveHunter, moveSwimmer, spotNear } from './earth-moves.js';
import { earthBiome } from './earth-biome.js';
import { EARTH_SEA } from './earth-terrain.js';
import { EarthCritters } from './earth-critters.js';

// height: m (top of the model); far: draw distance; radius: hit sphere / height.
const SPECS = {
  deer: { model: 'deer', name: 'Rusa', height: [1.9, 2.4], speed: 1.6, flee: 11, hp: 60, radius: 0.45, far: 380, tint: 0x9a6a3a },
  eagle: { model: 'bird', name: 'Elang', height: [1.4, 1.8], speed: 13, hp: 30, radius: 0.7, far: 500, tint: 0x6a4a2a },
  trex: { model: 'trex', name: 'T-Rex', height: [8.5, 10], speed: 3.2, chase: 11, sight: 60, bite: 30, hp: 320, radius: 0.45, far: 1000, tint: 0x5a6a3a },
  raptor: { model: 'raptor', name: 'Raptor', height: [2.4, 2.8], speed: 3.5, chase: 12, sight: 38, bite: 10, hp: 60, radius: 0.5, far: 500, tint: 0x8a6a4a },
  longneck: { model: 'longneck', name: 'Brontosaurus', height: [20, 24], speed: 2.4, flee: 4, hp: 600, radius: 0.3, far: 1600, tint: 0x6a7a5a },
  triceratops: { model: 'triceratops', name: 'Triceratops', height: [5, 6], speed: 2.2, flee: 7, hp: 260, radius: 0.55, far: 800, tint: 0x7a6a4a },
  lizard: { model: 'lizard', name: 'Biawak', height: [0.7, 0.9], speed: 1, chase: 4, sight: 12, bite: 6, hp: 50, radius: 1.1, far: 250, tint: 0x6a6a3a },
  whale: { model: 'whale', name: 'Paus Bungkuk', height: [1, 1], speed: 3.2, hp: 400, radius: 0.18, far: 900, tint: 0x3a4a5a, length: [12, 15] },
};
const BUDGET = 24; // skinned models drawn per frame (nearest first)

export class EarthFauna extends ModelGroup {
  constructor(scene, planet, heightFn, origin) {
    super(scene);
    this.h = heightFn;
    this.origin = new THREE.Vector3(origin.x, 0, origin.z);
    this.rng = new Rng(0xea27f);
    this.calm = 12;
    this.onBite = null;
    this.herds = [];
    this.land = (x, z) => this.h(x, z) > EARTH_SEA + 1.2; // land animals never step into water
    this.critters = new EarthCritters(scene, heightFn, this.origin);
    this.populate();
  }

  biomeAt(x, z) {
    const y = this.h(x, z);
    return earthBiome(x, z, y, Math.hypot(this.h(x + 2, z) - y, this.h(x, z + 2) - y) / 2);
  }

  // A spot r0..r1 from the origin whose biome is in `biomes` (searching outward), or null.
  region(biomes, r0, r1) {
    for (let r = r0; r < r1; r += (r1 - r0) / 6) {
      const p = spotNear(this.rng, this.origin, r, r + (r1 - r0) / 6, (x, z) => biomes.includes(this.biomeAt(x, z)), 30);
      if (p) return p;
    }
    return null;
  }

  populate() {
    for (const [r0, r1, n] of [[90, 220, 5], [250, 520, 6], [400, 800, 4]]) this.addHerd('deer', ['grass', 'forest'], r0, r1, n, 45);
    this.addFlock(3);
    const plains = this.region(['grass'], 700, 1300);
    if (plains) this.addJurassic(plains);
    const desert = this.region(['desert'], 1800, 4500);
    if (desert) for (let i = 0; i < 4; i++) this.addHunter('lizard', desert, 40, this.rng.chance(0.5));
    const sea = this.region(['water'], 150, 900);
    if (sea) for (let i = 0; i < 2; i++) this.addWhale(sea);
  }

  addJurassic(home) {
    const meadow = (x, z) => this.land(x, z);
    this.addHerd('triceratops', null, 0, 0, 4, 90, home);
    this.addHerd('longneck', null, 0, 0, 3, 180, spotNear(this.rng, home, 80, 200, meadow) ?? home);
    for (let i = 0; i < 3; i++) this.addHunter('raptor', spotNear(this.rng, home, 180, 300, meadow) ?? home, 110, true);
    this.addHunter('trex', spotNear(this.rng, home, 260, 400, meadow) ?? home, 200, true);
  }

  addHerd(kind, biomes, r0, r1, size, range, at = null) {
    const home = at ?? this.region(biomes, r0, r1);
    if (!home) return;
    const herd = { home, panic: 0 };
    this.herds.push(herd);
    for (let i = 0; i < size; i++) {
      const pos = spotNear(this.rng, home, 0, 12 + range * 0.1, this.land) ?? home.clone();
      this.add(kind, pos, { herd, range, move: 'graze' });
    }
  }

  addHunter(kind, home, range, hostile) {
    this.add(kind, spotNear(this.rng, home, 0, 20, this.land) ?? home.clone(), { home, range, hostile, biteCd: 0, move: 'hunt' });
  }

  addFlock(size) {
    const flock = { center: this.origin.clone().add(new THREE.Vector3(60, 0, -40)) };
    const dir = this.rng.chance(0.5) ? 1 : -1;
    for (let i = 0; i < size; i++) {
      this.add('eagle', flock.center.clone(), { flock, dir, move: 'fly', altitude: this.rng.range(45, 70), angle: this.rng.range(0, 6.3),
        orbit: this.rng.range(25, 45), waterY: EARTH_SEA, type: { speed: SPECS.eagle.speed } });
    }
  }

  addWhale(home) {
    const deep = (x, z) => this.h(x, z) < EARTH_SEA - 12;
    const w = this.add('whale', spotNear(this.rng, home, 0, 120, deep) ?? home.clone(), { home, range: 260, move: 'swim', t: this.rng.range(0, 20) });
    w.length = this.rng.range(...SPECS.whale.length);
  }

  add(kind, pos, extra) {
    const spec = SPECS[kind], r = this.rng, height = r.range(...spec.height);
    const a = { kind, spec, root: new THREE.Group(), model: spec.model, height, scale: height / spec.height[0],
      tint: spec.tint, tintStrength: 0.25, rng: new Rng(r.int(0x7fffffff)), seed: r.next(), pos, target: pos.clone(),
      name: spec.name, radius: height * spec.radius, maxHp: spec.hp, wait: r.range(0, 4), ...extra };
    a.root.rotation.order = 'YXZ';
    a.root.rotation.y = r.range(0, Math.PI * 2);
    this.attach(a);
    return a;
  }

  // Whales: scale the model by body length instead of height.
  swapIn(a) {
    const fresh = !a.inst && super.swapIn(a);
    if (fresh && a.kind === 'whale') {
      const s = a.length / a.inst.template.length;
      a.inst.scene.scale.setScalar(s);
      a.radius = s * 0.5;
      a.inst.scene.position.y = -0.5 * s;
    }
    return Boolean(a.inst);
  }

  grounded(player) { return player.y - this.h(player.x, player.z) < 4.5; }

  move(a, dt, player) {
    if (a.move === 'graze') return moveGrazer(a, dt, player, this.land);
    if (a.move === 'hunt') return moveHunter(a, dt, player, this.land, this);
    if (a.move === 'swim') return moveSwimmer(a, dt, (x, z) => this.h(x, z) < EARTH_SEA - 12);
    return moveBird(a, dt, player, this.h);
  }

  y(a) {
    if (a.move === 'fly') return a.pos.y;
    if (a.move === 'swim') return EARTH_SEA - 2.2 + Math.sin(a.t * 0.35) * 1.6;
    return this.h(a.pos.x, a.pos.z);
  }

  update(dt, player) {
    this.calm -= dt;
    for (const h of this.herds) h.panic -= dt;
    for (const a of this.list) a.dist = a.root.position.distanceTo(player);
    this.list.sort((p, q) => p.dist - q.dist);
    let left = BUDGET;
    for (const a of this.list) {
      const speed = this.move(a, dt, player);
      a.root.position.set(a.pos.x, this.y(a), a.pos.z);
      if (this.show(a, dt, left > 0, speed)) left--;
    }
    this.critters.update(dt, player);
  }

  // Own distance culling and model budget (Earth's animals are seen from much further away).
  show(a, dt, budget, speed) {
    const ready = this.swapIn(a);
    a.root.visible = a.dist < a.spec.far && (!ready || budget);
    if (!a.root.visible || !ready) return false;
    const mode = a.move === 'swim' ? 'swim' : a.move === 'fly' ? (Math.sin(a.angle * 1.5 + a.seed * 9) > 0.2 ? 'glide' : 'fly') : 'walk';
    if (a.dist < 320 || (this.frame = (this.frame ?? 0) + 1) % 3 === 0) a.anim.update(dt, { speed: speed / a.height, mode });
    return true;
  }

  provoke(a) {
    if (a.critter) return;
    if (a.herd) a.herd.panic = 8;
    if (a.move === 'hunt') { a.hostile = true; this.calm = 0; }
  }

  bodies() { return [...super.bodies(), ...this.critters.bodies()]; }

  kill(a) {
    if (a.critter) this.critters.kill(a);
    else super.kill(a);
  }

  nearest(pos, maxDist = 60) {
    const a = super.nearest(pos, maxDist), c = this.critters.nearest(pos, 30);
    return !a || (c && c.distance < a.distance) ? c : a;
  }

  dispose() {
    super.dispose();
    this.critters.dispose();
  }
}
