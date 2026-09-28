// Shared 3D preview for the freighter shop and the DIY yard: its own renderer and canvas,
// orbit by drag, zoom by wheel or pinch, idle auto-spin. dispose() frees everything.
import * as THREE from 'three';
import { disposeTree } from '../freighter/kit.js';
import { buildSpecFreighter } from './spec-model.js';

const IDLE_SPIN = 0.22;      // rad/s once nobody is dragging
const IDLE_DELAY = 2200;     // ms after the last drag before auto-spin resumes
const PITCH = [-0.5, 1.2];
const ZOOM = [0.55, 2.4];
const FOV = 32;

function buildWorld() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x0a0e16, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(5, 7, 6);
  const rim = new THREE.DirectionalLight(0x7fc0ff, 1.5);
  rim.position.set(-7, 2, -6);
  const fill = new THREE.DirectionalLight(0xffb070, 0.9);
  fill.position.set(2, -5, -4);
  const pivot = new THREE.Group();
  scene.add(key, rim, fill, pivot);
  return { scene, pivot };
}

export class FleetStage {
  constructor(host) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.domElement.className = 'fl-canvas';
    host.prepend(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 1, 6000);
    this.world = buildWorld();
    this.orbit = { yaw: 1.05, pitch: 0.28, zoom: 1, idleAt: 0 };
    this.extent = null;
    this.pointers = new Map();
    this.model = null;
    this.bindInput(this.renderer.domElement);
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  // Replace the previewed capital ship (the old model is disposed) and frame it.
  setSpec(spec) {
    this.clearModel();
    this.model = buildSpecFreighter(spec);
    const g = this.model.group;
    g.scale.setScalar(this.model.size);
    this.world.pivot.add(g);
    const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    g.position.set(-c.x, -c.y, -c.z);        // orbit around the hull's real centre
    this.extent = { y: size.y, xz: Math.hypot(size.x, size.z) };  // worst case at any yaw
    return this.model;
  }

  clearModel() {
    if (!this.model) return;
    disposeTree(this.model.group);
    for (const m of Object.values(this.model.mats)) m.dispose?.();
    this.model = null;
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
    if (this.pointers.size >= 2) this.pinch(e, prev);
    else {
      o.yaw -= (e.clientX - prev.x) * 0.008;
      o.pitch = THREE.MathUtils.clamp(o.pitch + (e.clientY - prev.y) * 0.006, ...PITCH);
    }
    o.idleAt = performance.now() + IDLE_DELAY;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  pinch(e, prev) {
    const other = [...this.pointers.entries()].find(([id]) => id !== e.pointerId)?.[1];
    if (!other) return;
    const before = Math.hypot(prev.x - other.x, prev.y - other.y);
    const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
    if (before > 0 && after > 0) this.zoomBy(before / after);
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

  // Distance that keeps the whole hull inside the frame on both axes, times the zoom.
  placeCamera() {
    const o = this.orbit, e = this.extent ?? { y: 200, xz: 200 };
    const half = Math.max(e.y / 2, e.xz / (2 * Math.max(0.5, this.camera.aspect)));
    const d = (half / Math.tan(THREE.MathUtils.degToRad(FOV / 2))) * 1.05 * o.zoom;
    this.camera.position.set(Math.sin(o.yaw) * Math.cos(o.pitch) * d, Math.sin(o.pitch) * d, Math.cos(o.yaw) * Math.cos(o.pitch) * d);
    this.camera.lookAt(0, 0, 0);
  }

  frame(now) {
    if (!this.renderer) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const c = this.renderer.domElement;
    if (c.width !== Math.round(this.host.clientWidth * this.renderer.getPixelRatio())) this.fit();
    if (!this.pointers.size && now > this.orbit.idleAt) this.orbit.yaw += dt * IDLE_SPIN;
    for (const s of this.model?.spinners ?? []) s.obj.rotation[s.axis] += s.speed * dt;
    this.placeCamera();
    this.renderer.render(this.world.scene, this.camera);
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.clearModel();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.renderer = this.world = null;
  }
}
