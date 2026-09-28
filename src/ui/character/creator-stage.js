// Character preview: own small renderer, lit pad, drag to rotate, wheel or pinch to zoom, idle spin.
import * as THREE from 'three';
import { Avatar } from '../../character/avatar.js';

const IDLE_SPIN = 0.5;       // rad/s when nobody is dragging
const IDLE_DELAY = 2500;     // ms after the last drag before the spin resumes
const PITCH = [-0.4, 1.1];
const ZOOM = [0.5, 2];
const WALK = 2.2;            // preview walk speed, so the limbs move
const FEET = new THREE.Vector3(0, 0, 0);

function buildWorld() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x1a1e26, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 6, -5);
  const rim = new THREE.DirectionalLight(0xffb040, 1.4);
  rim.position.set(-4, 3, 5);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 0.1, 48),
    new THREE.MeshStandardMaterial({ color: 0x141a22, metalness: 0.6, roughness: 0.6 }));
  pad.position.y = -0.06;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.018, 6, 96), new THREE.MeshBasicMaterial({ color: 0xffb040 }));
  ring.rotation.x = Math.PI / 2;
  const pivot = new THREE.Group();
  scene.add(key, rim, pad, ring, pivot);
  return { scene, pivot, props: [pad, ring] };
}

export class CreatorStage {
  constructor(host) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.domElement.className = 'cc-canvas';
    host.prepend(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.05, 100);
    this.world = buildWorld();
    this.orbit = { yaw: 0, pitch: 0.16, zoom: 1, idleAt: 0 };
    this.pointers = new Map();
    this.casual = true;
    this.height = 1.8;
    this.bindInput(this.renderer.domElement);
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  // Rebuild the previewed character (the old avatar is disposed).
  setLook(look) {
    this.avatar?.dispose();
    this.world.pivot.clear();
    this.avatar = new Avatar(look);
    this.avatar.setCasual(this.casual);
    this.height = this.avatar.height;
    this.world.pivot.add(this.avatar.group);
  }

  setCasual(on) {
    this.casual = Boolean(on);
    this.avatar?.setCasual(this.casual);
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
    const w = this.host.clientWidth || 480, h = this.host.clientHeight || 360;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  placeCamera() {
    const o = this.orbit, narrow = Math.max(1, 1.5 / this.camera.aspect);
    const d = this.height * 2.15 * o.zoom * narrow;
    const cy = this.height * 0.52;
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
    this.avatar?.update(dt, FEET, Math.PI, WALK, true);
    this.placeCamera();
    this.renderer.render(this.world.scene, this.camera);
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.avatar?.dispose();
    for (const m of this.world.props) { m.geometry.dispose(); m.material.dispose(); }
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.renderer = this.avatar = this.world = null;
  }
}
