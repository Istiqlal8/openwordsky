// First-person weapon viewmodel: follows the camera bottom-right with sway, walk bob, recoil,
// muzzle flash, lower/raise switching and heat glow. Also drives the third-person hand model.
import * as THREE from 'three';
import { buildWeapon } from './weapon-models.js';
import { HandModel } from './hand-model.js';
import { glowTexture } from '../assets/textures.js';
import { overlayFlags } from './model-kit.js';

const REST = new THREE.Vector3(0.15, -0.15, -0.3);
const SCALE = 0.62; // viewmodel size relative to the world model
const SWITCH_TIME = 0.16; // seconds to lower (and again to raise)
const HOT = new THREE.Color(0xff4a18);
const _c = new THREE.Color();

function overlayMat(color) {
  return overlayFlags(new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true }));
}

// Invisible marker drawn just before the viewmodel (renderOrder 999, transparent list = after the
// whole world): it clears the depth buffer so the weapon never clips into walls yet still self-occludes.
function buildDepthClear() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -1, 0.001, 0, -1, 0, 0.001, -1], 3));
  const mat = new THREE.MeshBasicMaterial({ transparent: true, colorWrite: false, depthTest: false, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 999;
  mesh.frustumCulled = false;
  mesh.onBeforeRender = (renderer) => renderer.clearDepth();
  return mesh;
}

// Suit sleeve + glove reaching back to the bottom-right corner.
function buildArm() {
  const mat = overlayMat(0xe9e4d8), glove = overlayMat(0x2a2f38);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 10).rotateX(Math.PI / 2), mat);
  sleeve.position.set(0.03, -0.2, 0.28);
  sleeve.rotation.set(0.5, -0.12, 0);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.09), glove);
  hand.position.set(0, -0.06, 0.06);
  const g = new THREE.Group();
  g.add(sleeve, hand);
  g.traverse((o) => { o.renderOrder = 1000; o.frustumCulled = false; });
  return { group: g, mats: [mat, glove] };
}

