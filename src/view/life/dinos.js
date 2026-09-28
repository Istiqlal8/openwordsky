// Dinosaurs: rigged GLB models (T-rex, raptor packs, longnecks, triceratops herds) roaming near the
// player. A procedural body stands in for each individual until its model has loaded.
import * as THREE from 'three';
import { Rng } from '../../core/rng.js';
import { shiftHex } from '../../core/color.js';
import { word } from '../../gen/names.js';
import { ModelGroup, wrapAngle } from './models/model-group.js';
import { buildDinoFallback } from './models/dino-fallback.js';

// height: meters at the top of the head; radius: hit sphere as a fraction of height.
const KINDS = {
  rex: { model: 'trex', label: 'Rex', height: 5, speed: 4.5, pack: 1, hp: 160, radius: 0.5 },
  raptor: { model: 'raptor', label: 'Raptor', height: 1.8, speed: 10, pack: 3, hp: 50, radius: 0.55 },
  longneck: { model: 'longneck', label: 'Titan', height: 12, speed: 2.4, pack: 1, hp: 240, radius: 0.35 },
  triceratops: { model: 'triceratops', label: 'Tanduk', height: 3, speed: 3.5, pack: 2, hp: 140, radius: 0.6 },
};
const ROAM = 110;

// Planet data only knows rex/raptor/longneck; half of the longneck worlds get triceratops instead.
export function pickKind(planet) {
  const kind = planet.fauna.dinoKind;
  return kind === 'longneck' && new Rng(planet.seed ^ 0x7c3a).chance(0.5) ? 'triceratops' : kind;
}

export class Dinos extends ModelGroup {
  constructor(scene, planet, heightFn, origin) {
    super(scene);
    this.origin = origin;
    this.heightFn = heightFn;
    const waterY = planet.terrain.hasWater ? planet.terrain.waterY : -Infinity;
    this.dry = (x, z) => heightFn(x, z) > waterY + 0.5;
    const kind = pickKind(planet);
    const rng = new Rng(planet.seed ^ 0xd1705);
    const count = planet.fauna.dinos * KINDS[kind].pack;
    for (let i = 0; i < count; i++) this.spawn(kind, planet, rng, i);
  }

  spawn(kind, planet, rng, i) {
    const spec = KINDS[kind];
    const tint = shiftHex(planet.palette.fauna, rng.range(-0.08, 0.08), 0, rng.range(-0.1, 0.05));
    const height = spec.height * rng.range(0.85, 1.2);
    const pos = this.dryPoint(rng, this.origin, 45 + i * 12, 45 + i * 12 + 40) ?? new THREE.Vector3(this.origin.x + 45, 0, this.origin.z);
    const d = {
      root: new THREE.Group(), model: spec.model, height, tint, tintStrength: 0.45, spec, rng,
      fallback: buildDinoFallback(kind, tint, height), seed: rng.next(),
      name: `${word(rng)} ${spec.label}`, radius: height * spec.radius, maxHp: Math.round(spec.hp * height / spec.height),
      pos, t: rng.range(0, 10),
    };
    d.target = d.pos.clone();
    this.attach(d);
  }

  // Random dry-land point r0..r1 from `base`, or null (dinosaurs stay out of the sea).
  dryPoint(rng, base, r0, r1) {
    for (let i = 0; i < 8; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(r0, r1);
      const x = base.x + Math.cos(a) * r, z = base.z + Math.sin(a) * r;
      if (this.dry(x, z)) return new THREE.Vector3(x, 0, z);
    }
    return null;
  }

  retarget(d, player) {
    const base = d.pos.distanceTo(player) > ROAM ? player : d.pos;
    d.target.copy(this.dryPoint(d.rng, base, 20, 60) ?? d.pos);
  }

  // Walks toward the target. Returns the ground speed (m/s).
  step(d, dt, player) {
    const dx = d.target.x - d.pos.x, dz = d.target.z - d.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 3) { this.retarget(d, player); return 0; }
    const speed = d.spec.speed * (d.height / d.spec.height);
    const v = Math.min(dist, speed * dt);
    d.pos.x += (dx / dist) * v;
    d.pos.z += (dz / dist) * v;
    const turn = wrapAngle(Math.atan2(-dz, dx) - d.root.rotation.y);
    d.root.rotation.y += turn * Math.min(1, dt * 2);
    return speed;
  }

  update(dt, player) {
    for (const d of this.list) {
      const speed = this.step(d, dt, player);
      d.root.position.set(d.pos.x, this.heightFn(d.pos.x, d.pos.z), d.pos.z);
      const shown = this.animate(d, dt, player, { speed: speed / d.height });
      if (shown && d.fallback) d.fallback.animate((d.t += dt * d.spec.speed * 0.8), speed > 0 ? 1 : 0);
    }
  }

  provoke() {}
}
