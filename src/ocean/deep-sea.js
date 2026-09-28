// Deep-ocean world for planets with water (not lava): reefs, kelp and crabs on the floor,
// fish schools, big animals (turtles, rays, dolphins, sharks, mantas, whales, anglerfish,
// giant squid), glowing jellyfish, vents, a treasure wreck and underwater particles/sunbeams.
// Same group API as the Wildlife groups (update / nearest / bodies / kill / provoke / dispose),
// plus underwater look helpers for the scene fog and a census for the submarine sonar.
import { Reef } from './reef.js';
import { Schools } from './schools.js';
import { BigAnimals } from './big-animals.js';
import { Jellies } from './jellies.js';
import { Vents } from './vents.js';
import { WaterFx } from './water-fx.js';
import { oceanTime, oceanFill } from './ocean-kit.js';
import { DepthScale, oceanPalette, speciesNames, underwaterLook } from './ocean-palette.js';

export { underwaterLook } from './ocean-palette.js';

export function hasOcean(planet) {
  return Boolean(planet?.terrain?.hasWater) && planet.biome?.id !== 'volcanic';
}

export class DeepSea {
  constructor(scene, planet, heightFn, origin = { x: 0, z: 0 }) {
    this.scene = scene;
    this.onBite = null;   // (species, damage) when a shark bites a swimming player
    this.calm = 10;       // seconds before hostile sharks may attack (Wildlife.calmDown)
    this.swimmer = false;
    this.enabled = hasOcean(planet);
    this.cameraDepth = 0;
    this.virtualDepth = 0;
    // Live view for the Wildlife-driven update (see update's default argument).
    this.view = { camera: null, underwater: undefined, swimming: undefined, player: null, daylight: 1 };
    if (!this.enabled) return;
    const waterY = planet.terrain.waterY;
    const scale = new DepthScale(heightFn, waterY, origin);
    this.ctx = { h: heightFn, waterY, scale, pal: oceanPalette(planet), names: speciesNames(planet), seed: planet.seed >>> 0 };
    this.reef = new Reef(scene, this.ctx);
    this.schools = new Schools(scene, this.ctx);
    this.big = new BigAnimals(scene, this.ctx, this);
    this.jellies = new Jellies(scene, this.ctx);
    this.vents = new Vents(scene, this.ctx);
    this.fx = new WaterFx(scene, this.ctx);
  }

  get scale() { return this.ctx?.scale ?? null; }

  // depthInfo: { camera (overrides cameraPos), underwater, swimming (player in the water, not
  // in a vehicle), player (feet position, for shark attacks), daylight (0..1) }. It defaults to
  // `view`, which the host refreshes every frame, so one call per frame drives everything —
  // whether it comes from here or from Wildlife.update.
  update(dt, cameraPos, depthInfo = this.view) {
    if (!this.enabled) return;
    oceanTime.value += dt;
    this.calm -= dt;
    const cam = depthInfo.camera ?? cameraPos;
    const { waterY, scale } = this.ctx, under = depthInfo.underwater ?? cam.y < waterY;
    this.swimmer = depthInfo.swimming ?? under;
    this.cameraDepth = Math.max(0, waterY - cam.y);
    this.virtualDepth = scale.virtual(this.cameraDepth);
    oceanFill.value = 0.02 + 0.35 * (depthInfo.daylight ?? 1) * underwaterLook(this.virtualDepth).lightFactor;
    this.reef.update(dt, cam);
    this.schools.update(dt, cam);
    this.big.update(dt, cam, depthInfo.player ?? cam);
    this.jellies.update(dt, cam);
    this.vents.update(dt, cam);
    this.fx.update(cam, under, this.virtualDepth, depthInfo.daylight ?? 1);
  }

  // Fog color/density and light factor for the current camera depth (see underwaterLook).
  look() {
    return underwaterLook(this.virtualDepth, this.ctx?.pal.water ?? null);
  }

  // Darkens the surface sky's underwater fog and lights with depth. Call after
  // surface.update() while surface.underwater (the sky resets its values every frame).
  applyLook(sky) {
    const fog = sky?.scene?.fog;
    if (!this.enabled || !fog) return;
    const L = this.look(), day = 0.25 + 0.75 * (sky.cycle?.daylight ?? 1);
    fog.color.copy(L.fogColor).multiplyScalar(day);
    fog.density = L.fogDensity;
    sky.scene.background?.copy(fog.color);
    sky.sun.intensity *= L.lightFactor;
    sky.hemi.intensity *= Math.max(0.05, L.lightFactor);
    if (sky.stars) sky.stars.visible = false; // no starfield through the water
  }

  // Everything the sonar can pick up: { name, position, radius, count }.
  sonarTargets() {
    if (!this.enabled) return [];
    const big = this.big.pool.filter((a) => a.placed).map((a) => ({ name: a.name, position: a.pos, radius: a.radius * 2, count: 1 }));
    return [...big, ...this.schools.targets(), ...this.jellies.targets()];
  }

  // Creatures within r of pos → { total, counts: { name: n } }.
  census(pos, r) {
    const counts = {};
    let total = 0;
    for (const t of this.sonarTargets()) {
      if (t.position.distanceTo(pos) > r) continue;
      counts[t.name] = (counts[t.name] ?? 0) + t.count;
      total += t.count;
    }
    const crabs = this.enabled ? this.reef.crabCount(pos, r) : 0;
    if (crabs) { counts[this.ctx.names.crab] = crabs; total += crabs; }
    return { total, counts };
  }

  // Visible counts, for tests and debug overlays.
  stats() {
    if (!this.enabled) return null;
    return { fish: this.schools.visibleCount, jellies: this.jellies.visibleCount, animals: this.big.visibleCount,
      reef: this.reef.instanceCount, depth: this.cameraDepth, virtual: this.virtualDepth, zone: this.ctx.scale.zone(this.cameraDepth),
      maxDepth: this.ctx.scale.max, deepest: this.ctx.scale.deepest };
  }

  nearest(pos, maxDist = 40) {
    if (!this.enabled) return null;
    let best = null;
    for (const t of this.sonarTargets()) {
      const d = t.position.distanceTo(pos);
      if (d < maxDist && (!best || d < best.distance)) best = { name: t.name, distance: d };
    }
    const crab = this.reef.nearestCrab(pos, Math.min(maxDist, 12));
    if (crab && (!best || crab.distance < best.distance)) best = { name: this.ctx.names.crab, distance: crab.distance };
    return best;
  }

  bodies() { return this.enabled ? this.big.bodies() : []; }
  kill(ref) { this.big?.kill(ref); }
  provoke(ref) { this.big?.provoke(ref); }

  dispose() {
    if (!this.enabled) return;
    for (const part of [this.reef, this.schools, this.big, this.jellies, this.vents, this.fx]) part.dispose();
    this.enabled = false;
  }
}
