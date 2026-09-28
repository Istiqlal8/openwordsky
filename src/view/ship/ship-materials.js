// Materials for one ship, built from its palette. Disposed with the ship.
import * as THREE from 'three';
import { glowTexture } from '../../assets/textures.js';

export function shipMaterials(palette, cls) {
  const exotic = cls === 'exotic';
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  return {
    hull: new THREE.MeshStandardMaterial({ color: palette.hull, flatShading: !exotic, metalness: 0.45,
      roughness: exotic ? 0.25 : 0.45, emissive: palette.hull, emissiveIntensity: exotic ? 0.22 : 0.06 }),
    trim: new THREE.MeshStandardMaterial({ color: palette.trim, flatShading: true, metalness: 0.6,
      roughness: 0.35, emissive: exotic ? palette.glow : 0x000000, emissiveIntensity: exotic ? 0.35 : 0 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1b2029, flatShading: true, metalness: 0.7,
      roughness: 0.5, side: THREE.DoubleSide }),
    canopy: new THREE.MeshStandardMaterial({ color: 0x0b1d3d, metalness: 0.9, roughness: 0.08,
      emissive: 0x0a2a55, emissiveIntensity: 0.45 }),
    glow: new THREE.MeshBasicMaterial({ color: palette.glow }),
    flame: new THREE.MeshBasicMaterial({ color: palette.glow, opacity: 0.55, side: THREE.DoubleSide, ...additive }),
    sprite: new THREE.SpriteMaterial({ map: glowTexture(palette.glow), color: palette.glow, ...additive }),
  };
}

// Mesh helper: geometry + material placed at (x, y, z).
export function part(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
