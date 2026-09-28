// Black hole for a system whose star has `blackHole: true`: event horizon, photon ring,
// accretion disk, fake gravitational lens, relativistic jets, infalling streaks, and gravity.
import * as THREE from 'three';
import { glowTexture } from '../../assets/textures.js';
import { buildBeam } from './beam.js';
import { disposeTree } from './util.js';
import { DISK_VERT, DISK_FRAG, LENS_VERT, LENS_FRAG, FALL_VERT, FALL_FRAG } from './black-hole-shaders.js';

const GRAVITY_K = 4e7;      // a = K / d^2 (u/s^2)
const GRAVITY_CAP = 400;    // cap near the horizon; boost (320 u/s) can still climb out
const DISK_INNER = 1.6;     // x horizon radius
const DISK_OUTER = 6.5;
const LENS_RADIUS = 14;
const EINSTEIN = 2.6;
const FALL_COUNT = 220;
const TILT = new THREE.Euler(0.36, 0, 0.18);

const tmpC = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const tmpQ = new THREE.Quaternion();

function palette(star) {
  const base = new THREE.Color(star.color);
  return {
    hot: new THREE.Color(1.0, 0.9, 0.78).multiplyScalar(1.25),
    mid: base.clone().multiplyScalar(1.1),
    cool: new THREE.Color(0.75, 0.12, 0.04),
  };
}

function diskMaterial(r, pal, center, normal, seed, intensity) {
  return new THREE.ShaderMaterial({
    vertexShader: DISK_VERT, fragmentShader: DISK_FRAG,
    uniforms: {
      uInner: { value: r * DISK_INNER }, uOuter: { value: r * DISK_OUTER }, uTime: { value: 0 },
      uIntensity: { value: intensity }, uSeed: { value: seed }, uHot: { value: pal.hot },
      uMid: { value: pal.mid }, uCool: { value: pal.cool }, uCenter: { value: center }, uNormal: { value: normal },
    },
    transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
}

// Main disk plus two faint offset haze layers give it visible thickness.
function buildDisk(r, pal, center, normal) {
  const geo = new THREE.RingGeometry(r * DISK_INNER, r * DISK_OUTER, 256, 24);
  const layers = [[0, 1, 1, 0], [0.11, 1.04, 0.32, 13.1], [-0.11, 0.97, 0.32, 27.7]];
  return layers.map(([y, s, k, seed]) => {
    const mesh = new THREE.Mesh(geo, diskMaterial(r, pal, center, normal, seed, k));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y * r;
    mesh.scale.setScalar(s);
    mesh.frustumCulled = false;
    return mesh;
  });
}

function buildLens(r, pal, center, normal) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: LENS_VERT, fragmentShader: LENS_FRAG,
    uniforms: {
      uCenter: { value: center }, uR: { value: r }, uLensR: { value: r * LENS_RADIUS },
      uEin: { value: r * EINSTEIN }, uTime: { value: 0 }, uBg: { value: null }, uHasBg: { value: 0 },
      uBgIntensity: { value: 1 }, uNormal: { value: normal }, uHot: { value: pal.hot }, uMid: { value: pal.mid },
    },
    transparent: true, depthWrite: false, fog: false, premultipliedAlpha: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r * LENS_RADIUS * 2, r * LENS_RADIUS * 2), mat);
  mesh.renderOrder = -1; // drawn first among transparents so ship glows / disk stay on top
  mesh.frustumCulled = false;
  return mesh;
}

