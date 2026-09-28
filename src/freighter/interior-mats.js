// Materials for the freighter interior, coloured by the archetype palette. Everything here is
// owned by the interior and freed by its dispose().
import * as THREE from 'three';
import { std, glow } from './kit.js';
import { surfaceTextures, hazardTexture, padTexture, screenTexture } from './interior/textures.js';

export function interiorMaterials(pal) {
  const tex = { ...surfaceTextures(pal), hazard: hazardTexture(), pad: padTexture(pal.sign), screen: screenTexture(pal.screen) };
  const soft = pal.floorKind === 'organic';
  const mats = {
    floor: std({ map: tex.floor, roughness: soft ? 0.5 : 0.8, metalness: soft ? 0.1 : 0.3 }),
    wall: std({ map: tex.wall, roughness: 0.7, metalness: soft ? 0.1 : 0.35 }),
    ceiling: std({ color: pal.ceil, roughness: 0.9, side: THREE.DoubleSide }),
    metal: std({ color: pal.metal, roughness: 0.45, metalness: 0.7 }),
    dark: std({ color: pal.dark, roughness: 0.7 }),
    trim: std({ color: pal.accent, roughness: 0.5, emissive: pal.accent, emissiveIntensity: 0.15 }),
    orange: std({ color: 0xd9782a, roughness: 0.6 }),
    hazard: std({ map: tex.hazard, roughness: 0.7 }),
    pad: std({ map: tex.pad, roughness: 0.7 }),
    cool: glow(pal.lamp, 2.2),
    warm: glow(pal.warm, 2),
    accentGlow: glow(pal.accent, 2),
    red: glow(0xff4030, 2.5),
    green: glow(0x40ff80, 2),
    screen: new THREE.MeshBasicMaterial({ map: tex.screen, toneMapped: false }),
    holo: glow(pal.lamp, 0.9),
    fabric: std({ color: pal.fabric, roughness: 0.95, metalness: 0 }),
    crate: std({ color: 0xffffff, roughness: 0.8, metalness: 0.2 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.12, roughness: 0.05,
      metalness: 0.9, depthWrite: false, side: THREE.DoubleSide }),
  };
  mats.wallIn = mats.wall.clone();
  mats.wallIn.side = THREE.DoubleSide;
  return { mats, textures: Object.values(tex) };
}

// Scale a geometry's UVs so a texture repeats every `tile` metres along (u, v).
export function tileUv(geo, u, v) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
  return geo;
}
