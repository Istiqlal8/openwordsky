// Shipyard 3D preview: own renderer, lit pad, orbit by drag, zoom by wheel or pinch, idle auto-spin.
import * as THREE from 'three';
import { buildShip } from '../../view/ship/ship-model.js';

const IDLE_SPIN = 0.35;      // rad/s when nobody is dragging
const IDLE_DELAY = 2500;     // ms after the last drag before auto-spin resumes
const PITCH = [-0.15, 1.35];
const ZOOM = [0.45, 2.2];

function buildWorld() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x1a1e26, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(6, 9, 7);
  const rim = new THREE.DirectionalLight(0xffb040, 1.6);
  rim.position.set(-7, 3, -8);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.6, 0.3, 64),
    new THREE.MeshStandardMaterial({ color: 0x141a22, metalness: 0.6, roughness: 0.6 }));
  pad.position.y = -0.15;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(8.05, 0.05, 6, 128), new THREE.MeshBasicMaterial({ color: 0xffb040 }));
  ring.rotation.x = Math.PI / 2;
  const grid = new THREE.PolarGridHelper(7.6, 12, 5, 64, 0x2a3f55, 0x1c2a3a);
  grid.position.y = 0.01;
  const pivot = new THREE.Group();
  scene.add(key, rim, pad, ring, grid, pivot);
  return { scene, pivot, props: [pad, ring, grid] };
}

export class ShipyardStage {
  constructor(host) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.domElement.className = 'sy-canvas';
    host.prepend(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 300);
    this.world = buildWorld();
    this.orbit = { yaw: 0.7, pitch: 0.32, zoom: 1, radius: 8, idleAt: 0 };
    this.pointers = new Map();
    this.bindInput(this.renderer.domElement);
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  // Replace the previewed ship (old model is disposed).
  setDesign(design) {
    this.model?.dispose();
    this.world.pivot.clear();
    this.model = buildShip(design);
    this.model.setThrust(0.4);
    this.model.group.position.y = this.model.groundOffset;
    this.world.pivot.add(this.model.group);
    const p = design.parts, span = p.wings?.pairs ? p.wings.span * 2 + p.width : p.width;
    const booms = p.booms ? p.width + 2 : 0, pods = p.nacelles ? p.nacelles.x * 2 : 0;
    this.orbit.radius = Math.max(p.length + 1, span, booms, pods) * 0.62 + 1;
  }

  bindInput(canvas) {
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    });
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    const up = (e) => this.pointers.delete(e.pointerId);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.zoomBy(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
  }

  onMove(e) {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    const o = this.orbit;
    if (this.pointers.size >= 2) {
      const other = [...this.pointers.entries()].find(([id]) => id !== e.pointerId)[1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (before > 0 && after > 0) this.zoomBy(before / after);
    } else {
      o.yaw -= (e.clientX - prev.x) * 0.008;
      o.pitch = THREE.MathUtils.clamp(o.pitch + (e.clientY - prev.y) * 0.006, ...PITCH);
    }
    o.idleAt = performance.now() + IDLE_DELAY;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  zoomBy(f) {
    this.orbit.zoom = THREE.MathUtils.clamp(this.orbit.zoom * f, ...ZOOM);
  }

  fit() {
    const w = this.host.clientWidth || 640, h = this.host.clientHeight || 400;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  placeCamera() {
    const o = this.orbit, narrow = Math.max(1, 1.4 / this.camera.aspect); // keep the span in view on portrait screens
    const d = (o.radius / Math.tan(THREE.MathUtils.degToRad(17))) * 0.62 * o.zoom * narrow;
    const cy = this.model ? this.model.groundOffset * 0.6 : 1;
    this.camera.position.set(Math.sin(o.yaw) * Math.cos(o.pitch) * d, cy + Math.sin(o.pitch) * d, Math.cos(o.yaw) * Math.cos(o.pitch) * d);
    this.camera.lookAt(0, cy, 0);
  }

  frame(now) {
    if (!this.renderer) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const c = this.renderer.domElement;
    if (c.width !== Math.round(this.host.clientWidth * this.renderer.getPixelRatio())) this.fit();
    if (!this.pointers.size && now > this.orbit.idleAt) this.orbit.yaw += dt * IDLE_SPIN;
    this.placeCamera();
    this.renderer.render(this.world.scene, this.camera);
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.model?.dispose();
    for (const m of this.world.props) { m.geometry.dispose(); m.material.dispose(); }
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.renderer = this.model = this.world = null;
  }
}
