// Submarine effects: the sonar ping (an expanding shell plus glowing rings that mark every
// creature it finds for a few seconds) and the bubble trail behind the propeller.
import * as THREE from 'three';
import { glowTexture } from '../assets/textures.js';

const RANGE = 120, SWEEP = 1.6, MARK_TIME = 5, MARKS = 64, COOLDOWN = 3, TRAIL = 80;

function ringTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,1)';
  g.lineWidth = 4;
  g.shadowColor = 'white';
  g.shadowBlur = 5;
  g.beginPath();
  g.arc(32, 32, 21, 0, Math.PI * 2);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Targets from any mix of sources: DeepSea-style sonarTargets(), Wildlife (groups) or bodies().
function collect(sources, origin) {
  const out = [], seen = new Set();
  const push = (name, position, radius, count) => {
    if (seen.has(position) || position.distanceTo(origin) > RANGE) return;
    seen.add(position);
    out.push({ name, position, radius, count });
  };
  const visit = (s) => {
    if (!s) return;
    if (s.sonarTargets) { for (const t of s.sonarTargets()) push(t.name, t.position, t.radius, t.count); return; }
    if (s.groups) { s.groups.forEach(visit); return; }
    for (const b of s.bodies?.() ?? []) push(b.ref?.name ?? b.ref?.sp?.name ?? 'Makhluk', b.root.position, b.radius, 1);
  };
  sources.forEach(visit);
  return out;
}

export class Sonar {
  constructor(scene) {
    this.scene = scene;
    this.cool = 0;
    this.age = SWEEP;
    this.ringTex = ringTexture();
    this.shellGeo = new THREE.SphereGeometry(1, 32, 16);
    this.shellMat = new THREE.MeshBasicMaterial({ color: 0x5affd8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.BackSide, fog: false, wireframe: true });
    this.shell = new THREE.Mesh(this.shellGeo, this.shellMat);
    this.shell.visible = false;
    this.marks = Array.from({ length: MARKS }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.ringTex, color: 0x5affd8, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
      s.visible = false;
      s.renderOrder = 10;
      scene.add(s);
      return { s, target: null, age: MARK_TIME };
    });
    scene.add(this.shell);
  }

  // Sends a ping from origin. Returns null while cooling down, else { total, counts, text }.
  ping(origin, sources) {
    if (this.cool > 0) return null;
    this.cool = COOLDOWN;
    this.age = 0;
    this.shell.position.copy(origin);
    const found = collect(sources, origin).sort((a, b) => a.position.distanceTo(origin) - b.position.distanceTo(origin));
    const counts = {};
    let total = 0;
    found.forEach((t, i) => {
      counts[t.name] = (counts[t.name] ?? 0) + t.count;
      total += t.count;
      const m = this.marks[i];
      if (!m) return;
      Object.assign(m, { target: t, age: -t.position.distanceTo(origin) / RANGE * SWEEP });
      m.s.material.color.set(t.count > 1 ? 0x5affd8 : 0xffd24a);
    });
    for (let i = found.length; i < MARKS; i++) this.marks[i].target = null;
    return { total, counts, text: this.describe(total, counts) };
  }

  describe(total, counts) {
    if (!total) return 'Sonar: tidak ada makhluk di sekitar';
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, c]) => `${n} ${c}`);
    return `Sonar: ${total} makhluk terdeteksi — ${top.join(', ')}`;
  }

  update(dt, origin) {
    this.cool -= dt;
    this.age += dt;
    const k = Math.min(1, this.age / SWEEP);
    this.shell.visible = k < 1;
    if (this.shell.visible) {
      this.shell.position.copy(origin);
      this.shell.scale.setScalar(2 + k * RANGE);
      this.shellMat.opacity = 0.35 * (1 - k);
    }
    for (const m of this.marks) this.updateMark(m, dt);
  }

  updateMark(m, dt) {
    m.age += dt;
    const on = Boolean(m.target) && m.age >= 0 && m.age < MARK_TIME;
    m.s.visible = on;
    if (!on) return;
    m.s.position.copy(m.target.position);
    const pop = Math.min(1, m.age * 4), size = THREE.MathUtils.clamp(m.target.radius * 1.3, 1.6, 7);
    m.s.scale.setScalar(size * (0.6 + 0.4 * pop) * (1 + Math.sin(m.age * 6) * 0.06));
    m.s.material.opacity = Math.min(1, (MARK_TIME - m.age) / 1.2) * pop * 0.85;
  }

  dispose() {
    this.scene.remove(this.shell);
    for (const m of this.marks) { this.scene.remove(m.s); m.s.material.dispose(); }
    [this.ringTex, this.shellGeo, this.shellMat].forEach((d) => d.dispose());
  }
}

// Bubbles streaming from the propeller while the submarine moves underwater.
export class BubbleTrail {
  constructor(scene, waterY) {
    Object.assign(this, { scene, waterY, next: 0, spawn: 0 });
    this.pos = new Float32Array(TRAIL * 3).fill(-1e5);
    this.life = new Float32Array(TRAIL);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.PointsMaterial({ color: 0xcfe6f5, size: 0.13, map: glowTexture(0xcfe6f5), transparent: true,
      opacity: 0.5, depthWrite: false });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  // from: propeller position; rate: bubbles per second.
  update(dt, from, rate) {
    this.spawn += rate * dt;
    while (this.spawn >= 1) {
      this.spawn -= 1;
      const i = this.next = (this.next + 1) % TRAIL;
      this.pos.set([from.x + (Math.random() - 0.5) * 0.4, from.y + (Math.random() - 0.5) * 0.4, from.z + (Math.random() - 0.5) * 0.4], i * 3);
      this.life[i] = 2 + Math.random();
    }
    for (let i = 0; i < TRAIL; i++) {
      if ((this.life[i] -= dt) <= 0 || this.pos[i * 3 + 1] > this.waterY - 0.1) { this.pos[i * 3 + 1] = -1e5; continue; }
      this.pos[i * 3 + 1] += dt * 1.6;
      this.pos[i * 3] += Math.sin(this.life[i] * 9 + i) * dt * 0.3;
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.geo.dispose();
    this.mat.dispose();
  }
}
