// Lightning inside the clouds: a small pool of bolts (jagged line + flash glow + point light).
// Strikes get more frequent with depth and inside storms; thunder arrives later as shake.
import * as THREE from 'three';
import { glowTexture } from '../../assets/textures.js';

const POOL = 3, PTS = 16, LIFE = 0.32, SOUND = 340;
const HIT_RANGE = 90;
const rand = (a, b) => a + Math.random() * (b - a);

function buildBolt(parent, tint) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PTS * 3), 3));
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xf2f4ff, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(tint), color: tint, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const light = new THREE.PointLight(tint, 0, 2200, 1);
  for (const o of [line, glow, light]) { o.visible = o === light; parent.add(o); }
  line.frustumCulled = false;
  return { line, glow, light, age: LIFE, power: 0, pos: new THREE.Vector3() };
}

export class GasLightning {
  constructor(scene, tint) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.bolts = Array.from({ length: POOL }, () => buildBolt(this.group, tint));
    this.timer = 2;
    this.thunder = []; // pending { at, amount }
    this.clock = 0;
    this.flash = { pos: new THREE.Vector3(0, -1e6, 0), color: new THREE.Color(), range: 600, level: 0 };
    this.tint = new THREE.Color(tint).lerp(new THREE.Color(0xffffff), 0.5);
    this.events = { shake: 0, hit: false };
    this._storm = new THREE.Vector3();
  }

  // env: { cam, alt, depth, storm, clouds, time }. Returns pooled { shake, hit } for this frame.
  update(dt, env) {
    this.clock += dt;
    this.events.shake = 0;
    this.events.hit = false;
    const rate = env.alt > 150 ? 0.05 : 0.18 + env.depth * 0.9 + env.storm * 2.5;
    this.timer -= dt * rate;
    if (this.timer <= 0) { this.timer = rand(0.6, 2.6); this.strike(env); }
    this.animate(dt);
    this.rumble();
    return this.events;
  }

  // Pick a spot in the clouds near the camera (often towards the nearest storm) and fire.
  strike(env) {
    const b = this.bolts.reduce((a, c) => (c.age > a.age ? c : a));
    const near = Math.random() < 0.05 + env.depth * 0.08 + env.storm * 0.2;
    const dist = near ? rand(20, HIT_RANGE) : rand(250, 2400);
    const ang = Math.random() * Math.PI * 2;
    b.pos.set(env.cam.x + Math.cos(ang) * dist, env.cam.y + rand(-250, 150), env.cam.z + Math.sin(ang) * dist);
    if (!near && env.storm < 0.3 && env.clouds.nearestStorm(env.cam, env.time, this._storm) < 5000 && Math.random() < 0.5) {
      b.pos.set(this._storm.x + rand(-400, 400), rand(-2200, 300), this._storm.z + rand(-400, 400));
    }
    b.age = 0;
    b.power = near ? 1 : THREE.MathUtils.clamp(1400 / (dist + 400), 0.25, 1);
    this.shapeBolt(b);
    const d = b.pos.distanceTo(env.cam);
    this.thunder.push({ at: this.clock + Math.min(3, d / SOUND), amount: THREE.MathUtils.clamp(260 / (d + 60), 0.15, 2.5) });
    if (d < HIT_RANGE) this.events.hit = true;
  }

  // A jagged vertical path from above the strike point down through it.
  shapeBolt(b) {
    const arr = b.line.geometry.attributes.position.array;
    const top = b.pos.y + rand(200, 350), bottom = b.pos.y - rand(250, 450);
    let x = b.pos.x, z = b.pos.z;
    for (let i = 0; i < PTS; i++) {
      const t = i / (PTS - 1);
      arr[i * 3] = x; arr[i * 3 + 1] = top + (bottom - top) * t; arr[i * 3 + 2] = z;
      x += rand(-40, 40); z += rand(-40, 40);
    }
    b.line.geometry.attributes.position.needsUpdate = true;
    b.glow.position.copy(b.pos);
    b.glow.scale.setScalar(rand(500, 900));
    b.light.position.copy(b.pos);
  }

  // Flicker, fade, and publish the brightest active bolt for the cloud shaders.
  animate(dt) {
    let best = null, bestK = 0;
    for (const b of this.bolts) {
      b.age += dt;
      const live = b.age < LIFE;
      const k = live ? (1 - b.age / LIFE) * (Math.sin(b.age * 90) > -0.3 ? 1 : 0.25) * b.power : 0;
      b.line.visible = live && b.age < LIFE * 0.6;
      b.glow.visible = live;
      b.line.material.opacity = k;
      b.glow.material.opacity = k * 0.9;
      b.light.intensity = k * 40;
      if (live && k >= bestK) { best = b; bestK = k; }
    }
    const f = this.flash;
    f.level = best ? bestK : Math.max(0, f.level - dt * 4);
    if (best) f.pos.copy(best.pos);
    f.color.copy(this.tint).multiplyScalar(f.level * 2.2);
  }

  rumble() {
    for (let i = this.thunder.length - 1; i >= 0; i--) {
      if (this.thunder[i].at > this.clock) continue;
      this.events.shake += this.thunder[i].amount;
      this.thunder.splice(i, 1);
    }
  }

  dispose() {
    for (const b of this.bolts) {
      b.line.geometry.dispose();
      b.line.material.dispose();
      b.glow.material.dispose();
    }
    this.group.removeFromParent();
  }
}
