// Damage effects on the player's ship: smoke trail, sparks and fire as the hull drops.
import * as THREE from 'three';
import { glowTexture } from '../../assets/textures.js';

const PUFFS = 26;
const SPARKS = 18;

function sprite(map, color, opacity, blending) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity,
    depthWrite: false, blending, fog: false }));
  s.visible = false;
  return s;
}

export class ShipDamage {
  constructor(parent, size = 8) {
    this.size = size;
    this.group = new THREE.Group();
    const smokeMap = glowTexture(0x9a9a9a), fireMap = glowTexture(0xffb347);
    this.puffs = Array.from({ length: PUFFS }, () => sprite(smokeMap, 0x6a6a6a, 0.5, THREE.NormalBlending));
    this.sparks = Array.from({ length: SPARKS }, () => sprite(fireMap, 0xffc266, 0.9, THREE.AdditiveBlending));
    this.fire = sprite(fireMap, 0xff7a30, 0.9, THREE.AdditiveBlending);
    this.group.add(...this.puffs, ...this.sparks, this.fire);
    parent.add(this.group);
    this.items = [...this.puffs, ...this.sparks].map((s) => ({ s, life: 0, vel: new THREE.Vector3(), spin: 0 }));
    this.next = 0;
    this.spawnT = 0;
    this.t = 0;
  }

  // hull 0..100; the group lives in the ship's local space.
  update(dt, hull) {
    this.t += dt;
    const hurt = Math.max(0, 1 - hull / 55);       // starts at 55% hull
    this.group.visible = hurt > 0.02;
    this.fire.visible = hull < 22;
    if (this.fire.visible) {
      this.fire.position.set(0, 0.1, this.size * 0.1);
      this.fire.scale.setScalar((0.8 + Math.sin(this.t * 22) * 0.25) * this.size * 0.6);
      this.fire.material.opacity = 0.55 + Math.sin(this.t * 17) * 0.25;
    }
    if (this.group.visible) this.emit(dt, hurt);
    this.step(dt);
  }

  emit(dt, hurt) {
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = 0.09 - hurt * 0.05;
    const it = this.items[this.next = (this.next + 1) % this.items.length];
    const smoke = this.puffs.includes(it.s);
    it.life = smoke ? 1.4 : 0.5;
    it.max = it.life;
    it.smoke = smoke;
    it.s.visible = true;
    it.s.position.set((Math.random() - 0.5) * this.size * 0.25, 0, this.size * (0.1 + Math.random() * 0.2));
    it.vel.set((Math.random() - 0.5) * this.size * 0.4, (Math.random() - 0.3) * this.size * 0.3, this.size * (1 + Math.random()));
    it.s.scale.setScalar(this.size * (smoke ? 0.35 : 0.2));
  }

  step(dt) {
    for (const it of this.items) {
      if (it.life <= 0) continue;
      it.life -= dt;
      if (it.life <= 0) { it.s.visible = false; continue; }
      const k = it.life / it.max;
      it.s.position.addScaledVector(it.vel, dt);
      it.s.scale.setScalar(this.size * (it.smoke ? 0.3 + (1 - k) * 1.4 : 0.2 * k));
      it.s.material.opacity = it.smoke ? 0.45 * k : 0.9 * k;
    }
  }

  dispose() {
    this.group.removeFromParent();
    for (const it of this.items) it.s.material.dispose();
    this.fire.material.dispose();
  }
}
