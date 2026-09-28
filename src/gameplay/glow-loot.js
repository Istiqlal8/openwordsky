// Temporary glowing collectibles (night flowers, storm crystals, meteor shards, bloom pollen).
// One instanced core + one instanced additive halo per loot kind. Walk into an item to take it.
import * as THREE from 'three';

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
const _c = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);

export class GlowLoot {
  // opts: { geometry, max, reach, glow (halo radius), onCollect(item) }
  constructor(ctx, { geometry, max = 40, reach = 2.3, glow = 0.8, onCollect = null }) {
    this.ctx = ctx;
    this.max = max;
    this.reach = reach;
    this.onCollect = onCollect;
    this.items = [];
    this.t = 0;
    this.core = this.instanced(geometry, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.tex = glowTexture();
    const haloMat = new THREE.MeshBasicMaterial({ map: this.tex, color: 0xffffff, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false });
    this.halo = this.instanced(new THREE.PlaneGeometry(glow * 3, glow * 3), haloMat); // camera-facing billboards
  }

  instanced(geo, mat) {
    const mesh = new THREE.InstancedMesh(geo, mat, this.max);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.max * 3).fill(1), 3);
    mesh.count = 0;
    mesh.frustumCulled = false;
    this.ctx.surface.scene.add(mesh);
    return mesh;
  }

  get count() { return this.items.length; }

  // Places an item on dry ground; -> item or null (full / underwater).
  add(x, z, name, color, n = 1) {
    const { surface, planet } = this.ctx, t = planet.terrain;
    if (this.items.length >= this.max) return null;
    const y = surface.floorAt(x, z);
    if (t.hasWater && y < t.waterY + 0.2 && planet.biome?.id !== 'ocean') return null;
    const it = { x, y, z, name, color, n, phase: Math.random() * 6 };
    this.items.push(it);
    this.paint();
    return it;
  }

  // Drops items farther than `dist` from the player.
  prune(dist) {
    const f = this.ctx.surface.feet, before = this.items.length;
    this.items = this.items.filter((it) => Math.hypot(it.x - f.x, it.z - f.z) <= dist);
    if (this.items.length !== before) this.paint();
  }

  clear() {
    if (!this.items.length) return;
    this.items = [];
    this.paint();
  }

  paint() {
    this.items.forEach((it, i) => {
      _c.setHex(it.color);
      this.core.setColorAt(i, _c);
      this.halo.setColorAt(i, _c);
    });
    for (const m of [this.core, this.halo]) {
      m.count = this.items.length;
      m.instanceColor.needsUpdate = true;
    }
  }

  // Bob, spin and pulse; collect what the player (on foot) touches.
  update(dt, alive = true) {
    if (!this.items.length) return;
    this.t += dt;
    const cam = this.ctx.surface.camera.quaternion;
    this.items.forEach((it, i) => {
      const y = it.y + 0.6 + Math.sin(this.t * 2 + it.phase) * 0.12, k = 1 + Math.sin(this.t * 3 + it.phase) * 0.15;
      _q.setFromAxisAngle(UP, this.t * 1.2 + it.phase);
      this.core.setMatrixAt(i, _m.compose(_p.set(it.x, y, it.z), _q, _s.set(1, 1, 1)));
      this.halo.setMatrixAt(i, _m.compose(_p, cam, _s.set(k, k, k)));
    });
    this.core.instanceMatrix.needsUpdate = true;
    this.halo.instanceMatrix.needsUpdate = true;
    const s = this.ctx.surface;
    if (!alive || s.flying) return;
    const f = s.feet;
    const hit = this.items.find((it) => Math.hypot(it.x - f.x, it.z - f.z) < this.reach && Math.abs(it.y - f.y) < 3);
    if (hit) this.collect(hit);
  }

  collect(it) {
    const { player, sfx, fx } = this.ctx;
    this.items = this.items.filter((x) => x !== it);
    this.paint();
    player.addItem(it.name, it.n);
    player.emit('act', { type: 'pickup', item: it.name, n: 1 });
    sfx?.pickup?.();
    fx?.sparks(_p.set(it.x, it.y + 0.6, it.z), it.color, 12);
    this.onCollect?.(it);
  }

  dispose() {
    for (const m of [this.core, this.halo]) {
      m.parent?.remove(m);
      m.geometry.dispose();
      m.material.dispose();
      m.dispose();
    }
    this.tex.dispose();
    this.items = [];
  }
}

// Random dry spot on a ring around (cx, cz); -> { x, z }.
export function ringSpot(cx, cz, rMin, rMax) {
  const a = Math.random() * Math.PI * 2, r = rMin + Math.random() * (rMax - rMin);
  return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r };
}

// Soft round glow (white; tinted per instance / material color).
export function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,0.95)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.4)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
