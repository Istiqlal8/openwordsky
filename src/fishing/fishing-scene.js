// World addon: the visible part of fishing on a planet surface (rod, line, bobber, ripples).
// The meta addon (fishing-addon.js) drives it through fishHub.scene; this side only draws.
import * as THREE from 'three';
import { fishHub } from './hub.js';

const SEG = 16;                       // line points
const UP = new THREE.Vector3(0, 1, 0);
const _hand = new THREE.Vector3(), _tip = new THREE.Vector3(), _dir = new THREE.Vector3();
const _a = new THREE.Vector3(), _b = new THREE.Vector3();

export class FishingScene {
  constructor(ctx) {
    this.ctx = ctx;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.035, 1, 5).translate(0, 0.5, 0),
      new THREE.MeshLambertMaterial({ color: 0x6a4a2a }));
    this.line = new THREE.Line(new THREE.BufferGeometry().setAttribute('position',
      new THREE.BufferAttribute(new Float32Array(SEG * 3), 3)), new THREE.LineBasicMaterial({ color: 0xf0f0f0 }));
    this.line.frustumCulled = false;
    this.bobber = makeBobber();
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.4, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    this.group.add(this.rod, this.line, this.bobber, this.ring);
    ctx.surface.scene.add(this.group);
    this.spot = new THREE.Vector3();
    this.state = 'idle';
    this.t = 0;
    fishHub.scene = this;
  }

  get surface() { return this.ctx.surface; }
  get night() { return (this.ctx.surface.sky?.nightFactor ?? 0) > 0.6; }
  get storm() { return Boolean(this.ctx.gameplay?.storm); }

  // state: 'cast' | 'wait' | 'bite' | 'reel' | 'idle'
  show(state, spot) {
    if (spot) this.spot.set(spot.x, spot.y, spot.z);
    if (state !== this.state) this.t = 0;
    this.state = state;
    this.group.visible = state !== 'idle';
  }

  update(dt) {
    if (!this.group.visible || !this.ctx.surface.planet) return;
    this.t += dt;
    this.placeRod();
    this.placeBobber();
    this.placeLine();
    this.placeRing();
  }

  placeRod() {
    const s = this.ctx.surface;
    s.muzzle(_hand);
    _dir.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw)).multiplyScalar(1.5).add(UP.clone().multiplyScalar(this.state === 'reel' ? 1.3 : 1.0));
    _tip.copy(_hand).add(_dir);
    this.rod.position.copy(_hand);
    this.rod.quaternion.setFromUnitVectors(UP, _dir.clone().normalize());
    this.rod.scale.set(1, _dir.length(), 1);
  }

  placeBobber() {
    const b = this.bobber.position;
    if (this.state === 'cast') {
      const k = Math.min(1, this.t / 0.7);
      b.lerpVectors(_tip, this.spot, k);
      b.y += Math.sin(k * Math.PI) * 3;
      return;
    }
    b.copy(this.spot);
    const bite = this.state === 'bite', reel = this.state === 'reel';
    b.y += bite ? -0.25 + Math.sin(this.t * 40) * 0.08 : reel ? -0.12 + Math.sin(this.t * 17) * 0.06 : Math.sin(this.t * 2.4) * 0.05;
    if (reel) { b.x += Math.sin(this.t * 3.1) * 0.4; b.z += Math.cos(this.t * 2.3) * 0.4; }
  }

  // A sagging line from rod tip to bobber; tight while reeling.
  placeLine() {
    const pos = this.line.geometry.attributes.position, sag = this.state === 'reel' || this.state === 'bite' ? 0.1 : 0.9;
    _a.copy(_tip);
    _b.copy(this.bobber.position);
    for (let i = 0; i < SEG; i++) {
      const k = i / (SEG - 1);
      pos.setXYZ(i, _a.x + (_b.x - _a.x) * k, _a.y + (_b.y - _a.y) * k - Math.sin(k * Math.PI) * sag, _a.z + (_b.z - _a.z) * k);
    }
    pos.needsUpdate = true;
  }

  placeRing() {
    const on = this.state !== 'cast', period = this.state === 'bite' ? 0.35 : 1.6, k = (this.t % period) / period;
    this.ring.position.set(this.bobber.position.x, this.spot.y + 0.03, this.bobber.position.z);
    this.ring.scale.setScalar(1 + k * (this.state === 'bite' ? 3 : 2));
    this.ring.material.opacity = on ? (1 - k) * 0.6 : 0;
  }

  dispose() {
    if (fishHub.scene === this) fishHub.scene = null;
    this.ctx.surface.scene.remove(this.group);
    this.group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  }
}

function makeBobber() {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xff3a2a }));
  const low = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff }));
  g.add(top, low);
  return g;
}
