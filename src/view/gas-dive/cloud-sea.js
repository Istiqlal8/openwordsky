// The endless cloud sea: stacked layers of instanced billboard puffs plus a wide veil plane
// per layer, and distant storm towers. Instances wrap around the camera inside the shader,
// so nothing is rebuilt as you fly.
import * as THREE from 'three';
import { Rng, hash32 } from '../../core/rng.js';
import { puffTexture, deckTexture } from './gas-textures.js';
import { SPRITE_VERT, SPRITE_FRAG, DECK_VERT, DECK_FRAG, sharedCloudUniforms, cloudMaterial } from './cloud-shaders.js';
import { BAND_PERIOD } from './gas-palette.js';

// y: layer centre, n: puffs, size: [min, max] metres, cover: veil threshold (higher = more gaps).
const LAYERS = [
  { y: -20, n: 380, span: 7000, size: [160, 420], thick: 70, clusters: 44, spread: 520, cover: 0.34, wind: [9, 2] },
  { y: -620, n: 250, span: 7000, size: [180, 460], thick: 110, clusters: 26, spread: 460, cover: 0.46, wind: [-6, 3] },
  { y: -1200, n: 230, span: 7000, size: [200, 500], thick: 130, clusters: 24, spread: 460, cover: 0.44, wind: [12, -2] },
  { y: -1800, n: 210, span: 7000, size: [220, 520], thick: 150, clusters: 22, spread: 440, cover: 0.42, wind: [-10, -4] },
  { y: -2450, n: 190, span: 7000, size: [240, 560], thick: 170, clusters: 20, spread: 440, cover: 0.38, wind: [7, 5] },
];
const STORM = { columns: 7, per: 18, span: 26000, bottom: -2700, top: 1500, wind: [2, 0] };
const DECK_RADIUS = 22000;

function puffGeometry(bases, data) {
  const geo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geo.index = quad.index;
  geo.setAttribute('position', quad.getAttribute('position'));
  geo.setAttribute('iBase', new THREE.InstancedBufferAttribute(new Float32Array(bases), 3));
  geo.setAttribute('iData', new THREE.InstancedBufferAttribute(new Float32Array(data), 4));
  geo.instanceCount = bases.length / 3;
  quad.dispose();
  return geo;
}

// Clumped puffs: every puff sits near one of the layer's cluster centres, leaving gaps between.
function layerPuffs(L, rng) {
  const centres = Array.from({ length: L.clusters }, () => [rng.range(-0.5, 0.5) * L.span, rng.range(-0.5, 0.5) * L.span]);
  const bases = [], data = [];
  for (let i = 0; i < L.n; i++) {
    const [cx, cz] = rng.pick(centres);
    const r = Math.sqrt(rng.next()) * L.spread, a = rng.next() * Math.PI * 2;
    bases.push(cx + Math.cos(a) * r, L.y + rng.range(-1, 1) * L.thick, cz + Math.sin(a) * r);
    data.push(rng.range(L.size[0], L.size[1]), rng.range(0, 6.28), rng.range(0.82, 1.08), rng.range(1, 1.8));
  }
  return { bases, data };
}

// Storm towers: stacked puffs rising through every layer, flattening into an anvil on top.
function stormPuffs(rng) {
  const centres = [], bases = [], data = [];
  for (let c = 0; c < STORM.columns; c++) {
    const cx = rng.range(-0.5, 0.5) * STORM.span, cz = rng.range(-0.5, 0.5) * STORM.span;
    centres.push({ x: cx, z: cz, r: rng.range(500, 800) });
    for (let i = 0; i < STORM.per; i++) {
      const t = Math.pow(i / (STORM.per - 1), 0.6), anvil = i >= STORM.per - 3; // most puffs above the tops
      const y = STORM.bottom + (STORM.top - STORM.bottom) * t;
      bases.push(cx + rng.range(-120, 120), y, cz + rng.range(-120, 120));
      data.push(anvil ? rng.range(900, 1200) : rng.range(420, 620), rng.range(0, 6.28), rng.range(0.75, 1), anvil ? 3 : 1);
    }
  }
  return { centres, bases, data };
}

