// Sky, atmosphere, lights, celestial bodies and weather particles for the surface view.
import * as THREE from 'three';
import { rngOf } from '../core/rng.js';
import { glowTexture } from '../assets/textures.js';
import { DayCycle } from '../surprise/day-cycle.js';
import { Aurora, hasAurora } from '../surprise/aurora.js';
import { EarthSky } from '../earth/earth-sky.js';
import { EarthGlobe } from '../earth/earth-globe.js';

const SPACE = new THREE.Color(0x02030a);
const TAU = Math.PI * 2;
const FOGGY = ['Berkabut', 'Badai debu', 'Kabut spora', 'Badai salju', 'Kabut kuning',
  'Asap tebal', 'Hujan abu', 'Badai laut', 'Lembap'];
const WEATHER = {
  snow: { fall: 2.2, drift: 0.8, size: 0.22, n: 1400 },
  rain: { fall: 24, drift: 0.3, size: 0.1, n: 1600 },
  dust: { fall: 0.4, drift: 9, size: 0.28, n: 1200 },
  ash: { fall: 1.4, drift: 1.2, size: 0.22, n: 1200 },
  spores: { fall: -0.5, drift: 0.6, size: 0.3, n: 700 },
};
const WEATHER_OF = {
  'Badai salju': 'snow', 'Angin beku': 'snow', 'Hujan ringan': 'rain', 'Badai petir': 'rain',
  'Hujan asam': 'rain', 'Gerimis': 'rain', 'Badai laut': 'rain', 'Badai debu': 'dust',
  'Angin kencang': 'dust', 'Hujan abu': 'ash', 'Kabut spora': 'spores', 'Badai radiasi': 'spores',
  'Pulsa cahaya': 'spores', 'Lembap': 'spores',
};
const BOX = { x: 40, y: 24, z: 40 };
const NIGHT_SKY = new THREE.Color(0x03050d);
const NIGHT_HEMI = new THREE.Color(0x6072b8); // moonlight
const DUSK = new THREE.Color(0xff6a2c);
const _warm = new THREE.Color();

function weatherColor(kind, planet) {
  const p = planet.palette;
  if (kind === 'rain') return 0xa8c8ff;
  if (kind === 'dust') return p.ground1;
  if (kind === 'ash') return 0x4a4642;
  if (kind === 'spores') return p.floraAlt;
  return 0xffffff;
}

function wrap(v, center, half) {
  const d = v - center;
  if (d < -half) return v + half * 2;
  if (d > half) return v - half * 2;
  return v;
}

// Falling particles in a box that wraps around the player.
class WeatherParticles {
  constructor(scene, planet, kind) {
    this.cfg = WEATHER[kind];
    this.scene = scene;
    this.t = 0;
    const rng = rngOf(planet.seed, 5151);
    const pos = new Float32Array(this.cfg.n * 3);
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] = rng.range(-BOX.x, BOX.x);
      pos[i + 1] = rng.range(-BOX.y, BOX.y);
      pos[i + 2] = rng.range(-BOX.z, BOX.z);
    }
    this.geo = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(pos, 3);
    this.attr.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', this.attr);
    this.mat = new THREE.PointsMaterial({ color: weatherColor(kind, planet), size: this.cfg.size,
      transparent: true, opacity: 0.8, depthWrite: false });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  update(dt, p) {
    this.t += dt;
    const c = this.cfg, a = this.attr.array;
    const dx = Math.cos(this.t * 0.3) * c.drift * dt, dz = Math.sin(this.t * 0.23) * c.drift * dt;
    const fall = c.fall * dt;
    for (let i = 0; i < a.length; i += 3) {
      a[i] = wrap(a[i] + dx, p.x, BOX.x);
      a[i + 1] = wrap(a[i + 1] - fall, p.y, BOX.y);
      a[i + 2] = wrap(a[i + 2] + dz, p.z, BOX.z);
    }
    this.attr.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.geo.dispose();
    this.mat.dispose();
  }
}

// Base density hides the terrain edge (~200 units); weather thickens it. Worlds with a far
// terrain ring (Earth, airless moons) see for kilometres.
function fogDensity(planet, airless) {
  if (planet.style === 'earth') return FOGGY.includes(planet.weather) ? 0.0009 : 0.00036;
  if (airless) return 0.00045;
  return 0.0085 + planet.atmosphereDensity * 0.004 + (FOGGY.includes(planet.weather) ? 0.007 : 0);
}

