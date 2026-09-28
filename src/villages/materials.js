// Shared settlement materials (one set per planet) and their day / night response.
import * as THREE from 'three';
import { glowTexture } from '../assets/textures.js';

const WINDOW_DAY = new THREE.Color(0.12, 0.18, 0.3), WINDOW_NIGHT = new THREE.Color(1.5, 1.35, 1.1);
const LAMP_DAY = new THREE.Color(0.55, 0.55, 0.5), LAMP_NIGHT = new THREE.Color(1.8, 1.6, 1.3);
const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, ...o });

export function makeMaterials(atlas) {
  const pool = glowTexture(0xffc070); // cached and shared: never disposed here
  return {
    hull: std({ roughness: 0.8, metalness: 0.05, side: THREE.DoubleSide }),
    ground: std({ roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }),
    glass: std({ roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
      depthWrite: false, emissive: 0x6aff8a, emissiveIntensity: 0 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, color: WINDOW_DAY.clone() }),
    lamp: new THREE.MeshBasicMaterial({ vertexColors: true, color: LAMP_DAY.clone(), fog: false }),
    pad: new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
    sign: new THREE.MeshBasicMaterial({ map: atlas }),
    pool: new THREE.MeshBasicMaterial({ map: pool, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }),
    halo: new THREE.PointsMaterial({ map: pool, size: 2.4, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, color: 0xffd9a0, fog: false }),
    body: std({ roughness: 0.85 }), // residents (vertex-coloured figures)
  };
}

// night: 0 day .. 1 night; t: seconds (pad chase lights).
export function applyNight(m, night, t) {
  m.glow.color.lerpColors(WINDOW_DAY, WINDOW_NIGHT, night);
  m.lamp.color.lerpColors(LAMP_DAY, LAMP_NIGHT, night);
  m.pad.color.setScalar((0.7 + 0.9 * night) * (0.75 + 0.25 * Math.sin(t * 3)));
  m.sign.color.setScalar(0.9 + 0.35 * night);
  m.glass.emissiveIntensity = night * 0.35;
  m.pool.opacity = night * 0.55;
  m.halo.opacity = night * 0.9;
}

export function disposeMaterials(m) {
  for (const mat of Object.values(m)) mat.dispose();
}
