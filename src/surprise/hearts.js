// Small pool of floating heart sprites for pet moments.
import * as THREE from 'three';

const N = 10;

function heartTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ff5c8a';
  g.beginPath();
  g.moveTo(32, 56);
  g.bezierCurveTo(4, 36, 6, 10, 22, 10);
  g.bezierCurveTo(28, 10, 32, 16, 32, 20);
  g.bezierCurveTo(32, 16, 36, 10, 42, 10);
  g.bezierCurveTo(58, 10, 60, 36, 32, 56);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Hearts {
  constructor(scene) {
    this.scene = scene;
    this.tex = heartTexture();
    this.items = [];
    for (let i = 0; i < N; i++) {
      const mat = new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, fog: false });
      const s = new THREE.Sprite(mat);
      s.visible = false;
      scene.add(s);
      this.items.push({ s, life: 0, vx: 0, vz: 0 });
    }
  }

  burst(pos, lift = 1) {
    for (const it of this.items) {
      it.life = 1.2 + Math.random() * 0.8;
      it.vx = (Math.random() - 0.5) * 1.6;
      it.vz = (Math.random() - 0.5) * 1.6;
      it.s.position.set(pos.x, pos.y + lift + Math.random() * 0.6, pos.z);
      it.s.visible = true;
    }
  }

  update(dt) {
    for (const it of this.items) {
      if (it.life <= 0) continue;
      it.life -= dt;
      const p = it.s.position;
      p.x += it.vx * dt;
      p.z += it.vz * dt;
      p.y += 1.3 * dt;
      it.s.scale.setScalar(0.6 + Math.sin(it.life * 9) * 0.08);
      it.s.material.opacity = Math.min(1, it.life);
      if (it.life <= 0) it.s.visible = false;
    }
  }

  dispose() {
    for (const it of this.items) {
      this.scene.remove(it.s);
      it.s.material.dispose();
    }
    this.tex.dispose();
    this.items = [];
  }
}
