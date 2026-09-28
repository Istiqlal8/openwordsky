// Multitool blaster (RMB): hitscan bolt that damages sentinels and creatures.
import * as THREE from 'three';
import { muzzleOf } from './mining.js';

const COOLDOWN = 0.35;
const RANGE = 120;
const CYAN = 0x6ff4ff;
const CENTER = new THREE.Vector2(0, 0);

export class Blaster {
  constructor(ctx) {
    this.ctx = ctx; // { surface, player, sfx, fx, creatures? }
    this.ray = new THREE.Raycaster();
    this.cool = 0;
    this.point = new THREE.Vector3();
    this.from = new THREE.Vector3();
  }

  // Fires while RMB is held (respecting cooldown).
  // Returns 'miss' | 'hit' | 'kill' | 'creature-hit' | 'creature-kill' | null.
  update(dt, firing, sentinels) {
    this.cool -= dt;
    if (!firing || this.cool > 0) return null;
    this.cool = COOLDOWN;
    const { surface, fx, sfx, player } = this.ctx;
    this.ray.setFromCamera(CENTER, surface.camera);
    const drone = sentinels.raycast(this.ray.ray, RANGE, this.point);
    const creatures = this.ctx.creatures;
    const creature = !drone && creatures ? creatures.raycast(this.ray.ray, RANGE, this.point) : null;
    if (!drone && !creature) this.ray.ray.at(RANGE, this.point);
    fx?.beam((surface.muzzle?.(this.from) ?? muzzleOf(surface.camera, this.from)), this.point, CYAN, 0.09);
    sfx?.laser?.();
    if (!drone && !creature) return 'miss';
    player.emit('hitMarker', {});
    sfx?.hit?.();
    if (creature) return creatures.damage(creature, this.point) ? 'creature-kill' : 'creature-hit';
    return sentinels.damage(drone, this.point) ? 'kill' : 'hit';
  }
}
