// Floating "!" above explorers who have a request for the player, plus the T-to-talk lookup.
import * as THREE from 'three';
import { requestOf } from '../quest/npc-requests.js';

const TALK_RANGE = 6;
const HEAD = 2.5;
let texture = null;

function badgeTexture() {
  if (texture) return texture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#9dff6a';
  g.beginPath();
  g.arc(32, 32, 28, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#0a1a04';
  g.font = 'bold 44px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('!', 32, 35);
  texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Nearest explorer on foot within talking range, or null.
export function explorerNear(visitors, pos, range = TALK_RANGE) {
  let best = null, bestD = range;
  for (const v of visitors?.visitors ?? []) {
    if (!v.explorer.outside) continue;
    const d = Math.hypot(pos.x - v.explorer.feet.x, pos.z - v.explorer.feet.z);
    if (d < bestD) { best = v.explorer; bestD = d; }
  }
  return best;
}

export class NpcBadges {
  constructor(surface) {
    this.surface = surface; // its scene is rebuilt on every landing
    this.sprites = new Map(); // explorer seed -> Sprite
    this.planet = null;
    this.t = 0;
  }

  mount(planet) {
    this.dispose();
    this.planet = planet;
  }

  update(dt, visitors) {
    if (!this.planet) return;
    this.t += dt;
    const live = new Set();
    for (const v of visitors?.visitors ?? []) {
      const e = v.explorer;
      if (!e.outside || !requestOf(e.seed, this.planet, e.name)) continue;
      live.add(e.seed);
      const s = this.sprites.get(e.seed) ?? this.add(e.seed);
      s.position.set(e.feet.x, e.feet.y + HEAD + Math.sin(this.t * 3) * 0.12, e.feet.z);
    }
    for (const [seed, s] of this.sprites) if (!live.has(seed)) { s.parent?.remove(s); s.material.dispose(); this.sprites.delete(seed); }
  }

  add(seed) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTexture(), transparent: true }));
    s.scale.setScalar(0.9);
    this.surface.scene.add(s);
    this.sprites.set(seed, s);
    return s;
  }

  dispose() {
    for (const s of this.sprites.values()) { s.parent?.remove(s); s.material.dispose(); }
    this.sprites.clear();
    this.planet = null;
  }
}
