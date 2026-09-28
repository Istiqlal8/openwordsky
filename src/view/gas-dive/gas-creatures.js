// Gas creatures: huge glowing jelly balloons and sky whales drifting between cloud layers.
// A handful of procedural animals wrapped around the camera so there is always one near.
import * as THREE from 'three';
import { Rng, hash32 } from '../../core/rng.js';
import { glowTexture } from '../../assets/textures.js';

const SPAN = 9000, STRANDS = 8, SEGS = 10;
const LEVELS = [-320, -900, -1500, -2100, -2700];
const HUES = [0.5, 0.55, 0.8, 0.9, 0.35, 0.12]; // few fixed glows keep the glow-texture cache small

function jelly(rng, glow, res) {
  const g = new THREE.Group();
  const bell = new THREE.Mesh(res.bell, new THREE.MeshStandardMaterial({ color: glow, emissive: glow,
    emissiveIntensity: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(glow.getHex()), color: glow,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  core.scale.setScalar(1.8);
  core.position.y = 0.2;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STRANDS * SEGS * 6), 3));
  const tent = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: glow, transparent: true,
    opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  tent.frustumCulled = false;
  g.add(bell, core, tent);
  return { group: g, bell, tent, kind: 'jelly' };
}

function whale(rng, glow, body, res) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: body, roughness: 0.8, emissive: glow, emissiveIntensity: 0.12 });
  const torso = new THREE.Mesh(res.ball, skin);
  torso.scale.set(0.45, 0.35, 1.3);
  const finL = new THREE.Mesh(res.ball, skin), finR = new THREE.Mesh(res.ball, skin), tail = new THREE.Mesh(res.ball, skin);
  finL.scale.set(0.9, 0.04, 0.3); finL.position.set(-0.55, -0.05, -0.1);
  finR.scale.copy(finL.scale); finR.position.set(0.55, -0.05, -0.1);
  tail.scale.set(0.6, 0.04, 0.22); tail.position.set(0, 0, 1.35);
  const spots = new THREE.SpriteMaterial({ map: glowTexture(glow.getHex()), color: glow,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  g.add(torso, finL, finR, tail);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(spots);
    s.position.set((i % 2 ? 1 : -1) * 0.36, 0.05, -0.8 + i * 0.3);
    s.scale.setScalar(0.35);
    g.add(s);
  }
  return { group: g, finL, finR, tail, kind: 'whale' };
}

// One tentacle vertex: strand s at fraction d of its length, swaying over time t.
function strandPoint(arr, o, s, d, t) {
  const a = (s / STRANDS) * Math.PI * 2, r = 0.6 * (1 - d * 0.5);
  const sway = Math.sin(t * 1.6 - d * 4 + s) * 0.25 * d;
  arr[o] = Math.cos(a) * r + sway;
  arr[o + 1] = -d * 3.2;
  arr[o + 2] = Math.sin(a) * r + sway * 0.6;
  return o + 3;
}

export class GasCreatures {
  constructor(scene, pal) {
    const rng = new Rng(hash32(pal.seed, 0xbe57));
    this.res = { bell: new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      ball: new THREE.SphereGeometry(1, 20, 14) };
    this.group = new THREE.Group();
    scene.add(this.group);
    this.list = [];
    for (let i = 0; i < 6; i++) this.add(rng, pal, i);
  }

  add(rng, pal, i) {
    const hue = rng.pick(HUES);
    const glow = new THREE.Color().setHSL(hue, 0.8, 0.6);
    const isWhale = i % 3 === 2;
    const body = pal.mean.clone().lerp(new THREE.Color(0x404858), 0.5);
    const c = isWhale ? whale(rng, glow, body, this.res) : jelly(rng, glow, this.res);
    c.size = isWhale ? rng.range(120, 200) : rng.range(45, 110);
    c.group.scale.setScalar(c.size);
    c.base = new THREE.Vector3(rng.range(-0.5, 0.5) * SPAN, LEVELS[i % LEVELS.length] + rng.range(-120, 120),
      rng.range(-0.5, 0.5) * SPAN);
    c.vel = new THREE.Vector3(rng.range(-6, 6), 0, rng.range(-6, 6));
    c.phase = rng.next() * 10;
    c.group.rotation.y = Math.atan2(-c.vel.x, -c.vel.z);
    this.group.add(c.group);
    this.list.push(c);
  }

  update(time, cam) {
    for (const c of this.list) {
      const g = c.group, t = time + c.phase;
      const x = c.base.x + c.vel.x * time - cam.x, z = c.base.z + c.vel.z * time - cam.z;
      g.position.set(cam.x + x - SPAN * Math.round(x / SPAN), c.base.y + Math.sin(t * 0.3) * 25,
        cam.z + z - SPAN * Math.round(z / SPAN));
      if (c.kind === 'jelly') this.pulse(c, t);
      else this.swim(c, t);
    }
  }

  pulse(c, t) {
    const p = Math.sin(t * 1.3);
    c.bell.scale.set(1 + p * 0.08, 0.8 - p * 0.12, 1 + p * 0.08);
    const arr = c.tent.geometry.attributes.position.array;
    let o = 0;
    for (let s = 0; s < STRANDS; s++) {
      for (let k = 0; k < SEGS; k++) {
        o = strandPoint(arr, o, s, k / SEGS, t);
        o = strandPoint(arr, o, s, (k + 1) / SEGS, t);
      }
    }
    c.tent.geometry.attributes.position.needsUpdate = true;
  }

  swim(c, t) {
    const f = Math.sin(t * 0.9) * 0.35;
    c.finL.rotation.z = f;
    c.finR.rotation.z = -f;
    c.tail.rotation.x = Math.sin(t * 0.9 + 1) * 0.3;
    c.group.rotation.x = Math.sin(t * 0.3) * 0.05;
  }

  dispose() {
    const mats = new Set();
    this.group.traverse((o) => { if (o.material) mats.add(o.material); if (o.isLineSegments) o.geometry.dispose(); });
    for (const m of mats) m.dispose();
    this.res.bell.dispose();
    this.res.ball.dispose();
    this.group.removeFromParent();
  }
}
