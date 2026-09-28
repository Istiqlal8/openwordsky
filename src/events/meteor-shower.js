// Planet event: meteors streak down around the player and leave glowing shards to collect.
import * as THREE from 'three';
import { GlowLoot, ringSpot, glowTexture } from '../gameplay/glow-loot.js';

const MAX_FALLING = 3;
const HEIGHT = 140;     // spawn height above the impact point
const SPEED = 75;       // units/s along the fall path
const CORE_CHANCE = 0.15;
const HIT_RADIUS = 4;   // standing this close to an impact hurts
const _v = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);

export class MeteorShower {
  constructor(ctx) {
    this.ctx = ctx;
    this.id = 'meteor';
    this.duration = 60 + Math.random() * 60;
    this.title = 'Hujan meteor! Kumpulkan pecahannya';
    this.endText = 'Hujan meteor berakhir';
    this.participated = false;
    this.falling = [];
    this.spawnT = 1;
    this.geo = new THREE.IcosahedronGeometry(1.4, 1);
    this.trailGeo = new THREE.CylinderGeometry(0.15, 1.3, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, -0.5);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffd08a, fog: false, toneMapped: false });
    this.tex = glowTexture();
    this.glowMat = new THREE.SpriteMaterial({ map: this.tex, color: 0xff9a40, blending: THREE.AdditiveBlending,
      depthWrite: false, fog: false });
    this.trailMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.75,
      depthWrite: false, fog: false, toneMapped: false }); // normal blending: stays visible against a bright day sky
    this.loot = new GlowLoot(ctx, { geometry: new THREE.OctahedronGeometry(0.32, 0), max: 30,
      onCollect: () => { this.participated = true; } });
  }

  update(dt, alive) {
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.falling.length < MAX_FALLING) this.spawn();
    for (const m of this.falling) this.fall(m, dt);
    this.falling = this.falling.filter((m) => !m.done);
    this.loot.update(dt, alive);
  }

  // A meteor aimed at a spot 14..60 units from the player, coming in at a slant.
  spawn() {
    this.spawnT = 2 + Math.random() * 3;
    const f = this.ctx.surface.feet, hit = ringSpot(f.x, f.z, 14, 60);
    const end = new THREE.Vector3(hit.x, this.ctx.surface.floorAt(hit.x, hit.z), hit.z);
    const a = Math.random() * Math.PI * 2, start = end.clone().add(_v.set(Math.cos(a) * 60, HEIGHT, Math.sin(a) * 60));
    const group = new THREE.Group();
    const trail = new THREE.Mesh(this.trailGeo, this.trailMat);
    trail.scale.set(1, 1, 34);
    const glow = new THREE.Sprite(this.glowMat);
    glow.scale.setScalar(9);
    group.add(new THREE.Mesh(this.geo, this.mat), trail, glow);
    group.position.copy(start);
    group.quaternion.setFromUnitVectors(Z, _v.subVectors(end, start).normalize());
    this.ctx.surface.scene.add(group);
    this.falling.push({ group, end, dir: _v.clone(), done: false });
  }

  fall(m, dt) {
    const p = m.group.position;
    p.addScaledVector(m.dir, SPEED * dt);
    if (p.y > m.end.y) return;
    m.done = true;
    m.group.removeFromParent();
    this.impact(m.end);
  }

  impact(at) {
    const { fx, sfx, player, surface } = this.ctx;
    fx?.explode(at.clone().setY(at.y + 0.5), { color: 0xff8a3c, size: 0.9, debris: true });
    sfx?.explosion?.(0.25);
    const f = surface.feet;
    if (!surface.flying && Math.hypot(f.x - at.x, f.z - at.z) < HIT_RADIUS) player.damageSuit(15, 'Meteor');
    const core = Math.random() < CORE_CHANCE;
    this.loot.add(at.x, at.z, core ? 'Inti Bintang' : 'Pecahan Meteor', core ? 0xfff27a : 0xff9a3c);
  }

  dispose() {
    for (const m of this.falling) m.group.removeFromParent();
    this.falling = [];
    this.loot.dispose();
    [this.geo, this.trailGeo, this.mat, this.trailMat, this.glowMat, this.tex].forEach((x) => x.dispose());
  }
}
