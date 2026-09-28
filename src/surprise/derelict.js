// Abandoned capital ship drifting between orbits; a one-time loot pod when the player comes close.
import * as THREE from 'three';
import { rngOf } from '../core/rng.js';
import { word } from '../gen/names.js';
import { glowTexture } from '../assets/textures.js';
import { buildHulk, hulkMaterials } from './derelict-model.js';

const CLAIM_RANGE = 150;
const SPARKS = 80;
const _v = new THREE.Vector3();

export class Derelict {
  // opts.player + opts.onLoot(text): auto-claim inside update(); otherwise call claim(player).
  constructor(space, opts = {}) {
    this.space = space;
    this.player = opts.player ?? null;
    this.onLoot = opts.onLoot ?? null;
    this.hulk = null;
    this.time = 0;
  }

  // ~30% of systems (seeded). Call after space.mount(), so planet orbits are known.
  mount(system) {
    this.dispose();
    const rng = rngOf(system.seed, 0xde7e);
    if (!rng.chance(0.3) || !this.space.bodies.length) return;
    this.mats = hulkMaterials();
    const built = buildHulk(rng, this.mats);
    this.hulk = { ...built, name: `Kapal ${word(rng)}`, claimed: false, spin: new THREE.Vector3(
      rng.range(-0.02, 0.02), rng.range(-0.015, 0.015), rng.range(-0.03, 0.03)) };
    built.group.position.copy(this.placement(rng));
    built.group.rotation.set(rng.next() * 6, rng.next() * 6, rng.next() * 6);
    this.makeBeacon();
    this.makeSparks();
    this.space.scene.add(built.group, this.beacon);
  }

  // Between two neighbouring planet orbits (or just past the outermost one).
  placement(rng) {
    const orbits = this.space.bodies.map((b) => b.planet.orbit.radius).sort((a, b) => a - b);
    const i = rng.int(orbits.length);
    const r = i < orbits.length - 1 ? (orbits[i] + orbits[i + 1]) / 2 : orbits[i] + 1600;
    const a = rng.range(0, Math.PI * 2);
    return _v.set(Math.cos(a) * r, rng.range(-150, 150), Math.sin(a) * r);
  }

