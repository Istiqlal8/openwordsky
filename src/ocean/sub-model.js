// Procedural mini-submarine (forward -Z, like the cameras): rounded yellow hull, a big glass
// bubble with a little pilot, conning tower, dive planes, rudder, a shrouded spinning
// propeller, headlights (real SpotLights + additive light cones) and blinking ballast lights.
// The SpotLights live in a separate rig that stays in the scene, so toggling them never
// changes the scene's light count (no shader recompiles).
import * as THREE from 'three';
import { fadeTexture } from './ocean-kit.js';

const LAMPS = [-0.55, 0.55];

export class SubModel {
  constructor(scene) {
    this.scene = scene;
    this.own = [];
    this.group = new THREE.Group();
    this.group.rotation.order = 'YXZ';
    this.rig = new THREE.Group();
    this.rig.rotation.order = 'YXZ';
    this.buildHull();
    this.buildPropulsion();
    this.buildLights();
    scene.add(this.group, this.rig);
    this.t = 0;
    this.lightsOn = false;
  }

  m(material) { this.own.push(material); return material; }
  g(geometry) { this.own.push(geometry); return geometry; }
  add(parent, geo, mat, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(this.g(geo), mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  buildHull() {
    const paint = this.m(new THREE.MeshStandardMaterial({ color: 0xffc629, roughness: 0.35, metalness: 0.25, emissive: 0x3a2a00, emissiveIntensity: 0.6 }));
    const trim = this.m(new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.4, metalness: 0.6 }));
    const glass = this.m(new THREE.MeshStandardMaterial({ color: 0x9fdcff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.32, depthWrite: false }));
    this.paint = paint;
    this.add(this.group, new THREE.CapsuleGeometry(0.9, 1.9, 8, 18).rotateX(Math.PI / 2), paint);
    this.add(this.group, new THREE.TorusGeometry(0.9, 0.07, 8, 24), trim, 0, 0, -0.95);
    this.add(this.group, new THREE.TorusGeometry(0.91, 0.05, 8, 24), trim, 0, 0, 0.6);
    this.add(this.group, new THREE.SphereGeometry(0.82, 24, 16), glass, 0, 0.08, -1.45).renderOrder = 2;
    this.add(this.group, new THREE.SphereGeometry(0.26, 12, 10), this.m(new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.3 })), 0, 0.12, -1.45);
    this.add(this.group, new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 0.7, 1), trim, 0, 0.14, -1.62);
    this.add(this.group, new THREE.CapsuleGeometry(0.34, 0.6, 6, 12).rotateX(Math.PI / 2), paint, 0, 0.85, 0.15);
    this.add(this.group, new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6), trim, 0.12, 1.3, 0.3);
    this.add(this.group, new THREE.BoxGeometry(0.08, 0.08, 0.2), trim, 0.12, 1.56, 0.22);
    this.fins = [-1, 1].map((s) => {
      const p = new THREE.Group();
      p.position.set(s * 0.85, -0.05, 0.2);
      this.add(p, new THREE.BoxGeometry(0.8, 0.06, 0.55), paint, s * 0.35, 0, 0);
      this.group.add(p);
      return p;
    });
  }

  buildPropulsion() {
    const trim = this.m(new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.4, metalness: 0.6 }));
    const fin = this.m(new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.4 }));
    this.rudder = new THREE.Group();
    this.rudder.position.set(0, 0, 1.75);
    this.add(this.rudder, new THREE.BoxGeometry(0.06, 1.3, 0.45), fin, 0, 0.1, 0.1);
    this.add(this.rudder, new THREE.BoxGeometry(1.3, 0.06, 0.4), fin, 0, 0, 0.1);
    this.group.add(this.rudder);
    this.add(this.group, new THREE.TorusGeometry(0.55, 0.07, 8, 24), trim, 0, 0, 2.25);
    this.prop = new THREE.Group();
    this.prop.position.set(0, 0, 2.25);
    this.add(this.prop, new THREE.ConeGeometry(0.14, 0.3, 10).rotateX(Math.PI / 2), trim);
    for (let i = 0; i < 4; i++) {
      const b = this.add(this.prop, new THREE.BoxGeometry(0.16, 0.44, 0.03), fin, 0, 0, 0);
      b.geometry.translate(0, 0.24, 0);
      b.rotation.set(0, 0.5, (i / 4) * Math.PI * 2, 'ZYX');
    }
    this.group.add(this.prop);
  }

  buildLights() {
    const lampOff = new THREE.Color(0x444433), lampOn = new THREE.Color(0xfff6d0);
    this.lampMat = this.m(new THREE.MeshBasicMaterial({ color: lampOff }));
    this.lampColors = { off: lampOff, on: lampOn };
    this.fade = fadeTexture();
    this.own.push(this.fade);
    const coneMat = this.m(new THREE.MeshBasicMaterial({ color: 0xfff0c8, alphaMap: this.fade, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const coneGeo = this.g(new THREE.ConeGeometry(3.4, 16, 20, 1, true).translate(0, -8, 0).rotateX(Math.PI / 2));
    this.cones = [];
    this.spots = LAMPS.map((x) => {
      this.add(this.group, new THREE.CylinderGeometry(0.13, 0.16, 0.18, 12).rotateX(Math.PI / 2), this.lampMat, x, -0.42, -1.3);
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(x, -0.42, -1.4);
      cone.visible = false;
      this.group.add(cone);
      this.cones.push(cone);
      const spot = new THREE.SpotLight(0xfff2d8, 0, 55, 0.45, 0.6, 1.2);
      spot.position.set(x, -0.42, -1.5);
      spot.target.position.set(x * 3, -2.5, -20);
      this.rig.add(spot, spot.target);
      return spot;
    });
    this.blinkers = [[-0.95, 0xff2a2a], [0.95, 0x2aff5a], [0, 0xffffff]].map(([x, c]) => {
      const mat = this.m(new THREE.MeshBasicMaterial({ color: c }));
      return this.add(this.group, new THREE.SphereGeometry(0.07, 8, 6), mat, x, x ? 0.1 : 1.02, x ? 0.4 : 0.35);
    });
  }

  setLights(on) {
    this.lightsOn = on;
    this.lampMat.color.copy(on ? this.lampColors.on : this.lampColors.off);
    for (const c of this.cones) c.visible = on && this.group.visible;
  }

  // thrust: -1..1 (propeller), dive: -1..1 (planes), turn: -1..1 (rudder), power: lights on/off.
  animate(dt, thrust, dive, turn) {
    this.t += dt;
    this.prop.rotation.z += dt * (2 + thrust * 26);
    for (const f of this.fins) f.rotation.x += (dive * 0.45 - f.rotation.x) * Math.min(1, dt * 4);
    this.rudder.rotation.y += (turn * 0.5 - this.rudder.rotation.y) * Math.min(1, dt * 4);
    this.blinkers.forEach((b, i) => { b.visible = Math.sin(this.t * 3 + i * 2.1) > (i === 2 ? 0.85 : -0.2); });
    this.rig.position.copy(this.group.position);
    this.rig.rotation.copy(this.group.rotation);
    const on = this.lightsOn && this.group.visible;
    for (const s of this.spots) s.intensity = on ? 260 : 0;
  }

  dispose() {
    this.scene.remove(this.group, this.rig);
    this.spots.forEach((s) => s.dispose());
    this.own.forEach((d) => d.dispose());
  }
}
