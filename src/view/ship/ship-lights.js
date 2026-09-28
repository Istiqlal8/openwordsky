// Navigation and landing lights for the player's ship, used at night on a planet.
import * as THREE from 'three';
import { glowTexture } from '../../assets/textures.js';

const BEAM_RANGE = 90;

function blinker(color, x, y, z) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(color), color, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  s.position.set(x, y, z);
  s.scale.setScalar(0.9);
  return s;
}

// Adds lights to a ship model group; `size` is the hull length.
export class ShipLights {
  constructor(group, size = 8) {
    this.group = new THREE.Group();
    const w = size * 0.28;
    this.blinks = [blinker(0xff3b30, -w, 0.1, 0), blinker(0x35d07f, w, 0.1, 0), blinker(0xffffff, 0, 0.35, size * 0.2)];
    this.headlights = [-0.35, 0.35].map((x) => {
      const spot = new THREE.SpotLight(0xfff4d8, 0, BEAM_RANGE, 0.42, 0.45, 1.2);
      spot.position.set(x, -0.1, -size * 0.35);
      spot.target.position.set(x, -0.5, -BEAM_RANGE);
      this.group.add(spot.target);
      return spot;
    });
    this.group.add(...this.blinks, ...this.headlights);
    group.add(this.group);
    this.t = 0;
    this.on = false;
  }

  // night: 0 day .. 1 night. Lights fade in at dusk; beacons blink in a 1.6 s cycle.
  update(dt, night = 0) {
    this.t += dt;
    const k = THREE.MathUtils.smoothstep(night, 0.25, 0.6);
    this.on = k > 0.02;
    this.group.visible = this.on;
    if (!this.on) return;
    const phase = this.t % 1.6;
    this.blinks[0].material.opacity = phase < 0.18 ? k : 0;
    this.blinks[1].material.opacity = phase > 0.8 && phase < 0.98 ? k : 0;
    this.blinks[2].material.opacity = (0.35 + Math.sin(this.t * 2) * 0.15) * k;
    for (const s of this.headlights) s.intensity = 5 * k;
  }

  dispose() {
    this.group.removeFromParent();
    for (const b of this.blinks) { b.material.dispose(); }
    this.headlights.forEach((s) => s.dispose?.());
  }
}