function buildInfall(r, pal) {
  const seeds = new Float32Array(FALL_COUNT * 8);
  const tails = new Float32Array(FALL_COUNT * 2);
  for (let i = 0; i < FALL_COUNT; i++) {
    const s = [Math.random() * Math.PI * 2, 0.04 + Math.random() * 0.1, Math.random(), (Math.random() - 0.5) * 3];
    seeds.set(s, i * 8);
    seeds.set(s, i * 8 + 4);
    tails[i * 2 + 1] = 1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FALL_COUNT * 6), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geo.setAttribute('aTail', new THREE.BufferAttribute(tails, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: FALL_VERT, fragmentShader: FALL_FRAG,
    uniforms: {
      uTime: { value: 0 }, uInner: { value: r * 1.25 }, uOuter: { value: r * DISK_OUTER * 1.7 },
      uR: { value: r }, uHot: { value: pal.hot }, uCool: { value: pal.cool },
    },
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  return lines;
}

function buildJets(r) {
  const opts = { color: 0x6f9fff, core: 0xe8f2ff, len: r * 34, w0: r * 0.1, w1: r * 1.5, speed: 1.6, streaks: 9, fade: 1.3 };
  const up = buildBeam(opts);
  const down = buildBeam(opts);
  down.rotation.x = Math.PI;
  return [up, down];
}

function buildGlow(star, pal) {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture(star.color), color: pal.mid.clone().multiplyScalar(0.45), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(star.size * 30);
  return sprite;
}

// Tune brightness by distance: calmer up close (no white-out), bolder from far away.
function applyDistance(parts, dist, r) {
  const far = THREE.MathUtils.smoothstep(dist, r * 10, r * 60);
  parts.disks[0].material.uniforms.uIntensity.value = 0.6 + 0.9 * far;
  parts.glow.material.opacity = 0.12 + 0.7 * far;
  parts.glow.scale.setScalar(r * (30 + 40 * far));
  for (const jet of parts.jets) jet.material.uniforms.uW1.value = r * (1.5 + 1.2 * far);
}

// Walk up to the scene to borrow its equirect background for the lens.
function sceneBackground(obj) {
  let o = obj;
  while (o.parent) o = o.parent;
  const bg = o.isScene ? o.background : null;
  return bg?.isTexture ? { tex: bg, intensity: o.backgroundIntensity ?? 1 } : null;
}

function buildParts(star, pal, center, normal) {
  const r = star.size;
  return {
    disks: buildDisk(r, pal, center, normal), lens: buildLens(r, pal, center, normal),
    jets: buildJets(r), infall: buildInfall(r, pal), glow: buildGlow(star, pal),
    horizon: new THREE.Mesh(new THREE.SphereGeometry(r, 64, 40), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false })),
  };
}

// Per-frame animation: world center/normal for the shaders, time, lens facing, flicker.
function animate(bh, dt, camera) {
  const { parts, group, tilt, center, normal, r } = bh;
  bh.time += dt;
  const t = bh.time;
  group.getWorldPosition(center);
  normal.copy(UP).applyQuaternion(tilt.getWorldQuaternion(tmpQ));
  for (const d of parts.disks) d.material.uniforms.uTime.value = t;
  parts.infall.material.uniforms.uTime.value = t;
  parts.lens.lookAt(camera.position);
  const lu = parts.lens.material.uniforms;
  lu.uTime.value = t;
  const bg = sceneBackground(group);
  lu.uHasBg.value = bg ? 1 : 0;
  if (bg) { lu.uBg.value = bg.tex; lu.uBgIntensity.value = bg.intensity; }
  const flicker = 0.75 + 0.2 * Math.sin(t * 11.3) * Math.sin(t * 4.7) + 0.1 * Math.sin(t * 29.1);
  for (const jet of parts.jets) {
    jet.material.uniforms.uTime.value = t;
    jet.material.uniforms.uIntensity.value = flicker;
  }
  applyDistance(parts, tmpC.subVectors(camera.position, center).length(), r);
}

// Acceleration toward the hole (u/s^2) written into `out`.
function gravity(center, r, pos, out) {
  out.subVectors(center, pos);
  const d2 = Math.max(out.lengthSq(), r * r);
  return out.multiplyScalar(Math.min(GRAVITY_K / d2, GRAVITY_CAP) / Math.sqrt(d2));
}

export function buildBlackHole(star) {
  const pal = palette(star);
  const bh = {
    r: star.size, time: 0, center: new THREE.Vector3(), normal: new THREE.Vector3(0, 1, 0),
    group: new THREE.Group(), tilt: new THREE.Group(),
  };
  bh.parts = buildParts(star, pal, bh.center, bh.normal);
  const { parts, group, tilt } = bh;
  group.name = 'black-hole';
  tilt.rotation.copy(TILT);
  tilt.add(...parts.disks, ...parts.jets, parts.infall);
  group.add(parts.glow, parts.horizon, tilt, parts.lens);
  return {
    group,
    update: (dt, camera) => animate(bh, dt, camera),
    gravityAt: (pos, out) => gravity(bh.center, bh.r, pos, out),
    dispose: () => disposeTree(group),
  };
}
