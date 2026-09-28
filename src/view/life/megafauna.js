// Megafauna ("hewan besar"): big model-driven animals that give every planet a sense of scale.
//   grazers - alien deer herds (3-7) that bolt from the player, on lush/wet worlds with flora,
//   lizards - slow giant lizards on dry/hot worlds, some of them aggressive,
//   birds   - flocks (2-6) circling high on worlds with a breathable-ish atmosphere.
// Each planet tints and scales its own versions, so no two worlds share the same beasts.
import * as THREE from 'three';
import { Rng } from '../../core/rng.js';
import { shiftHex } from '../../core/color.js';
import { word } from '../../gen/names.js';
import { ModelGroup } from './models/model-group.js';
import { moveGrazer, moveLizard, moveBird } from './models/megafauna-moves.js';

const TYPES = {
  grazer: { model: 'deer', label: 'Rusa', height: [2.2, 3.4], speed: 2.2, flee: 11, hp: 60, radius: 0.45, tint: 0.8 },
  lizard: { model: 'lizard', label: 'Biawak', height: [1.1, 1.8], speed: 1.3, chase: 5, hp: 90, radius: 1.1, tint: 0.5 },
  bird: { model: 'bird', label: 'Elang', height: [2.4, 3.6], speed: 14, hp: 30, radius: 0.7, tint: 0.45 },
};
const GRAZE_BIOMES = ['lush', 'fungal', 'swamp', 'ocean', 'toxic', 'exotic'];
const LIZARD_BIOMES = ['desert', 'volcanic', 'swamp', 'barren'];

export class Megafauna extends ModelGroup {
  constructor(scene, planet, heightFn, origin) {
    super(scene);
    this.origin = origin;
    this.heightFn = heightFn;
    this.waterY = planet.terrain.hasWater ? planet.terrain.waterY : -Infinity;
    this.rng = new Rng(planet.seed ^ 0x3e6a);
    this.calm = 10;
    this.onBite = null;
    this.herds = [];
    this.dry = (x, z) => this.heightFn(x, z) > this.waterY + 0.5;
    this.populate(planet);
  }

  // Which beasts live here, decided from biome, flora, atmosphere and the planet seed.
  populate(planet) {
    const r = this.rng, biome = planet.biome.id;
    if (GRAZE_BIOMES.includes(biome) && planet.flora.density > 0.1 && r.chance(0.8)) {
      const tint = this.tintOf(planet, 0);
      for (let h = 1 + r.int(2); h > 0; h--) this.addHerd(planet, tint, 3 + r.int(5));
    }
    if (LIZARD_BIOMES.includes(biome) && r.chance(0.75)) {
      const tint = this.tintOf(planet, 0.12);
      for (let n = 2 + r.int(3); n > 0; n--) this.add('lizard', planet, tint, this.landSpot(), { hostile: r.chance(0.4), biteCd: 0 });
    }
    if (planet.atmosphereDensity >= 0.33 && r.chance(0.75)) this.addFlock(planet, this.tintOf(planet, 0.35), 2 + r.int(5));
  }

  tintOf(planet, hueShift) {
    return shiftHex(planet.palette.fauna, hueShift + this.rng.range(-0.06, 0.06), 0, this.rng.range(0, 0.1));
  }

  landSpot() {
    const out = new THREE.Vector3();
    for (let i = 0; i < 24; i++) {
      const a = this.rng.range(0, Math.PI * 2), r = this.rng.range(40, 80 + i * 6);
      out.set(this.origin.x + Math.cos(a) * r, 0, this.origin.z + Math.sin(a) * r);
      if (this.dry(out.x, out.z)) break;
    }
    return out;
  }

  addHerd(planet, tint, size) {
    const herd = { center: this.landSpot(), panic: 0 };
    this.herds.push(herd);
    for (let i = 0; i < size; i++) {
      const pos = herd.center.clone().add(new THREE.Vector3(this.rng.range(-6, 6), 0, this.rng.range(-6, 6)));
      this.add('grazer', planet, tint, pos, { herd });
    }
  }

  addFlock(planet, tint, size) {
    const flock = { center: this.landSpot() };
    const dir = this.rng.chance(0.5) ? 1 : -1;
    for (let i = 0; i < size; i++) {
      const altitude = this.rng.range(35, 60);
      const pos = flock.center.clone().setY(Math.max(this.heightFn(flock.center.x, flock.center.z), this.waterY) + altitude);
      this.add('bird', planet, tint, pos, { flock, dir, altitude, angle: this.rng.range(0, Math.PI * 2),
        orbit: this.rng.range(18, 40), waterY: this.waterY });
    }
  }

  add(kind, planet, tint, pos, extra) {
    const type = TYPES[kind], r = this.rng;
    const height = r.range(...type.height);
    const scale = height / type.height[0];
    const a = { kind, type, root: new THREE.Group(), model: type.model, height, scale, tint, tintStrength: type.tint,
      rng: new Rng(r.int(0x7fffffff)), seed: r.next(), pos, target: pos.clone(), hostile: false,
      name: `${word(r)} ${type.label}`, radius: height * type.radius, maxHp: Math.round(type.hp * scale), ...extra };
    a.root.rotation.order = 'YXZ'; // yaw, then bank about the body's forward axis
    a.root.rotation.y = r.range(0, Math.PI * 2);
    this.attach(a);
  }

  move(a, dt, player) {
    if (a.kind === 'grazer') return moveGrazer(a, dt, player, this.dry);
    if (a.kind === 'lizard') return moveLizard(a, dt, player, this.dry, this);
    return moveBird(a, dt, player, this.heightFn);
  }

  update(dt, player) {
    this.calm -= dt;
    for (const h of this.herds) h.panic -= dt;
    for (const a of this.list) {
      const speed = this.move(a, dt, player);
      const y = a.kind === 'bird' ? a.pos.y : this.heightFn(a.pos.x, a.pos.z);
      a.root.position.set(a.pos.x, y, a.pos.z);
      const mode = a.kind !== 'bird' ? 'walk' : Math.sin(a.angle * 1.5 + a.seed * 9) > 0.2 ? 'glide' : 'fly';
      this.animate(a, dt, player, { speed: speed / a.height, mode });
    }
  }

  // Shot: grazers stampede, lizards turn on the player.
  provoke(a) {
    if (a.herd) a.herd.panic = 8;
    if (a.kind === 'lizard') { a.hostile = true; this.calm = 0; }
  }
}
