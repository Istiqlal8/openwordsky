// Weapon shop 3D preview: its own small renderer with a slowly turning weapon on a lit stage.
import * as THREE from 'three';
import { buildWeapon } from '../../weapons/weapon-models.js';

const SPIN = 0.7;

export class StorePreview {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.domElement.className = 'wstore-canvas';
    container.prepend(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x1a1e26, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(2, 3, 2);
    const rim = new THREE.DirectionalLight(0xffb040, 1.5);
    rim.position.set(-3, 1, -2);
    this.pivot = new THREE.Group();
    this.scene.add(key, rim, this.pivot);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    this.camera.position.set(0, 0.35, 1.75);
    this.camera.lookAt(0, 0, 0);
    this.model = null;
  }

  show(id) {
    this.model?.dispose();
    this.model = buildWeapon(id, false);
    const g = this.model.group;
    g.scale.setScalar(1.6);
    g.position.set(0, 0, 0.3 * 1.6); // centre the barrel over the pivot
    this.pivot.add(g);
  }

  fit() {
    const w = this.container.clientWidth || 360, h = this.container.clientHeight || 220;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  frame(dt) {
    const c = this.renderer.domElement;
    if (c.width !== Math.round((this.container.clientWidth || 360) * this.renderer.getPixelRatio())) this.fit();
    this.pivot.rotation.y += dt * SPIN;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.model?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.model = null;
  }
}
