// Surface night-sky extras: shooting stars and a rare distant explosion flash on the horizon.
import * as THREE from 'three';
import { glowTexture } from '../../assets/textures.js';
import { shockTexture } from '../../fx/fx-textures.js';
import { ShootingStars } from './shooting-stars.js';
import { Rng } from '../../core/rng.js';
import { rand, glowSprite, envelope } from './util.js';

const FLASH_GAP = [40, 120];
const FLASH_LIFE = 9;
const FLASH_DIST = 2600;
const TINTS = [0xff8a40, 0xff5a30, 0x9fffd0, 0x8fb8ff, 0xffe080];

// A thick atmosphere burns meteors up before they show; young/barren systems see many,
// calm lush worlds very few. 0 = none.
function meteorRate(planet) {
  const rng = new Rng(planet.seed ^ 0x3e7a);
  const quiet = planet.biome.id === 'lush' || planet.style === 'earth' || planet.terrain.hasWater;
  if (quiet && !rng.chance(0.25)) return 0;             // most lush/ocean worlds: clear skies
  if (planet.atmosphereDensity > 0.66 && !rng.chance(0.5)) return 0;
  return rng.chance(0.3) ? 1 : rng.range(0.25, 0.6);   // some worlds get a real shower
}

export class SkyExtras {
  constructor(scene, planet) {
    this.planet = planet;
    this.meteorRate = meteorRate(planet);
    this.group = new THREE.Group();
    this.group.name = 'sky-extras';
    const heavy = this.meteorRate > 0.8;
    this.meteors = new ShootingStars({ radius: 2200, width: 10, count: heavy ? 6 : 3,
      gap: heavy ? [2, 7] : [8, 26], upper: true });
    this.flash = glowSprite(glowTexture(0xffffff));
    this.glow = glowSprite(glowTexture(0xffffff));
    this.haze = glowSprite(glowTexture(0xffffff));
    this.ring = glowSprite(shockTexture());
    this.spot = new THREE.Group();
    this.spot.add(this.haze, this.glow, this.flash, this.ring);
    this.group.add(this.meteors.mesh, this.spot);
    scene.add(this.group);
    this.age = FLASH_LIFE;
    this.timer = rand(20, 60);
    this.onFlash = null; // optional (level 0..1) => void
  }

  // nightFactor: 0 day .. 1 night. Undefined -> guess from atmosphere density.
  update(dt, camera, nightFactor) {
    const night = nightFactor ?? (this.planet.atmosphereDensity < 0.34 ? 1 : 0.2);
    this.group.position.copy(camera.position);
    const rate = night < 0.25 ? 0 : night * this.meteorRate;
    if (rate > 0) this.meteors.update(dt, camera, rate, THREE.MathUtils.smoothstep(night, 0.2, 0.8));
    this.timer -= dt * (night > 0.3 ? 1 : 0);
    if (this.timer <= 0 && this.age >= FLASH_LIFE) this.startFlash();
    this.stepFlash(dt, night);
  }

  startFlash() {
    const az = rand(0, Math.PI * 2);
    const el = rand(0.015, 0.06);
    this.spot.position.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(FLASH_DIST);
    const tint = TINTS[Math.floor(Math.random() * TINTS.length)];
    this.glow.material.color.set(tint);
    this.haze.material.color.set(tint);
    this.ring.material.color.set(tint).lerp(this.flash.material.color, 0.4);
    this.flash.visible = this.glow.visible = this.haze.visible = this.ring.visible = true;
    this.age = 0;
    this.timer = rand(...FLASH_GAP);
  }

  stepFlash(dt, night) {
    if (this.age >= FLASH_LIFE) return;
    this.age += dt;
    const a = this.age;
    const vis = 0.35 + 0.65 * night;
    const pop = envelope(a, 0.08, 1.6);
    this.flash.scale.setScalar(250 + 900 * pop);
    this.flash.material.opacity = pop * vis;
    this.glow.scale.setScalar(800 + 900 * Math.min(1, a / 3));
    this.glow.position.y = 60 + a * 30; // the fireball rises slowly
    this.glow.material.opacity = envelope(a, 0.3, FLASH_LIFE) * vis;
    this.haze.scale.setScalar(3600);
    this.haze.material.opacity = envelope(a, 0.1, FLASH_LIFE * 0.6) * 0.5 * vis;
    this.ring.scale.setScalar(200 + 2400 * (1 - Math.exp(-a / 1.2)));
    this.ring.material.opacity = envelope(a, 0.15, 3.5) * 0.8 * vis;
    this.onFlash?.(pop * vis);
    if (this.age >= FLASH_LIFE) this.flash.visible = this.glow.visible = this.haze.visible = this.ring.visible = false;
  }

  triggerFlash() { this.timer = 0; }

  dispose() {
    this.meteors.dispose();
    for (const s of [this.flash, this.glow, this.haze, this.ring]) s.material.dispose();
    this.group.removeFromParent();
  }
}
