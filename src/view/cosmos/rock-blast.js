// Nearby spectacle: a rock glows hot, then bursts into a big fireball with embers,
// tumbling chunks, a shock ring and lingering smoke. Everything is pooled.
import * as THREE from 'three';
import { glowTexture } from '../../assets/textures.js';
import { puffTexture, shockTexture } from '../../fx/fx-textures.js';
import { rand, randomDir, glowSprite, disposeTree } from './util.js';

const WARN = 1.4;
const FIRE = 14;
const EMBERS = 40;
const CHUNKS = 10;
const SMOKE = 8;
const FIRE_TINTS = [0xff7a30, 0xffa040, 0xff5020, 0xffc060];
const tmpV = new THREE.Vector3();

function jaggedRock() {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    tmpV.fromBufferAttribute(pos, i);
    const k = 0.75 + 0.3 * Math.sin(tmpV.x * 5.1) * Math.cos(tmpV.y * 4.3 + tmpV.z * 3.7);
    pos.setXYZ(i, tmpV.x * k, tmpV.y * k * 0.85, tmpV.z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

function particle(sprite) {
  return { sprite, vel: new THREE.Vector3(), age: 1, life: 0, s0: 1, s1: 1, peak: 1, drag: 0, fade: 2 };
}

// Moves, scales and fades one pooled sprite particle.
function stepParticle(p, dt) {
  if (p.age >= p.life) return;
  p.age += dt;
  const t = Math.min(1, p.age / p.life);
  p.vel.multiplyScalar(Math.exp(-p.drag * dt));
  p.sprite.position.addScaledVector(p.vel, dt);
  p.sprite.scale.setScalar(p.s0 + (p.s1 - p.s0) * (1 - (1 - t) * (1 - t)));
  p.sprite.material.opacity = p.peak * Math.pow(1 - t, p.fade);
  p.sprite.visible = t < 1;
}

export class RockBlast {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'rock-blast';
    this.center = new THREE.Vector3();
    this.rock = new THREE.Mesh(jaggedRock(), new THREE.MeshStandardMaterial({ color: 0x5a4c44, roughness: 1, emissive: 0xff4a10, emissiveIntensity: 0 }));
    this.rock.visible = false;
    const fire = glowTexture(0xffb070);
    this.flash = particle(glowSprite(glowTexture(0xffffff)));
    this.ring = particle(glowSprite(shockTexture()));
    this.fire = Array.from({ length: FIRE }, (_, i) => particle(glowSprite(fire, FIRE_TINTS[i % FIRE_TINTS.length])));
    this.embers = Array.from({ length: EMBERS }, () => particle(glowSprite(glowTexture(0xffd080))));
    this.smoke = Array.from({ length: SMOKE }, () => particle(this.smokeSprite()));
    this.chunkMat = new THREE.MeshStandardMaterial({ color: 0x3a3230, roughness: 1, emissive: 0xff6a20, emissiveIntensity: 1 });
    const chunkGeo = new THREE.DodecahedronGeometry(1, 0);
    this.chunks = Array.from({ length: CHUNKS }, () => ({ mesh: new THREE.Mesh(chunkGeo, this.chunkMat), vel: new THREE.Vector3(), spin: new THREE.Vector3() }));
    for (const c of this.chunks) c.mesh.visible = false;
    this.all = [this.flash, this.ring, ...this.fire, ...this.embers, ...this.smoke];
    this.group.add(this.rock, ...this.all.map((p) => p.sprite), ...this.chunks.map((c) => c.mesh));
    this.phase = 'idle';
    this.t = 0;
  }

  smokeSprite() {
    const s = glowSprite(puffTexture(), 0x6a5a50);
    s.material.blending = THREE.NormalBlending;
    return s;
  }

  get busy() { return this.phase !== 'idle'; }

  // Show the rock heating up at `pos`; it bursts WARN seconds later (onBoom fires then).
  start(pos, size = rand(30, 60)) {
    this.center.copy(pos);
    this.size = size;
    this.rock.position.copy(pos);
    this.rock.scale.setScalar(size);
    this.rock.rotation.set(rand(0, 6), rand(0, 6), 0);
    this.rock.visible = true;
    this.phase = 'warn';
    this.t = 0;
  }

  burst() {
    const s = this.size / 40;
    this.rock.visible = false;
    this.phase = 'boom';
    this.t = 0;
    this.emit(this.flash, 0, 0.7, 300 * s, 2000 * s, 1, 0, 2);
    this.emit(this.ring, 0, 1.8, 100 * s, 3200 * s, 1, 0, 1.2);
    for (const p of this.fire) this.emit(p, rand(60, 220) * s, rand(1.8, 3.4), 250 * s, rand(900, 1500) * s, 0.7, 0.9, 0.9);
    for (const p of this.embers) this.emit(p, rand(250, 750) * s, rand(1.8, 3.6), rand(25, 50) * s, 8 * s, 1, 0.3, 1);
    for (const p of this.smoke) this.emit(p, rand(30, 90) * s, rand(5, 7), 300 * s, rand(1100, 1600) * s, 0.5, 0.5, 1.5);
    for (const c of this.chunks) this.throwChunk(c, s);
    this.chunkMat.emissiveIntensity = 1.4;
  }

  emit(p, speed, life, s0, s1, peak, drag, fade) {
    p.sprite.position.copy(this.center);
    randomDir(p.vel).multiplyScalar(speed);
    Object.assign(p, { age: 0, life, s0, s1, peak, drag, fade });
    p.sprite.visible = true;
  }

  throwChunk(c, s) {
    c.mesh.position.copy(this.center);
    c.mesh.scale.set(rand(4, 11), rand(3, 8), rand(4, 10)).multiplyScalar(s);
    randomDir(c.vel).multiplyScalar(rand(60, 220) * s);
    randomDir(c.spin).multiplyScalar(rand(1, 4));
    c.mesh.visible = true;
  }

  // Returns true on the frame the rock bursts (host adds screen shake then).
  update(dt) {
    if (this.phase === 'idle') return false;
    this.t += dt;
    if (this.phase === 'warn') {
      this.rock.material.emissiveIntensity = (this.t / WARN) ** 2 * (1.2 + 0.4 * Math.sin(this.t * 30));
      this.rock.rotation.y += dt * 0.6;
      if (this.t < WARN) return false;
      this.burst();
      return true;
    }
    for (const p of this.all) stepParticle(p, dt);
    for (const c of this.chunks) {
      c.mesh.position.addScaledVector(c.vel, dt);
      c.mesh.rotation.x += c.spin.x * dt;
      c.mesh.rotation.y += c.spin.y * dt;
    }
    this.chunkMat.emissiveIntensity = Math.max(0, 1.4 - this.t * 0.35);
    if (this.t > 8) this.finish();
    return false;
  }

  finish() {
    this.phase = 'idle';
    for (const p of this.all) p.sprite.visible = false;
    for (const c of this.chunks) c.mesh.visible = false;
  }

  dispose() {
    disposeTree(this.group);
  }
}