  // Distress blink: constant screen size so it can be spotted from across the system.
  makeBeacon() {
    this.beaconMat = new THREE.SpriteMaterial({ map: glowTexture(0xff4a30), color: 0xff6a4a, sizeAttenuation: false,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.beacon = new THREE.Sprite(this.beaconMat);
    this.beacon.scale.setScalar(0.1);
    this.beacon.position.copy(this.hulk.group.position);
  }

  makeSparks() {
    this.sparkPos = new Float32Array(SPARKS * 3);
    this.sparkVel = new Float32Array(SPARKS * 3);
    this.sparkLife = new Float32Array(SPARKS);
    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkAttr = new THREE.BufferAttribute(this.sparkPos, 3).setUsage(THREE.DynamicDrawUsage);
    this.sparkGeo.setAttribute('position', this.sparkAttr);
    this.sparkMat = new THREE.PointsMaterial({ color: 0xffc070, size: 2.2, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(this.sparkGeo, this.sparkMat);
    pts.frustumCulled = false;
    this.hulk.group.add(pts);
  }

  emitSpark(i) {
    const e = this.hulk.sparks[(Math.random() * this.hulk.sparks.length) | 0], k = i * 3;
    this.sparkPos[k] = e.x; this.sparkPos[k + 1] = e.y; this.sparkPos[k + 2] = e.z;
    this.sparkVel[k] = (Math.random() - 0.5) * 30;
    this.sparkVel[k + 1] = (Math.random() - 0.5) * 30;
    this.sparkVel[k + 2] = (Math.random() - 0.5) * 30;
    this.sparkLife[i] = 0.4 + Math.random() * 1.2;
  }

  updateSparks(dt) {
    const burst = Math.sin(this.time * 1.7) > 0.3; // sparks come in fits
    for (let i = 0; i < SPARKS; i++) {
      const k = i * 3;
      this.sparkLife[i] -= dt;
      if (this.sparkLife[i] <= 0) {
        if (burst && Math.random() < dt * 6) this.emitSpark(i);
        else { this.sparkPos[k + 1] = 1e6; continue; } // parked far away = hidden
      }
      this.sparkPos[k] += this.sparkVel[k] * dt;
      this.sparkPos[k + 1] += this.sparkVel[k + 1] * dt;
      this.sparkPos[k + 2] += this.sparkVel[k + 2] * dt;
    }
    this.sparkAttr.needsUpdate = true;
  }

  flicker() {
    const t = this.time;
    const f = Math.sin(t * 23) * Math.sin(t * 7.3) > 0.6 ? 0.15 : 1.6; // failing power
    this.mats.window.emissiveIntensity = f;
    this.mats.warn.emissiveIntensity = Math.sin(t * 4) > 0 ? 2.5 : 0.1;
    this.beaconMat.opacity = this.hulk.claimed ? 0.25 : Math.sin(t * 3) > 0 ? 1 : 0.2;
  }

  update(dt, shipPos) {
    const h = this.hulk;
    if (!h) return;
    this.time += dt;
    h.group.rotation.x += h.spin.x * dt;
    h.group.rotation.y += h.spin.y * dt;
    h.group.rotation.z += h.spin.z * dt;
    this.flicker();
    this.updateSparks(dt);
    this.pod?.update(dt);
    if (this.player && shipPos && !h.claimed && this.distance(shipPos) < CLAIM_RANGE) {
      const text = this.claim(this.player, shipPos);
      if (text) this.onLoot?.(text);
    }
  }

  // Distance from pos to the hulk's surface (roughly: centre minus half length).
  distance(pos) {
    return Math.max(0, pos.distanceTo(this.hulk.group.position) - this.hulk.length / 2);
  }

  // -> { name, distance, position, claimed } | null
  nearest(shipPos) {
    const h = this.hulk;
    if (!h) return null;
    return { name: h.name, distance: this.distance(shipPos), position: h.group.position, claimed: h.claimed };
  }

  // One-time loot. Returns the notice text, or null when too far / already looted.
  claim(player, shipPos = this.space.shipObject.position) {
    const h = this.hulk;
    if (!h || h.claimed || this.distance(shipPos) >= CLAIM_RANGE) return null;
    h.claimed = true;
    const loot = [['Nanit', 80 + ((Math.random() * 121) | 0)], ['Kobalt', 8 + ((Math.random() * 10) | 0)],
      ['Emas', 2 + ((Math.random() * 4) | 0)]];
    if (Math.random() < 0.35) loot.push(['Artefak Kuno', 1]);
    for (const [name, n] of loot) player.addItem(name, n);
    this.pod = new LootPod(this.space.scene, h.group.position, shipPos);
    return `Pod kargo dari ${h.name} terlontar!`;
  }

  dispose() {
    this.pod?.dispose();
    this.pod = null;
    if (!this.hulk) return;
    this.space.scene.remove(this.hulk.group, this.beacon);
    this.hulk.group.traverse((o) => o.geometry?.dispose());
    for (const m of Object.values(this.mats)) m.dispose();
    this.beaconMat.dispose();
    this.sparkMat.dispose();
    this.hulk = null;
  }
}

// Glowing capsule shot from the hulk toward the ship, fading out after a few seconds.
class LootPod {
  constructor(scene, from, to) {
    this.scene = scene;
    this.mat = new THREE.SpriteMaterial({ map: glowTexture(0x7affd0), color: 0x9affe0, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending });
    this.sprite = new THREE.Sprite(this.mat);
    this.sprite.scale.setScalar(25);
    this.sprite.position.copy(from);
    this.vel = new THREE.Vector3().subVectors(to, from).multiplyScalar(0.4);
    this.life = 3;
    scene.add(this.sprite);
  }

  update(dt) {
    if (this.life <= 0) return;
    this.life -= dt;
    this.sprite.position.addScaledVector(this.vel, dt);
    this.mat.opacity = Math.min(1, this.life);
    this.sprite.scale.setScalar(25 + Math.sin(this.life * 20) * 5);
    if (this.life <= 0) this.sprite.visible = false;
  }

  dispose() {
    this.scene.remove(this.sprite);
    this.mat.dispose();
  }
}
