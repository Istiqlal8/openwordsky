// Ancient ruin sites with light beacons; interacting reveals lore and a one-time reward.
import * as THREE from 'three';
import { rngOf } from '../core/rng.js';
import { word } from '../gen/names.js';
import { hsl } from '../core/color.js';
import { BUILDERS, disposeGroup } from './ruins-models.js';
import { LORE, rollReward } from './ruins-lore.js';

const KINDS = Object.keys(BUILDERS);
const REACH = 6; // interaction distance from a site's footprint
const OWNERS = ['Kaum Seraphel', 'Sang Arsitek', 'Para Penenun Bintang', 'Dewan Orrith', 'Kaum Vael'];

const BEAM_VERT = `varying float vY; void main() { vY = uv.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BEAM_FRAG = `uniform vec3 uColor; uniform float uPulse; varying float vY;
  void main() { float a = pow(1.0 - vY, 2.2) * smoothstep(0.0, 0.03, vY) * uPulse * 0.8;
    gl_FragColor = vec4(uColor * (1.0 + a), a); }`;

export class Ruins {
  constructor(surface) {
    this.surface = surface;
    this.sites = [];
    this.mats = null;
    this.time = 0;
    this.galaxySeed = null; // set by the caller to enable star-map hints
  }

  // Planet session: 1-3 sites on ~60% of rocky planets.
  mount(planet, galaxySeed = this.galaxySeed) {
    this.dispose();
    this.galaxySeed = galaxySeed;
    this.planet = planet;
    const rng = rngOf(planet.seed, 0x7a11);
    if (planet.gas || !rng.chance(0.6)) return;
    this.mats = this.makeMats(planet, rng);
    const count = 1 + rng.int(3);
    for (let i = 0; i < count; i++) this.addSite(rng, i);
  }

  makeMats(planet, rng) {
    const std = (o) => new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9, ...o });
    const glow = hsl(rng.pick([0.5, 0.55, 0.8, 0.12, 0.33]), 0.9, 0.6);
    return {
      stone: std({ color: new THREE.Color(planet.palette.rock).lerp(new THREE.Color(0xb8b0a0), 0.5) }),
      dark: std({ color: 0x15131a }),
      obsidian: std({ color: 0x0c0b12, roughness: 0.25, metalness: 0.7 }),
      metal: std({ color: 0x7b8088, roughness: 0.5, metalness: 0.6 }),
      panel: std({ color: 0x1b2a4a, roughness: 0.3, metalness: 0.5 }),
      scorch: new THREE.MeshBasicMaterial({ color: 0x0d0b09, transparent: true, opacity: 0.55,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
      glowColor: glow,
    };
  }

  // Dry, fairly flat spot 60..400 units from spawn; the first site stays fairly close.
  findSpot(rng, i, radius) {
    const { spawn } = this.surface, t = this.planet.terrain;
    const minY = t.hasWater ? t.waterY + 0.6 : -Infinity;
    let fallback = null;
    for (let k = 0; k < 24; k++) {
      const a = rng.range(0, Math.PI * 2), r = i === 0 ? rng.range(60, 150) : rng.range(90, 400);
      const spot = { x: spawn.x + Math.cos(a) * r, z: spawn.z + Math.sin(a) * r };
      const { low, high } = this.groundRange(spot, radius);
      if (low <= minY) continue;
      spot.y = low;
      if (high - low < 4) return spot;
      fallback ??= spot;
    }
    return fallback;
  }

  addSite(rng, i) {
    const kind = KINDS[rng.int(KINDS.length)];
    const spot = this.findSpot(rng, i, kind === 'cincin' ? 14 : 6);
    if (!spot) return;
    const rune = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: this.mats.glowColor,
      emissiveIntensity: 1.5, flatShading: true });
    const built = BUILDERS[kind].build(rng, { ...this.mats, rune });
    built.group.position.set(spot.x, spot.y, spot.z); // lowest ground: sinks into slopes, never floats
    const beam = this.makeBeacon(built.group);
    this.surface.scene.add(built.group);
    this.sites.push({ kind, ...built, rune, beam, x: spot.x, z: spot.z, phase: rng.range(0, 6),
      name: `${BUILDERS[kind].label} ${word(rng)}`, owner: rng.pick(OWNERS),
      lore: rng.pick(LORE), rewardSeed: rng.int(1e9), dormant: false });
  }

  // Min / max ground height over a footprint circle.
  groundRange(spot, r) {
    const h = this.surface.h;
    let low = h(spot.x, spot.z), high = low;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, y = h(spot.x + Math.cos(a) * r, spot.z + Math.sin(a) * r);
      low = Math.min(low, y);
      high = Math.max(high, y);
    }
    return { low, high };
  }

  makeBeacon(group) {
    const mat = new THREE.ShaderMaterial({ vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG,
      uniforms: { uColor: { value: new THREE.Color(this.mats.glowColor) }, uPulse: { value: 1 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 700, 10, 1, true), mat);
    beam.position.y = 350;
    beam.frustumCulled = false;
    group.add(beam);
    return beam;
  }

  update(dt) {
    this.time += dt;
    for (const s of this.sites) {
      for (const p of s.spin) p.rotation.y += p.userData.speed * dt;
      if (s.dormant) continue;
      const wave = Math.sin(this.time * 2.2 + s.phase);
      s.rune.emissiveIntensity = 1.3 + wave * 0.9;
      s.beam.material.uniforms.uPulse.value = 0.75 + wave * 0.25;
    }
  }

  // Horizontal distance from pos to the site's footprint.
  distanceTo(s, pos) {
    return Math.max(0, Math.hypot(pos.x - s.x, pos.z - s.z) - s.reach);
  }

  nearestSite(pos) {
    let best = null, bestD = Infinity;
    for (const s of this.sites) {
      const d = this.distanceTo(s, pos);
      if (d < bestD) { best = s; bestD = d; }
    }
    return best ? { site: best, distance: bestD } : null;
  }

  // -> { kind, name, distance, dormant, x, z } | null
  nearest(pos) {
    const n = this.nearestSite(pos);
    if (!n) return null;
    const s = n.site;
    return { kind: s.kind, name: s.name, distance: n.distance, dormant: s.dormant, x: s.x, z: s.z };
  }

  // -> { title, text, reward } or null when no site is within reach.
  interact(pos, player) {
    const n = this.nearestSite(pos);
    if (!n || n.distance > REACH) return null;
    const s = n.site;
    if (s.dormant) return { title: s.name, text: 'Situs ini telah terdiam.', reward: null };
    const reward = rollReward(rngOf(s.rewardSeed), this.galaxySeed, this.planet.systemIndex);
    if (reward.item) player?.addItem(reward.item, reward.n);
    this.sleep(s);
    return { title: `${s.name} · ${s.owner}`, text: s.lore, reward };
  }

  sleep(s) {
    s.dormant = true;
    s.rune.emissiveIntensity = 0.08;
    s.beam.visible = false;
  }

  dispose() {
    for (const s of this.sites) {
      this.surface.scene.remove(s.group);
      disposeGroup(s.group);
      s.rune.dispose();
      s.beam.material.dispose();
    }
    if (this.mats) for (const m of Object.values(this.mats)) m.dispose?.();
    this.sites = [];
    this.mats = null;
  }
}