function sunDirection(rng) {
  const az = rng.range(0, TAU), el = rng.range(0.3, 1.1);
  return new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
}

export class SurfaceSky {
  constructor(scene, planet, system) {
    this.scene = scene;
    this.group = new THREE.Group(); // follows the player so sky objects stay far away
    scene.add(this.group);
    this.owned = []; // geometries + materials to dispose
    const rng = rngOf(planet.seed, 4242);
    sunDirection(rng); // keeps the rng stream (moons, rings, stars) unchanged
    this.cycle = new DayCycle(planet);
    this.sunDir = this.cycle.sunDir; // moves with the day cycle
    this.setupAtmosphere(planet);
    this.setupLights(planet, system);
    this.addSun(system);
    this.addMoons(planet, rng);
    if (planet.rings) this.addRings(planet, rng);
    this.addStars(planet, rng);
    this.aurora = hasAurora(planet) && !this.airless ? new Aurora(this.group, planet) : null;
    this.extra = planet.style === 'earth' ? new EarthSky(this.group, this.scene, planet)
      : planet.style === 'moon' ? new EarthGlobe(this.group) : null;
    const kind = WEATHER_OF[planet.weather];
    this.weather = kind ? new WeatherParticles(scene, planet, kind) : null;
    this.applyDayCycle(0);
  }

  get nightFactor() { return this.cycle.nightFactor; } // 0 day .. 1 night
  get timeOfDay() { return this.cycle.timeOfDay; } // 0 midnight, 0.25 sunrise, 0.5 noon, 0.75 sunset

  own(...items) {
    this.owned.push(...items);
    return items[0];
  }

  setupAtmosphere(planet) {
    const d = planet.atmosphereDensity;
    this.airless = d < 0.05; // black starry sky, no haze
    const bg = new THREE.Color(planet.palette.sky).lerp(new THREE.Color(planet.palette.fog), 0.35);
    bg.lerp(SPACE, this.airless ? 1 : Math.pow(1 - d, 1.5));
    const density = fogDensity(planet, this.airless);
    this.dayBg = bg.clone();
    this.nightBg = bg.clone().multiplyScalar(0.03).lerp(NIGHT_SKY, 0.7);
    this.duskAmount = this.airless ? 0 : 0.3 + d * 0.4; // thin air: weak sunset colours
    this.scene.background = bg;
    this.scene.fog = new THREE.FogExp2(bg.clone(), density);
  }

  setupLights(planet, system) {
    const star = system?.star?.color ?? 0xffffff;
    const tint = new THREE.Color(0xffffff).lerp(new THREE.Color(star), 0.55);
    const d = planet.atmosphereDensity;
    // No air, no scattered light: shadowed sides stay nearly black.
    this.hemi = new THREE.HemisphereLight(planet.palette.sky, planet.palette.ground1, this.airless ? 0.12 : 0.5 + d * 0.9);
    this.hemiBase = { color: this.hemi.color.clone(), intensity: this.hemi.intensity };
    this.sunTint = tint.clone();
    this.sunPower = this.airless ? 3.2 : 2.4;
    this.sun = new THREE.DirectionalLight(tint, this.sunPower);
    this.sun.position.copy(this.sunDir).multiplyScalar(100);
    this.group.add(this.hemi, this.sun, this.sun.target);
  }

