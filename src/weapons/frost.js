// Ice rifle freeze: pins frozen drones/creatures in place inside a pooled ice shell and
// stalls sentinel fire. Call update() after sentinels move (creatures move later in the frame).
import * as THREE from 'three';

const SHELLS = 8;

export class Frost {
  constructor(scene) {
    this.geo = new THREE.IcosahedronGeometry(1, 0);
    this.mat = new THREE.MeshStandardMaterial({ color: 0xbff4ff, emissive: 0x3aa8d8, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.1, flatShading: true, depthWrite: false });
    this.group = new THREE.Group();
    this.slots = [];
    for (let i = 0; i < SHELLS; i++) {
      const mesh = new THREE.Mesh(this.geo, this.mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.slots.push({ mesh, key: null, t: 0, pin: null, hold: new THREE.Vector3(), root: null, drone: null, lift: 0 });
    }
    scene.add(this.group);
  }

  // hit: WeaponHits record of type 'drone' or 'creature'.
  freeze(hit, seconds) {
    const drone = hit.type === 'drone' ? hit.target : null;
    const body = hit.type === 'creature' ? hit.target.body : null;
    if (!drone && !body) return;
    const key = drone ?? body.ref;
    const s = this.slots.find((x) => x.key === key) ?? this.slots.find((x) => !x.key) ?? this.slots[0];
    const root = drone ? drone.group : body.root;
    const pin = drone ? drone.group.position : (body.ref.pos?.isVector3 ? body.ref.pos : root.position);
    if (s.key !== key) s.hold.copy(pin);
    Object.assign(s, { key, t: seconds, pin, root, drone, lift: drone ? 0 : body.radius * 0.8 });
    s.mesh.scale.setScalar(drone ? 1.25 : body.radius * 1.25);
    s.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    s.mesh.visible = true;
  }

  update(dt) {
    for (const s of this.slots) if (s.key) this.hold(s, dt);
  }

  hold(s, dt) {
    s.t -= dt;
    if (s.t <= 0 || !s.root.parent || !s.root.visible) return this.release(s);
    s.pin.copy(s.hold);
    if (s.drone) s.drone.fireT = Math.max(s.drone.fireT, s.t);
    s.mesh.position.copy(s.root.position).y += s.lift;
    this.mat.opacity = 0.35 + Math.min(0.2, s.t * 0.2);
  }

  release(s) {
    s.key = s.pin = s.root = s.drone = null;
    s.mesh.visible = false;
  }

  clear() { this.slots.forEach((s) => this.release(s)); }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
    this.group.removeFromParent();
  }
}