export class CloudSea {
  constructor(scene, pal) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.shared = sharedCloudUniforms(pal.bandTex, BAND_PERIOD);
    this.sprites = [];
    this.decks = [];
    const rng = new Rng(hash32(pal.seed, 0xc10d5));
    this.deckGeo = new THREE.PlaneGeometry(DECK_RADIUS * 2, DECK_RADIUS * 2).rotateX(-Math.PI / 2);
    for (const L of LAYERS) {
      const { bases, data } = layerPuffs(L, rng);
      this.addSprites(bases, data, L.span, L.wind);
      this.addDeck(L, pal.seed);
    }
    const storm = stormPuffs(rng);
    this.storms = storm.centres;
    this.addSprites(storm.bases, storm.data, STORM.span, STORM.wind);
    this.count = this.sprites.reduce((n, m) => n + m.geometry.instanceCount, 0);
  }

  addSprites(bases, data, span, wind) {
    const own = { uMap: { value: puffTexture() }, uSpan: { value: span }, uOpacity: { value: 0.92 },
      uWind: { value: new THREE.Vector2(...wind) } };
    const mesh = new THREE.Mesh(puffGeometry(bases, data), cloudMaterial(SPRITE_VERT, SPRITE_FRAG, this.shared, own));
    mesh.frustumCulled = false;
    this.group.add(mesh);
    this.sprites.push(mesh);
  }

  addDeck(L, seed) {
    const own = { uDeck: { value: deckTexture(seed) }, uTile: { value: 2600 }, uCover: { value: L.cover },
      uOpacity: { value: 1 }, uRadius: { value: DECK_RADIUS }, uWind: { value: new THREE.Vector2(...L.wind) } };
    const mesh = new THREE.Mesh(this.deckGeo, cloudMaterial(DECK_VERT, DECK_FRAG, this.shared, own));
    mesh.position.y = L.y;
    mesh.frustumCulled = false;
    this.group.add(mesh);
    this.decks.push(mesh);
  }

  // light: { top, deep } colors; flash: { pos, color, range } from the lightning system.
  update(time, cam, light, flash) {
    const u = this.shared;
    u.uTime.value = time;
    u.uCam.value.copy(cam);
    u.uLightTop.value.copy(light.top);
    u.uLightDeep.value.copy(light.deep);
    u.uFlashPos.value.copy(flash.pos);
    u.uFlashCol.value.copy(flash.color);
    u.uFlashRange.value = flash.range;
    for (const d of this.decks) this.placeDeck(d, cam);
    this.sortLayers(cam);
  }

  // Veils follow the camera; they fade out while you are inside them (puffs take over).
  placeDeck(deck, cam) {
    deck.position.x = cam.x;
    deck.position.z = cam.z;
    const gap = Math.abs(cam.y - deck.position.y);
    deck.material.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(gap, 60, 260) * 0.95;
  }

  // Draw the layers farthest from the camera first so the nearest veil blends on top.
  sortLayers(cam) {
    for (let i = 0; i < LAYERS.length; i++) {
      const order = -Math.abs(cam.y - LAYERS[i].y);
      this.decks[i].renderOrder = order;
      this.sprites[i].renderOrder = order + 1;
    }
    this.sprites[LAYERS.length].renderOrder = -1e5; // storms are far away: draw first
  }

  // 0..1: how deep inside a storm tower the point is.
  stormAt(pos, time) {
    let best = 0;
    for (const s of this.storms) {
      const x = s.x + STORM.wind[0] * time, z = s.z + STORM.wind[1] * time;
      const dx = wrap(x - pos.x, STORM.span), dz = wrap(z - pos.z, STORM.span);
      const d = Math.hypot(dx, dz);
      if (pos.y > STORM.top) continue;
      best = Math.max(best, 1 - THREE.MathUtils.smoothstep(d, s.r * 0.6, s.r * 2.2));
    }
    return best;
  }

  // Nearest storm centre (wrapped around pos), written into out. Used to aim lightning.
  nearestStorm(pos, time, out) {
    let best = Infinity;
    for (const s of this.storms) {
      const dx = wrap(s.x + STORM.wind[0] * time - pos.x, STORM.span);
      const dz = wrap(s.z + STORM.wind[1] * time - pos.z, STORM.span);
      const d = dx * dx + dz * dz;
      if (d < best) { best = d; out.set(pos.x + dx, 0, pos.z + dz); }
    }
    return Math.sqrt(best);
  }

  dispose() {
    for (const m of [...this.sprites, ...this.decks]) m.material.dispose();
    for (const m of this.sprites) m.geometry.dispose();
    this.deckGeo.dispose();
    this.group.removeFromParent();
  }
}

function wrap(d, span) {
  return d - span * Math.round(d / span);
}

export const LAYER_YS = LAYERS.map((L) => L.y);