  addSun(system) {
    const color = system?.star?.color ?? 0xfff2cc;
    const size = system?.star?.size ?? 10;
    const mat = this.own(new THREE.SpriteMaterial({ map: glowTexture(color), color, fog: false,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(this.sunDir).multiplyScalar(3000);
    sprite.scale.setScalar(this.airless ? 900 : 55 * size); // airless: a hard disc, no glare
    this.sunSprite = sprite;
    // Warm halo on the horizon around sunrise / sunset.
    const glowMat = this.own(new THREE.SpriteMaterial({ map: glowTexture(0xff8a4a), color: DUSK, fog: false,
      transparent: true, depthWrite: false, opacity: 0 }));
    this.duskGlow = new THREE.Sprite(glowMat);
    this.duskGlow.scale.set(5200, 2600, 1);
    this.group.add(sprite, this.duskGlow);
  }

  addMoons(planet, rng) {
    if (!planet.moons) return;
    const geo = this.own(new THREE.SphereGeometry(1, 32, 16));
    for (let i = 0; i < planet.moons; i++) {
      const az = rng.range(0, TAU), el = rng.range(0.12, 0.8);
      const color = new THREE.Color().setHSL(rng.next(), rng.range(0.05, 0.35), rng.range(0.45, 0.7));
      const mat = this.own(new THREE.MeshStandardMaterial({ color, roughness: 1, fog: false }));
      const moon = new THREE.Mesh(geo, mat);
      moon.position.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
      moon.position.multiplyScalar(2500);
      moon.scale.setScalar(rng.range(80, 220));
      this.group.add(moon);
    }
  }

  addRings(planet, rng) {
    const color = new THREE.Color(planet.palette.rock).lerp(new THREE.Color(0xffffff), 0.5);
    const tilt = rng.range(0.25, 0.6), spin = rng.range(0, TAU);
    const bands = [[2200, 2750, 0.24], [2850, 3400, 0.14]];
    for (const [inner, outer, opacity] of bands) {
      const geo = this.own(new THREE.RingGeometry(inner, outer, 160, 1));
      const mat = this.own(new THREE.MeshBasicMaterial({ color, transparent: true, opacity,
        side: THREE.DoubleSide, fog: false, depthWrite: false }));
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.set(-Math.PI / 2 + tilt, 0, spin);
      ring.position.y = -600;
      this.group.add(ring);
    }
  }

  addStars(planet, rng) {
    const n = 1500, pos = new Float32Array(n * 3);
    for (let i = 0; i < pos.length; i += 3) {
      const az = rng.range(0, TAU), y = rng.range(-0.1, 1), r = Math.sqrt(1 - y * y);
      pos[i] = Math.cos(az) * r * 4000;
      pos[i + 1] = y * 4000;
      pos[i + 2] = Math.sin(az) * r * 4000;
    }
    const geo = this.own(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starBase = Math.max(0, 1 - planet.atmosphereDensity * 1.5);
    const mat = this.own(new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false,
      fog: false, transparent: true, opacity: this.starBase, depthWrite: false }));
    this.stars = new THREE.Points(geo, mat);
    this.stars.frustumCulled = false;
    this.group.add(this.stars);
  }

  // Sky colour, fog, lights, sun disc and stars for the current time of day.
  applyDayCycle(dt) {
    const c = this.cycle;
    c.advance(dt);
    const night = c.nightFactor, dusk = c.twilight * this.duskAmount;
    const bg = this.scene.background.copy(this.dayBg).lerp(DUSK, dusk * 0.8)
      .lerp(this.nightBg, Math.max(night, c.twilight * 0.3));
    this.scene.fog.color.copy(bg);
    this.hemi.color.copy(this.hemiBase.color).lerp(NIGHT_HEMI, night);
    this.hemi.intensity = this.hemiBase.intensity * (1 - 0.4 * night);
    this.sun.color.copy(this.sunTint).lerp(_warm.copy(DUSK).lerp(this.sunTint, 0.4), c.twilight * 0.8);
    this.sun.intensity = this.sunPower * c.daylight;
    this.sun.position.copy(c.sunDir).multiplyScalar(100);
    this.sunSprite.position.copy(c.sunDir).multiplyScalar(3000);
    this.sunSprite.material.opacity = c.daylight;
    this.duskGlow.position.set(c.sunDir.x, Math.max(c.sunDir.y, 0.02), c.sunDir.z).setLength(2800);
    this.duskGlow.material.opacity = c.twilight * this.duskAmount;
    this.stars.visible = this.starBase > 0.01 || night > 0.01;
    this.stars.material.opacity = Math.max(this.starBase, night * 0.95);
    this.aurora?.update(dt, night);
    this.extra?.update(dt, c, bg);
  }

  update(dt, playerPos) {
    this.group.position.copy(playerPos);
    this.applyDayCycle(dt);
    this.weather?.update(dt, playerPos);
  }

  dispose() {
    this.scene.remove(this.group);
    for (const item of this.owned) item.dispose();
    this.hemi.dispose();
    this.sun.dispose();
    this.weather?.dispose();
    this.aurora?.dispose();
    this.extra?.dispose();
    this.scene.background = null;
    this.scene.fog = null;
  }
}
