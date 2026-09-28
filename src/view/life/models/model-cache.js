// Loads the rigged animal GLBs once, normalizes them and hands out per-individual clones.
//
// Normalized convention (every template and clone):
//   - forward is +X (matches the `rotation.y = atan2(-dz, dx)` steering used by herds/dinos),
//   - up is +Y, the model's right side is +Z,
//   - centered on X/Z, feet (lowest vertex) at y = 0,
//   - height is exactly 1 unit, so callers scale the root by the real height in meters.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { buildRigProfile } from './rig-profile.js';

const BASE = new URL('../../../../assets/models/', import.meta.url).href;

// Raw facing of each file (degrees from +X toward +Z) and a pitch fix, measured from renders.
const RAW = {
  trex: { yaw: 37, rig: 'biped' }, raptor: { yaw: 41, rig: 'biped' },
  longneck: { yaw: 19, rig: 'quad' }, triceratops: { yaw: 33, rig: 'quad' },
  deer: { yaw: 90, rig: 'quad' }, lizard: { yaw: -90, rig: 'quad' },
  bird: { yaw: 0, rig: 'bird' }, whale: { yaw: 90, pitch: -14, rig: 'whale' },
};

const loader = new GLTFLoader();
const pending = new Map(); // name -> Promise<template>
const ready = new Map(); // name -> template

// Wraps the raw scene: root (identity, owned by callers) > pivot (normalization) > gltf scene.
function normalize(name, gltfScene) {
  const cfg = RAW[name];
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.rotation.set(0, THREE.MathUtils.degToRad(cfg.yaw), THREE.MathUtils.degToRad(cfg.pitch ?? 0), 'ZYX');
  pivot.add(gltfScene);
  root.add(pivot);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(pivot, true);
  const size = box.getSize(new THREE.Vector3());
  const s = 1 / size.y;
  pivot.scale.setScalar(s);
  pivot.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  return { name, rig: cfg.rig, scene: root, meshes, length: size.x * s, width: size.z * s,
    profile: buildRigProfile(root, cfg.rig, meshes[0]) };
}

// -> Promise<template>; the file is fetched once per session.
export function loadModel(name) {
  if (!pending.has(name)) {
    const p = loader.loadAsync(`${BASE}${name}.glb`).then((g) => {
      const tpl = normalize(name, g.scene);
      ready.set(name, tpl);
      return tpl;
    });
    p.catch((e) => console.warn(`model ${name} failed to load`, e));
    pending.set(name, p);
  }
  return pending.get(name);
}

// Template if already loaded, else null (and the load is kicked off in the background).
export function readyModel(name) {
  if (!ready.has(name)) loadModel(name).catch(() => {});
  return ready.get(name) ?? null;
}

// Independent individual: own skeleton and bones, shared geometry and (by default) material.
export function cloneModel(template, material = null) {
  const scene = cloneSkinned(template.scene);
  const bones = {};
  const meshes = [];
  scene.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (o.isSkinnedMesh) { meshes.push(o); if (material) o.material = material; }
  });
  return { scene, bones, meshes, profile: template.profile, template };
}

// Per-group tinted copy of the model material: texture x color, so each planet looks different.
export function tintedMaterial(template, hex, strength = 0.5) {
  const mat = template.meshes[0].material.clone();
  const white = new THREE.Color(1, 1, 1);
  mat.color.copy(white.lerp(new THREE.Color(hex), strength)).multiplyScalar(1 + strength * 0.35);
  return mat;
}
