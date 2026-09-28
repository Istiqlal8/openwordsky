// What lies beyond the freighter's openings: stars, a planet (bridge window), a moon and the
// hangar door's force field. Returns animated parts for the interior to update.
import * as THREE from 'three';
import { Rng, hash32 } from '../core/rng.js';
import { makeCanvas, toTexture } from '../assets/canvas.js';
import { glowTexture } from '../assets/textures.js';
import { SPACE_DOOR } from './interior-shell.js';

const SUN_DIR = new THREE.Vector3(-0.8, 0.35, 0.5).normalize();

function stars(rng) {
  const n = 2600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const u = rng.next() * 2 - 1, th = rng.next() * Math.PI * 2, s = Math.sqrt(1 - u * u) * 1500;
    pos.set([Math.cos(th) * s, u * 1500, Math.sin(th) * s], i * 3);
    c.setHSL(rng.pick([0.6, 0.08, 0.13, 0.55]), 0.4, rng.range(0.55, 0.95));
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false }));
}

// Banded planet texture from a seeded palette.
function planetTexture(rng) {
  const c = makeCanvas(512, 256), g = c.getContext('2d');
  const hue = rng.next();
  for (let y = 0; y < 256; y += 4) {
    const l = 38 + Math.sin(y * 0.09 + rng.next() * 0.6) * 12 + rng.range(-6, 6);
    g.fillStyle = `hsl(${(hue * 360 + Math.sin(y * 0.03) * 30) | 0}, 45%, ${l | 0}%)`;
    g.fillRect(0, y, 512, 4);
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `hsla(${(hue * 360 + 40) | 0}, 30%, 80%, 0.18)`;
    g.beginPath(); g.ellipse(rng.range(0, 512), rng.range(0, 256), rng.range(10, 60), rng.range(3, 9), 0, 0, Math.PI * 2); g.fill();
  }
  return toTexture(c);
}

// Night side as a vertex-alpha shadow shell (no scene lights reach the planet).
function nightShell(radius, center) {
  const geo = new THREE.SphereGeometry(radius * 1.003, 48, 24);
  const n = geo.attributes.normal, a = new Float32Array(n.count * 4), v = new THREE.Vector3();
  for (let i = 0; i < n.count; i++) {
    const d = v.fromBufferAttribute(n, i).dot(SUN_DIR);
    a.set([0, 0, 0, THREE.MathUtils.clamp((0.15 - d) / 0.45, 0, 0.93)], i * 4);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 4));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
  m.position.copy(center);
  return m;
}

function planet(g, rng, textures, center, radius) {
  const tex = planetTexture(rng);
  textures.push(tex);
  const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), new THREE.MeshBasicMaterial({ map: tex }));
  body.position.copy(center);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(0x7fb8ff), transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(radius * 2.9);
  halo.position.copy(center);
  g.add(halo, body, nightShell(radius, center));
  return body;
}

function forceField(g, textures) {
  const c = makeCanvas(64, 256), x = c.getContext('2d');
  for (let y = 0; y < 256; y += 8) { x.fillStyle = `rgba(120,220,255,${0.15 + (y % 32 ? 0 : 0.4)})`; x.fillRect(0, y, 64, 2); }
  const tex = toTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 3);
  textures.push(tex);
  const D = SPACE_DOOR;
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0x66d0ff, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(D.x1 - D.x0, D.h), mat);
  m.position.set(0, D.h / 2, D.z - 0.05);
  g.add(m);
  return { mat, tex };
}

// Returns { planet, field } for animation.
export function buildOutside(g, seedText, textures) {
  let seed = 7;
  for (const ch of String(seedText)) seed = hash32(seed, ch.charCodeAt(0));
  const rng = new Rng(seed);
  g.add(stars(rng));
  const body = planet(g, rng, textures, new THREE.Vector3(160, 40, 820), 330);
  planet(g, rng, textures, new THREE.Vector3(-380, 120, -900), 90);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(0xfff0c0), transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending }));
  sun.position.copy(SUN_DIR).multiplyScalar(1200);
  sun.scale.setScalar(260);
  g.add(sun);
  return { planet: body, field: forceField(g, textures) };
}
