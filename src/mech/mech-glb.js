// Loads the rigged Gundam GLB once, normalizes it to mech space and hands out clones.
//
// Normalized convention (template and clones): forward -Z, up +Y, right +X, height exactly 1,
// feet at y = 0, centred on X/Z — so a caller scales the root by the mech's height in metres.
// The file ships without animation clips; mech-skin.js drives the skeleton from the same
// procedural rig mech-pose.js already animates.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { mapMechRig, measureRig } from './mech-rig-map.js';

const FILE = new URL('../../assets/models/mech-gundam.glb', import.meta.url).href;

let template = null;
let pending = null;

const nameOf = (b) => b?.name ?? null;

function namedRig(r) {
  return {
    root: nameOf(r.root), spine: r.spine.map(nameOf), chest: nameOf(r.chest),
    head: nameOf(r.head), crest: r.crest.map(nameOf),
    arms: r.arms.map((a) => ({ clav: nameOf(a.clav), upper: nameOf(a.upper), fore: nameOf(a.fore),
      hand: nameOf(a.hand), pad: nameOf(a.pad) })),
    legs: r.legs.map((l) => ({ hip: nameOf(l.hip), knee: nameOf(l.knee), ankle: nameOf(l.ankle) })),
    metrics: r.metrics,
  };
}

// root (identity, cloned per mech) > pivot (turn + scale + recentre) > gltf scene.
function normalize(scene) {
  const { yaw, parts } = mapMechRig(scene);
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.rotation.y = yaw;
  pivot.add(scene);
  root.add(pivot);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(pivot, true);
  const size = box.getSize(new THREE.Vector3());
  const s = 1 / size.y;
  pivot.scale.setScalar(s);
  pivot.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
  const rig = measureRig(parts, root);
  let mesh = null;
  root.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
  if (mesh) mesh.frustumCulled = false;   // the skeleton leaves the bind box while it fights
  return { scene: root, rig: namedRig(rig), material: mesh?.material ?? null, depth: size.x * s, width: size.z * s };
}

// Starts the fetch. Safe to call repeatedly; a failure is logged once and never retried.
export function preloadMechSkin() {
  if (pending) return pending;
  pending = new GLTFLoader().loadAsync(FILE).then((g) => { template = normalize(g.scene); return template; });
  pending.catch((e) => console.warn('mech model failed to load, using the procedural frame', e));
  return pending;
}

// The template once it is in memory, else null (the procedural mech is the fallback).
export function readyMechSkin() {
  if (!pending) preloadMechSkin();
  return template;
}

// Independent skeleton, shared geometry. The material is cloned so each ship can tint its own.
export function cloneMechSkin(tpl) {
  const scene = cloneSkinned(tpl.scene);
  const bones = {};
  let mesh = null;
  scene.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (o.isSkinnedMesh) { mesh = o; o.frustumCulled = false; }
  });
  const material = tpl.material.clone();
  if (mesh) mesh.material = material;
  return { scene, bones, mesh, material, rig: tpl.rig };
}

// Ship livery over the model's own white/blue/yellow. Only a wash: the hull colour is mixed into
// the base a sixth of the way and lifted back to full brightness, and the ship's glow becomes a
// faint self-light. The Gundam still reads as itself, but in the pilot's colours.
const TINT = 0.17;

export function tintSkin(material, palette, cls) {
  const hull = new THREE.Color(palette.hull);
  const lift = 1 / Math.max(0.35, 1 - TINT + TINT * Math.max(hull.r, hull.g, hull.b));
  material.color.setRGB(1, 1, 1).lerp(hull, TINT).multiplyScalar(lift);
  material.emissive = new THREE.Color(palette.glow);
  material.emissiveIntensity = cls === 'exotic' ? 0.09 : 0.045;
  // The file ships fully metallic, which renders black in a scene with no environment map: the
  // armour needs to be mostly dielectric so the sun actually lands on it.
  material.metalness = 0.28;
  material.roughness = 0.72;
  return material;
}

// Rewrites the design's skeleton to the model's real proportions, so the walk IK, the brace and
// the weapon sizes all agree with what is on screen. Only the lengths change; H is untouched.
export function fitDesign(m, tpl) {
  const d = m.d, H = d.H, k = tpl.rig.metrics;
  d.footH = k.footH * H;
  d.thighL = k.thighL * H;
  d.shinL = k.shinL * H;
  d.hipY = k.hipY * H;
  d.shoulderX = k.shoulderX * H;
  d.shoulderY = k.shoulderY * H;
  const gap = d.shoulderY - d.hipY, old = d.pelvisH * 0.55 + d.chestH * 0.75;
  const q = old > 0 ? gap / old : 1;
  d.pelvisH *= q;
  d.chestH *= q;
  d.torsoY = d.hipY + d.pelvisH * 0.55;
  d.upperL = k.upperL * H;
  d.foreL = k.foreL * H;
  d.handL = k.handL * H;
  return m;
}
