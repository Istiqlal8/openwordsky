// Hangar overlay: browse procedural ship designs in a rotating 3D preview and pick one.
import * as THREE from 'three';
import { el } from './dom.js';
import { shipDesign, candidateSeeds } from '../view/ship/ship-design.js';
import { buildShip } from '../view/ship/ship-model.js';

const STATS = [['speed', 'Kecepatan'], ['agility', 'Kelincahan'], ['shield', 'Perisai'], ['damage', 'Daya Tembak']];
const SPIN = 0.45;

function buildStage() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x1a1e26, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(6, 9, 7);
  const rim = new THREE.DirectionalLight(0xffb040, 1.6);
  rim.position.set(-7, 3, -8);
  scene.add(key, rim);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 0.3, 48),
    new THREE.MeshStandardMaterial({ color: 0x141a22, metalness: 0.6, roughness: 0.6 }));
  pad.position.y = -0.15;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6.05, 0.05, 6, 96), new THREE.MeshBasicMaterial({ color: 0xffb040 }));
  ring.rotation.x = Math.PI / 2;
  const pivot = new THREE.Group();
  scene.add(pad, ring, pivot);
  return { scene, pivot, props: [pad, ring] };
}

export class Hangar {
  constructor() {
    this.root = null;
    this.renderer = null;
    this.onKey = (e) => this.handleKey(e);
  }

  get isOpen() { return Boolean(this.root); }

  open({ current = 1, onPick, onClose } = {}) {
    if (this.isOpen) this.close();
    this.cbs = { onPick, onClose };
    this.designs = candidateSeeds(current).map((s) => shipDesign(s));
    this.index = 0;
    this.buildDom();
    this.initRenderer();
    this.show(0);
    addEventListener('keydown', this.onKey);
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  buildDom() {
    const root = el('div', 'hangar');
    const panel = el('div', 'hangar-panel panel');
    this.stage = el('div', 'hangar-stage');
    const prev = el('button', 'btn btn-icon hangar-prev', '‹');
    const next = el('button', 'btn btn-icon hangar-next', '›');
    prev.onclick = () => this.step(-1);
    next.onclick = () => this.step(1);
    this.stage.append(prev, next);
    panel.append(el('div', 'panel-label', 'Hangar'), this.stage, this.buildInfo());
    root.append(panel);
    document.body.append(root);
    this.root = root;
  }

  buildInfo() {
    const info = el('div', 'hangar-info');
    this.clsEl = el('div', 'hangar-class');
    this.nameEl = el('div', 'hangar-name');
    this.countEl = el('div', 'hangar-count');
    const bars = el('div', 'hangar-stats');
    this.bars = {};
    for (const [key, label] of STATS) {
      const fill = el('div', 'hangar-fill');
      const track = el('div', 'hangar-track');
      track.append(fill);
      bars.append(el('span', 'hangar-stat', label), track);
      this.bars[key] = fill;
    }
    const pick = el('button', 'btn btn-primary', 'Pilih');
    const close = el('button', 'btn', 'Tutup');
    pick.onclick = () => this.pick();
    close.onclick = () => this.close();
    const actions = el('div', 'hangar-actions');
    actions.append(pick, close);
    info.append(this.clsEl, this.nameEl, this.countEl, bars, actions);
    return info;
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.domElement.className = 'hangar-canvas';
    this.stage.prepend(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    this.world = buildStage();
    this.fit();
  }

  fit() {
    const w = this.stage.clientWidth || 640, h = this.stage.clientHeight || 400;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  show(i) {
    const n = this.designs.length;
    this.index = ((i % n) + n) % n;
    const d = this.designs[this.index];
    this.model?.dispose();
    this.world.pivot.clear();
    this.model = buildShip(d);
    this.model.setThrust(0.35);
    this.model.group.position.y = this.model.groundOffset;
    this.world.pivot.add(this.model.group);
    const L = d.parts.length;
    this.camera.position.set(0, L * 0.42 + 1.4, L * 1.45 + 2);
    this.camera.lookAt(0, 1.1, 0);
    this.updateInfo(d);
  }

  updateInfo(d) {
    this.clsEl.textContent = d.label;
    this.nameEl.textContent = d.name;
    this.countEl.textContent = `${this.index + 1} / ${this.designs.length}`;
    for (const [key] of STATS) {
      const pct = Math.max(0.05, Math.min(1, (d.stats[key] - 0.6) / 0.8));
      this.bars[key].style.width = `${Math.round(pct * 100)}%`;
    }
  }

  step(dir) { this.show(this.index + dir); }

  pick() {
    const design = this.designs[this.index];
    this.cbs.onPick?.(design);
    this.close();
  }

  handleKey(e) {
    const actions = { ArrowLeft: () => this.step(-1), ArrowRight: () => this.step(1),
      Escape: () => this.close(), Enter: () => this.pick() };
    const act = actions[e.code];
    if (!act) return;
    e.preventDefault();
    act();
  }

  frame(now) {
    if (!this.isOpen) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const c = this.renderer.domElement;
    if (c.width !== Math.round(this.stage.clientWidth * this.renderer.getPixelRatio())) this.fit();
    this.world.pivot.rotation.y += dt * SPIN;
    this.renderer.render(this.world.scene, this.camera);
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  close() {
    if (!this.isOpen) return;
    cancelAnimationFrame(this.raf);
    removeEventListener('keydown', this.onKey);
    this.model?.dispose();
    for (const m of this.world.props) { m.geometry.dispose(); m.material.dispose(); }
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.root.remove();
    this.root = this.renderer = this.model = this.world = null;
    this.cbs.onClose?.();
  }
}
