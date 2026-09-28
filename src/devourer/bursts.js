// Pooled explosion / debris sprites for the devourer battle. Deliberately separate from
// FxSystem: adding a second FxSystem to the space scene would add PointLights and force a
// shader recompile of every material in the system.
import * as THREE from 'three';
import { SpritePool } from '../fx/particles.js';
import { glowTexture } from '../assets/textures.js';
import { puffTexture } from '../fx/fx-textures.js';

const rand = (a, b) => a + Math.random() * (b - a);

function randomDir(out) {
  const u = Math.random() * 2 - 1;
  const th = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return out.set(Math.cos(th) * s, u, Math.sin(th) * s);
}

const tmpD = new THREE.Vector3();
const tmpP = new THREE.Vector3();

export class Bursts {
  constructor(parent, { fire = 90, smoke = 36 } = {}) {
    this.glow = new SpritePool(parent, fire, true);
    this.smoke = new SpritePool(parent, smoke, false);
    this.tex = { fire: glowTexture(0xffb070), white: glowTexture(0xffffff), puff: puffTexture() };
  }

  // size is in space units: 6 for a fighter, 90 for a capital ship section.
  blast(pos, color = 0xff8844, size = 6) {
    this.glow.spawn(pos, this.tex.white, 0xffffff, 0.18, size * 0.6, size * 3.4, 1);
    const n = Math.min(10, 3 + Math.round(size * 0.12));
    for (let i = 0; i < n; i++) {
      randomDir(tmpD);
      tmpP.copy(pos).addScaledVector(tmpD, rand(0, 0.6) * size);
      const it = this.glow.spawn(tmpP, this.tex.fire, color, rand(0.4, 1.1), size * 0.5, size * rand(1.4, 2.4), 0.95);
      it.vel.copy(tmpD).multiplyScalar(rand(0.4, 1.6) * size);
      it.drag = 0.2;
      it.fade = 1.4;
    }
    for (let i = 0; i < Math.min(5, 1 + Math.round(size * 0.05)); i++) {
      randomDir(tmpD);
      tmpP.copy(pos).addScaledVector(tmpD, rand(0.4, 1.4) * size);
      const it = this.smoke.spawn(tmpP, this.tex.puff, 0x36322e, rand(1.4, 2.6), size * 0.6, size * rand(2, 3.2), 0.4);
      it.vel.copy(tmpD).multiplyScalar(rand(0.3, 1) * size);
      it.drag = 0.4;
    }
  }

  // A short-lived flare, used for hull fires and beam impacts.
  flare(pos, color, size, life = 0.5) {
    this.glow.spawn(pos, this.tex.fire, color, life, size * 0.5, size * 1.6, 0.85);
  }

  update(dt) {
    this.glow.update(dt);
    this.smoke.update(dt);
  }

  dispose() {
    this.glow.dispose();
    this.smoke.dispose();
  }
}
