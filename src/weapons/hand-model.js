// Third-person weapon: a world-space model in the astronaut's right hand, arm raised to aim.
import * as THREE from 'three';
import { buildWeapon } from './weapon-models.js';

const HAND = new THREE.Vector3(0, -0.52, -0.02); // right-arm pivot space
const RELAXED = 0.35;                             // arm angle while not shooting (rad)

export class HandModel {
  constructor(surface) {
    this.surface = surface;
    this.avatar = null;
    this.model = null;
    this.aim = 0; // 0 relaxed .. 1 aiming
  }

  get muzzle() { return this.model?.muzzle ?? null; }

  setWeapon(id) {
    this.model?.dispose();
    this.model = buildWeapon(id, false);
    this.model.group.scale.setScalar(1.25);
    this.model.group.position.copy(HAND);
    this.model.group.rotation.x = -Math.PI / 2;
    this.avatar = null; // re-attach on next update
  }

  // Runs after the avatar's own walk animation so the aim pose wins.
  update(dt, aiming) {
    const av = this.surface.avatar;
    if (!av || !this.model) return;
    if (av !== this.avatar) { av.arms[1].add(this.model.group); this.avatar = av; }
    this.aim += ((aiming ? 1 : 0) - this.aim) * Math.min(1, dt * 10);
    const arm = av.arms[1];
    const aimX = Math.PI / 2 + this.surface.pitch;
    arm.rotation.x = THREE.MathUtils.lerp(arm.rotation.x * 0.4 + RELAXED, aimX, this.aim);
    av.group.updateMatrixWorld(true);
  }

  dispose() {
    this.model?.dispose();
    this.model = this.avatar = null;
  }
}
