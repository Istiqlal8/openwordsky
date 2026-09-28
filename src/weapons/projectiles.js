// Pooled glowing projectiles (plasma bolts, ice shards, grenades) with swept collision.
import * as THREE from 'three';

const POOL = 40;
const GRAVITY = 16;
const _ray = new THREE.Ray(), _prev = new THREE.Vector3(), _dir = new THREE.Vector3();
const _look = new THREE.Vector3();

function glowMat(opacity) {
  return new THREE.MeshBasicMaterial({ transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false });
}

export class Projectiles {
  // hits: WeaponHits; onImpact(shot, hitRecord | null, point) handles damage/fx per kind.
  constructor(ctx, hits, onImpact) {
    Object.assign(this, { ctx, hits, onImpact });
    this.group = new THREE.Group();
    this.geo = new THREE.SphereGeometry(1, 10, 8);
    this.items = [];
    for (let i = 0; i < POOL; i++) this.items.push(this.make());
    ctx.surface.scene.add(this.group);
  }

  make() {
    const core = new THREE.Mesh(this.geo, glowMat(1));
    const halo = new THREE.Mesh(this.geo, glowMat(0.35));
    halo.scale.setScalar(2.4);
    core.add(halo);
    core.visible = false;
    core.frustumCulled = halo.frustumCulled = false;
    this.group.add(core);
    return { mesh: core, halo, active: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      life: 0, spec: null, gravity: false, trailT: 0 };
  }

  // spec: catalog weapon; kind: 'bolt' | 'ice' | 'grenade'.
  spawn(from, dir, spec, kind) {
    const p = this.items.find((it) => !it.active) ?? this.items[0];
    p.active = true;
    p.kind = kind;
    p.spec = spec;
    p.gravity = kind === 'grenade';
    p.pos.copy(from);
    p.vel.copy(dir).multiplyScalar(spec.speed);
    if (p.gravity) p.vel.y += 6;
    p.life = kind === 'grenade' ? 3 : spec.range / spec.speed;
    p.mesh.material.color.set(kind === 'ice' ? 0xeaffff : spec.color);
    p.halo.material.color.set(spec.color);
    const r = kind === 'grenade' ? 0.14 : 0.07;
    p.mesh.scale.set(r, r, kind === 'grenade' ? r : r * 5);
    p.mesh.position.copy(from);
    p.mesh.visible = true;
    return p;
  }

  update(dt) {
    for (const p of this.items) if (p.active) this.step(p, dt);
  }

  step(p, dt) {
    _prev.copy(p.pos);
    if (p.gravity) p.vel.y -= GRAVITY * dt;
    p.pos.addScaledVector(p.vel, dt);
    p.life -= dt;
    const len = _dir.subVectors(p.pos, _prev).length();
    if (len > 1e-4) {
      _ray.set(_prev, _dir.divideScalar(len));
      const hit = this.hits.cast(_ray, len, false);
      if (hit.type !== 'none') return this.end(p, hit, hit.point);
    }
    if (p.life <= 0) return this.end(p, null, p.pos);
    p.mesh.position.copy(p.pos);
    p.mesh.lookAt(_look.copy(p.pos).add(p.vel));
    this.trail(p, dt);
  }

  trail(p, dt) {
    p.trailT -= dt;
    if (p.trailT > 0) return;
    p.trailT = p.kind === 'grenade' ? 0.03 : 0.05;
    if (p.kind === 'grenade') this.ctx.fx?.puff(p.pos, 0x9aa890, 0.5, 0.6);
    else this.ctx.fx?.sparks(p.pos, p.spec.color, 1, 0.3);
  }

  end(p, hit, point) {
    p.active = false;
    p.mesh.visible = false;
    this.onImpact(p, hit, point);
  }

  clear() {
    for (const p of this.items) { p.active = false; p.mesh.visible = false; }
  }

  dispose() {
    for (const p of this.items) { p.mesh.material.dispose(); p.halo.material.dispose(); }
    this.geo.dispose();
    this.group.removeFromParent();
  }
}