function buildFlash() {
  const mat = new THREE.MeshBasicMaterial({ map: glowTexture(0xffffff), transparent: true, depthTest: false,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
  const geo = new THREE.PlaneGeometry(0.22, 0.22);
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.set(i === 1 ? Math.PI / 2 : 0, i === 2 ? Math.PI / 2 : 0, i * 0.8);
    m.renderOrder = 1010;
    m.frustumCulled = false;
    g.add(m);
  }
  g.visible = false;
  return { group: g, mat, geo };
}

export class ViewModel {
  constructor(surface) {
    this.surface = surface;
    this.root = new THREE.Group();
    this.holder = new THREE.Group();
    this.arm = buildArm();
    this.flash = buildFlash();
    this.clearer = buildDepthClear();
    this.root.add(this.clearer);
    this.holder.add(this.arm.group);
    this.holder.scale.setScalar(SCALE);
    this.root.add(this.holder);
    surface.scene.add(this.root);
    this.hand = new HandModel(surface);
    Object.assign(this, { model: null, pending: null, lower: 0, kick: 0, flashT: 0, t: 0, bobT: 0, sx: 0, sy: 0 });
  }

  get ready() { return !this.pending && this.lower === 0; }
  get firstPerson() { return !this.surface.thirdPerson; }

  setWeapon(id) {
    if (!this.model) return this.swap(id);
    if (id !== (this.pending ?? this.model.id)) this.pending = id;
  }

  swap(id) {
    this.flash.group.removeFromParent(); // shared flash outlives each model
    this.model?.dispose();
    this.model = buildWeapon(id, true);
    this.holder.add(this.model.group);
    this.model.muzzle.add(this.flash.group);
    this.hand.setWeapon(id);
    this.pending = null;
  }

  // Recoil kick + muzzle flash; strength ~0.3 (pistol) .. 1.5 (railgun).
  fire(strength = 1, color = 0xffffff) {
    this.kick = Math.min(1.6, this.kick + strength);
    this.flashT = 0.05 + 0.03 * strength;
    this.flash.mat.color.set(color);
    this.flash.group.scale.setScalar(0.7 + strength * 0.5);
    this.flash.group.rotation.z = Math.random() * Math.PI;
  }

  update(dt, input, { heat = 0, charge = 0, aiming = false, hidden = false }) {
    this.t += dt;
    this.stepSwitch(dt);
    this.kick = Math.max(0, this.kick - dt * 6 * (0.3 + this.kick));
    this.flashT -= dt;
    this.flash.group.visible = this.flashT > 0;
    this.glow(heat, charge);
    this.hand.update(dt, aiming && !hidden);
    this.root.visible = this.firstPerson && !hidden;
    if (this.root.visible) this.pose(dt, input);
  }

  stepSwitch(dt) {
    if (this.pending) {
      this.lower = Math.min(1, this.lower + dt / SWITCH_TIME);
      if (this.lower >= 1) this.swap(this.pending);
    } else {
      this.lower = Math.max(0, this.lower - dt / SWITCH_TIME);
    }
  }

  // Heat shifts the glow parts towards hot orange; charge brightens them.
  glow(heat, charge) {
    if (!this.model) return;
    _c.copy(this.model.glowColor).lerp(HOT, Math.min(1, heat * 1.1));
    for (const m of [this.model.mats.glow, this.hand.model?.mats.glow]) {
      if (!m) continue;
      m.emissive.copy(_c);
      m.color.copy(_c);
      m.emissiveIntensity = 1.2 + heat * 1.5 + charge * 3 + Math.sin(this.t * 30) * charge * 0.8;
    }
  }

  pose(dt, input) {
    const s = this.surface, cam = s.camera, k = Math.min(1, dt * 10);
    this.root.position.copy(cam.position);
    this.root.quaternion.copy(cam.quaternion);
    this.sx += (THREE.MathUtils.clamp(-(input.mouse?.dx ?? 0) * 0.0005, -0.04, 0.04) - this.sx) * k;
    this.sy += (THREE.MathUtils.clamp((input.mouse?.dy ?? 0) * 0.0005, -0.04, 0.04) - this.sy) * k;
    const moving = s.moveSpeed > 0 && s.onGround;
    this.bobT = moving ? this.bobT + dt * s.moveSpeed * 0.55 : this.bobT * 0.9;
    const amp = moving ? Math.min(1.6, s.moveSpeed / 7) : 0;
    const breathe = Math.sin(this.t * 1.6) * 0.004;
    const h = this.holder, e = this.lower * this.lower;
    h.position.set(REST.x + this.sx + Math.sin(this.bobT) * 0.012 * amp,
      REST.y + this.sy + breathe - Math.abs(Math.cos(this.bobT)) * 0.012 * amp - e * 0.28,
      REST.z + this.kick * 0.035);
    h.rotation.set(this.kick * 0.14 - e * 0.7 + this.sy * 2, 0.1 + this.sx * 3, this.sx * 2 - e * 0.3);
    this.root.updateMatrixWorld(true);
  }

  // Barrel tip in world space: the viewmodel in first person, the hand model otherwise.
  muzzleWorld(out) {
    const m = this.firstPerson ? this.model?.muzzle : this.hand.muzzle;
    if (!m) return null;
    return m.getWorldPosition(out);
  }

  dispose() {
    this.flash.group.removeFromParent();
    this.model?.dispose();
    this.hand.dispose();
    this.flash.geo.dispose();
    this.flash.mat.dispose();
    this.clearer.geometry.dispose();
    this.clearer.material.dispose();
    this.arm.group.traverse((o) => o.geometry?.dispose());
    this.arm.mats.forEach((m) => m.dispose());
    this.root.removeFromParent();
    this.model = null;
  }
}
