// Multitool mining beam: hold LMB on flora/rocks to harvest them.
import * as THREE from 'three';
import { BeamVisual } from './beam-visual.js';
import { floraMaterial } from '../quest/materials.js';
import { endemicOf, ENDEMIC_CHANCE } from '../quest/endemic.js';
import { upgradeMul } from '../craft/upgrades.js';

const RANGE = 30;
const TIME = { flora: 1.2, rock: 2.0 }; // seconds of beam contact to harvest
const MAIN = { flora: 'Karbon', rock: 'Ferit' };
const LABEL = { flora: 'Tumbuhan · Karbon', rock: 'Batu · Ferit' };
const AMBER = 0xffa630;
const CENTER = new THREE.Vector2(0, 0);
const MUZZLE = new THREE.Vector3(0.28, -0.26, -0.6); // camera-local multitool tip
const _end = new THREE.Vector3();

// World position of the multitool tip (slightly right-below the view).
export function muzzleOf(camera, out) {
  return camera.localToWorld(out.copy(MUZZLE));
}

export class MiningTool {
  constructor(ctx) {
    this.ctx = ctx; // { surface, player, sfx, fx, planet }
    this.ray = new THREE.Raycaster();
    this.ray.far = RANGE;
    this.hits = [];
    this.hit = null;
    this.key = null;
    this.progress = 0;
    this.active = false;
    this.sparkT = 0;
    this.muzzle = new THREE.Vector3();
    this.beam = new BeamVisual(ctx.surface.scene, AMBER);
    this._target = { label: '', progress: 0 };
    this.endemic = endemicOf(ctx.planet);
  }

  // Returns the number of items harvested this frame (0 most frames).
  update(dt, holding) {
    this.ray.far = RANGE * upgradeMul(this.ctx.player, 'beamRange');
    this.hit = this.aim();
    this.trackTarget();
    this.setActive(holding);
    if (!holding) return 0;
    const cam = this.ctx.surface.camera;
    const end = this.hit ? this.hit.point : this.ray.ray.at(this.ray.far, _end);
    this.beam.show((this.ctx.muzzle?.(this.muzzle) ?? this.ctx.surface.muzzle?.(this.muzzle) ?? muzzleOf(cam, this.muzzle)), end, dt, Boolean(this.hit));
    if (!this.hit) return 0;
    this.progress += dt / (TIME[this.kind()] * upgradeMul(this.ctx.player, 'beamSpeed'));
    this.emitSparks(dt);
    return this.progress >= 1 ? this.collect() : 0;
  }

  aim() {
    const { camera, props } = this.ctx.surface;
    this.ray.setFromCamera(CENTER, camera);
    this.hits.length = 0;
    this.ray.intersectObjects(props.mineable, false, this.hits);
    for (const h of this.hits) {
      const key = props.keyOf(h.object, h.instanceId);
      if (key && !props.isRemoved(key)) return h;
    }
    return null;
  }

  kind() {
    return this.hit.object === this.ctx.surface.props.rockMesh ? 'rock' : 'flora';
  }

  trackTarget() {
    const key = this.hit ? this.ctx.surface.props.keyOf(this.hit.object, this.hit.instanceId) : null;
    if (key !== this.key) this.progress = 0;
    this.key = key;
  }

  setActive(on) {
    if (on === this.active) return;
    this.active = on;
    this.ctx.sfx?.mineBeam?.(on);
    if (!on) { this.beam.hide(); this.progress = 0; }
  }

  emitSparks(dt) {
    this.sparkT -= dt;
    if (this.sparkT > 0) return;
    this.sparkT = 0.09;
    this.ctx.fx?.sparks(this.hit.point, AMBER, 4);
  }

  collect() {
    const { surface, fx, sfx } = this.ctx;
    const kind = this.kind(), point = this.hit.point;
    const info = surface.props.removeAt(this.hit.object, this.hit.instanceId);
    if (!info) return 0;
    const pal = this.ctx.planet.palette;
    fx?.explode(point, { color: kind === 'rock' ? pal.rock : pal.flora, size: kind === 'rock' ? 1.2 : 0.8, debris: true });
    sfx?.pickup?.();
    this.progress = 0;
    this.key = null;
    return this.reward(kind) + this.bonus(info);
  }

  // Plant-specific material, this planet's endemic items, catalog/quest events.
  bonus(info) {
    const { player } = this.ctx;
    player.emit('act', { type: info.kind === 'rock' ? 'mine' : 'harvest' });
    const n = this.endemicDrop(info.kind);
    if (info.kind !== 'flora' || !info.species) return n;
    player.emit('act', { type: 'floraSeen', name: info.species.name });
    if (Math.random() > 0.6) return n;
    const k = 1 + Math.floor(Math.random() * 2);
    player.addItem(floraMaterial(info.species), k);
    return n + k;
  }

  endemicDrop(kind) {
    const pool = this.endemic.filter((e) => e.source === kind);
    if (!pool.length || Math.random() > ENDEMIC_CHANCE[kind]) return 0;
    this.ctx.player.addItem(pool[Math.floor(Math.random() * pool.length)].name, 1);
    return 1;
  }

  // Grant resources; returns item count for the sentinel wanted meter.
  reward(kind) {
    const { player, planet } = this.ctx, res = planet.resources;
    let n = kind === 'rock' ? 2 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 3);
    player.addItem(MAIN[kind], n);
    const extra = res[Math.floor(Math.random() * res.length)]; // every local mineral is reachable
    if (extra && extra !== MAIN[kind] && Math.random() < 0.35) {
      const k = 1 + Math.floor(Math.random() * 2);
      player.addItem(extra, k);
      n += k;
    }
    return n;
  }

  get target() {
    if (!this.hit) return null;
    const kind = this.kind();
    this._target.label = LABEL[kind];
    this._target.progress = Math.min(1, this.progress);
    return this._target;
  }

  dispose() {
    this.setActive(false);
    this.beam.dispose();
  }
}
