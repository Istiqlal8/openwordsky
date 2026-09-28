// One sentinel drone: primitive model + hover/patrol/chase motion.
import * as THREE from 'three';

const HP = 4;
const CALM_SPEED = 5, CHASE_SPEED = 13;
const _to = new THREE.Vector3();

// Shared geometry + materials for every drone on the planet.
export function droneKit() {
  const glow = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  const halo = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  return {
    body: new THREE.SphereGeometry(0.7, 16, 12),
    band: new THREE.TorusGeometry(0.72, 0.07, 6, 20),
    eye: new THREE.SphereGeometry(0.2, 10, 8).translate(0, 0, 0.62),
    halo: new THREE.SphereGeometry(0.42, 10, 8).translate(0, 0, 0.6),
    fin: new THREE.BoxGeometry(0.08, 0.5, 0.7),
    metal: new THREE.MeshStandardMaterial({ color: 0xb4bcc8, metalness: 0.35, roughness: 0.4 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a2f38, metalness: 0.6, roughness: 0.5 }),
    eyeCalm: glow(0xffb030), eyeHostile: glow(0xff2020),
    haloCalm: halo(0xffa020), haloHostile: halo(0xff2a1a),
  };
}

export function disposeKit(kit) {
  for (const v of Object.values(kit)) v.dispose();
}

export class Drone {
  constructor(kit, pos) {
    this.kit = kit;
    this.group = this.build(kit);
    this.group.position.copy(pos);
    this.anchor = new THREE.Vector3().copy(pos);
    this.angle = Math.random() * Math.PI * 2;
    this.radius = 8 + Math.random() * 10;
    this.bobT = Math.random() * 10;
    this.fireT = 1.5 + Math.random() * 2;
    this.hp = HP;
    this.hostile = false;
    this.leaving = false;
    this.flash = 0;
  }

  build(kit) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(kit.body, kit.metal));
    const band = new THREE.Mesh(kit.band, kit.dark);
    band.rotation.x = Math.PI / 2;
    this.eye = new THREE.Mesh(kit.eye, kit.eyeCalm);
    this.halo = new THREE.Mesh(kit.halo, kit.haloCalm);
    g.add(band, this.eye, this.halo);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      const fin = new THREE.Mesh(kit.fin, kit.dark);
      fin.position.set(Math.cos(a) * 0.72, Math.sin(a) * 0.72, -0.35);
      fin.rotation.z = a - Math.PI / 2;
      g.add(fin);
    }
    return g;
  }

  setHostile(on) {
    if (on === this.hostile) return;
    this.hostile = on;
    this.eye.material = on ? this.kit.eyeHostile : this.kit.eyeCalm;
    this.halo.material = on ? this.kit.haloHostile : this.kit.haloCalm;
  }

  // floorAt(x, z) -> ground height; player = camera position.
  update(dt, player, floorAt) {
    this.bobT += dt;
    this.angle += dt * (this.hostile ? 0.45 : 0.22);
    if (this.leaving) _to.copy(this.group.position).setY(this.group.position.y + 40);
    else this.target(player, floorAt);
    this.moveTo(_to, dt);
    this.face(player);
    this.flash = Math.max(0, this.flash - dt * 4);
    this.halo.scale.setScalar(1 + this.flash * 1.5 + Math.sin(this.bobT * 6) * 0.08);
  }

  target(player, floorAt) {
    const g = this.group.position;
    if (!this.hostile && g.distanceToSquared(player) > 70 * 70) this.anchor.copy(player);
    const c = this.hostile ? player : this.anchor, r = this.hostile ? 13 : this.radius;
    const x = c.x + Math.cos(this.angle) * r, z = c.z + Math.sin(this.angle) * r;
    const alt = this.hostile ? 4 : 6;
    _to.set(x, floorAt(x, z) + alt + Math.sin(this.bobT * 1.7) * 0.4, z);
  }

  moveTo(to, dt) {
    const p = this.group.position;
    const speed = this.hostile || this.leaving ? CHASE_SPEED : CALM_SPEED;
    const d = _to.subVectors(to, p).length();
    if (d > 1e-3) p.addScaledVector(_to, Math.min(1, (speed * dt) / d));
  }

  face(player) {
    if (this.hostile) this.group.lookAt(player);
    else this.group.rotation.y += 0.01;
  }

  // Returns true when this hit destroyed the drone.
  hit() {
    this.hp--;
    this.flash = 1;
    return this.hp <= 0;
  }
}
