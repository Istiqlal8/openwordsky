// Small helpers shared by the cosmos effects (random numbers, sprites, cleanup).
import * as THREE from 'three';

export const rand = (a, b) => a + Math.random() * (b - a);

// Uniform random unit vector.
export function randomDir(out) {
  const u = Math.random() * 2 - 1;
  const th = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return out.set(Math.cos(th) * s, u, Math.sin(th) * s);
}

// Additive, fog-free sprite for far-away glows. Each sprite owns its material (per-sprite opacity).
export function glowSprite(map, color = 0xffffff) {
  const mat = new THREE.SpriteMaterial({
    map, color, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.frustumCulled = false;
  sprite.visible = false;
  return sprite;
}

// Dispose geometries and materials below root (cached textures are left alone).
export function disposeTree(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) m.dispose();
  });
  root.removeFromParent();
}

// 0 -> 1 -> 0 envelope: quick rise over `rise`, then eased fall to `life`.
export function envelope(age, rise, life) {
  if (age <= 0 || age >= life) return 0;
  if (age < rise) return age / rise;
  const k = 1 - (age - rise) / (life - rise);
  return k * k;
}
