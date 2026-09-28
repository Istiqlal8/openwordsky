// Muzzle work for the mech guns: flash cones with a bloom sprite, the bazooka backblast and the
// gatling's spent casings. Pooled and allocation-free per frame; lives in whatever scene root the
// caller hands it (the space combat root, or the planet scene).
import * as THREE from 'three';
import { glowTexture } from '../assets/textures.js';

const FLASHES = 12;
const CASINGS = 72;
const FWD = new THREE.Vector3(0, 0, -1);
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _s = new THREE.Vector3();

function flashItem(parent, geo, tex) {
  const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false });
  const cone = new THREE.Mesh(geo, mat);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const g = new THREE.Group();
  g.add(cone, sprite);
  g.visible = false;
  g.frustumCulled = false;
  parent.add(g);
  return { g, cone, mat, sprite, age: 0, life: 1, s0: 1, s1: 1 };
}

export class MuzzleFx {
  constructor(parent) {
    this.parent = parent;
    this.geo = new THREE.ConeGeometry(0.5, 1, 8, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -0.5);
    this.tex = glowTexture(0xffffff);
    this.items = [];
    for (let i = 0; i < FLASHES; i++) this.items.push(flashItem(parent, this.geo, this.tex));
    this.next = 0;
    this.casings = buildCasings(parent);
  }

  take() {
    const it = this.items[this.next];
    this.next = (this.next + 1) % FLASHES;
    return it;
  }

  // Bright cone out of the barrel. `size` is the flash radius in world units.
  flash(pos, dir, size, color, life = 0.11) {
    const it = this.take();
    it.g.position.copy(pos);
    it.g.quaternion.setFromUnitVectors(FWD, _v.copy(dir).normalize());
    it.mat.color.set(color);
    it.mat.opacity = 1;
    it.sprite.material.color.set(color);
    it.sprite.material.opacity = 0.9;
    it.s0 = size * 0.6;
    it.s1 = size * 1.5;
    it.age = 0;
    it.life = life;
    it.g.visible = true;
    this.apply(it, 0);
  }

  // Backblast: a long, dim cone thrown out of the rear venturi.
  blast(pos, dir, size, color) {
    this.flash(pos, dir, size * 0.85, color, 0.22);
    const it = this.items[(this.next + FLASHES - 1) % FLASHES];
    it.mat.opacity = 0.55;
    it.sprite.material.opacity = 0.35;
  }

  apply(it, t) {
    const k = it.s0 + (it.s1 - it.s0) * t;
    it.cone.scale.set(k, k, k * 2.8);
    it.sprite.scale.setScalar(k * 2.8);
    const fade = 1 - t;
    it.mat.opacity = fade * fade;
    it.sprite.material.opacity = fade * 0.8;
  }

  // One spent shell tumbling out of the ejection port.
  casing(pos, dir, size, gravity) {
    const c = this.casings;
    const it = c.items[c.next];
    c.next = (c.next + 1) % CASINGS;
    it.alive = true;
    it.pos.copy(pos);
    it.vel.copy(dir).multiplyScalar(size * (6 + Math.random() * 5));
    it.vel.y += size * 3;
    it.axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    it.rot.setFromAxisAngle(it.axis, Math.random() * 6.28);
    it.spin = 8 + Math.random() * 14;
    it.size = size * 0.5;
    it.g = gravity;
    it.age = 0;
    it.life = 1.4;
  }

  update(dt) {
    for (const it of this.items) {
      if (!it.g.visible) continue;
      it.age += dt;
      if (it.age >= it.life) { it.g.visible = false; continue; }
      this.apply(it, it.age / it.life);
    }
    this.stepCasings(dt);
  }

  stepCasings(dt) {
    const c = this.casings;
    let n = 0;
    for (const it of c.items) {
      if (!it.alive) continue;
      it.age += dt;
      if (it.age >= it.life) { it.alive = false; continue; }
      it.vel.y -= it.g * dt;
      it.pos.addScaledVector(it.vel, dt);
      it.rot.multiply(_q.setFromAxisAngle(it.axis, it.spin * dt));
      const k = it.size * (it.age > it.life * 0.7 ? (1 - it.age / it.life) * 3.3 : 1);
      c.mesh.setMatrixAt(n++, _m.compose(it.pos, it.rot, _s.set(k, k, k * 2.4)));
    }
    if (n === 0 && c.mesh.count === 0) return;
    c.mesh.count = n;
    c.mesh.instanceMatrix.needsUpdate = true;
  }

  clear() {
    for (const it of this.items) it.g.visible = false;
    for (const it of this.casings.items) it.alive = false;
    this.casings.mesh.count = 0;
  }

  dispose() {
    for (const it of this.items) {
      it.g.removeFromParent();
      it.mat.dispose();
      it.sprite.material.dispose();
    }
    this.geo.dispose();
    const c = this.casings;
    c.mesh.removeFromParent();
    c.mesh.geometry.dispose();
    c.mesh.material.dispose();
    c.mesh.dispose();
  }
}

function buildCasings(parent) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8a85a, metalness: 0.8, roughness: 0.35,
    emissive: 0x321800, flatShading: true });
  const mesh = new THREE.InstancedMesh(geo, mat, CASINGS);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  parent.add(mesh);
  const items = [];
  for (let i = 0; i < CASINGS; i++) {
    items.push({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      rot: new THREE.Quaternion(), axis: new THREE.Vector3(1, 0, 0), spin: 0, size: 1, g: 0, age: 0, life: 1 });
  }
  return { mesh, items, next: 0 };
}
