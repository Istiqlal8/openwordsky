// Shared materials of the home base and their day / night response.
import * as THREE from 'three';
import { glowTexture } from '../assets/textures.js';

const WINDOW_DAY = new THREE.Color(0.1, 0.17, 0.32), WINDOW_NIGHT = new THREE.Color(1.5, 1.4, 1.25);
const LAMP_DAY = new THREE.Color(0.55, 0.55, 0.5), LAMP_NIGHT = new THREE.Color(1.8, 1.6, 1.3);

// Build-time palette (sRGB hex).
export const C = {
  hull: 0xe9e6de, panel: 0x9aa4ae, dark: 0x3b424c, steel: 0x6d7782, accent: 0xf08a3c, teal: 0x3fb6a8,
  wood: 0x9a6b43, roof: 0xc0643f, grass: 0x5a9a3c, leaf: 0x3f7f2e, soil: 0x5b4330,
  plaza: 0xcfc8b8, tile: 0xa89f8c, path: 0xbdb5a3, pad: 0x4a515c, stripe: 0xf2c14e,
  warm: 0xffd08a, cool: 0x9fd8ff, red: 0xff4a3a, green: 0x6aff8a, white: 0xffffff,
};

const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, ...o });

export function makeMaterials(atlas) {
  const pool = glowTexture(0xffc070); // cached and shared: never disposed here
  return {
    hull: std({ roughness: 0.72, metalness: 0.15, side: THREE.DoubleSide }),
    ground: std({ roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, color: WINDOW_DAY.clone() }),
    lamp: new THREE.MeshBasicMaterial({ vertexColors: true, color: LAMP_DAY.clone(), fog: false }), // lights cut through fog
    pad: new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
    sign: new THREE.MeshBasicMaterial({ map: atlas }),
    pool: new THREE.MeshBasicMaterial({ map: pool, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }),
    halo: new THREE.PointsMaterial({ map: pool, size: 2.4, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, color: 0xffd9a0, fog: false }),
  };
}

// night: 0 day .. 1 night; t: seconds (pad chase lights).
export function applyNight(m, night, t) {
  m.glow.color.lerpColors(WINDOW_DAY, WINDOW_NIGHT, night);
  m.lamp.color.lerpColors(LAMP_DAY, LAMP_NIGHT, night);
  const pulse = 0.75 + 0.25 * Math.sin(t * 3);
  m.pad.color.setScalar((0.7 + 0.9 * night) * pulse);
  m.sign.color.setScalar(0.9 + 0.35 * night);
  m.pool.opacity = night * 0.55;
  m.halo.opacity = night * 0.9;
}

export function disposeMaterials(m) {
  for (const mat of Object.values(m)) mat.dispose();
}
