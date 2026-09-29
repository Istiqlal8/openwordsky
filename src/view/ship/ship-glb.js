// Sculpted ship hulls loaded from a GLB, swapped in over the procedural one.
//
// buildShip() is synchronous and is called from the hangar, the shipyard and the freighter bay, so
// the procedural ship is built as usual and stands in until the file arrives — normally for a few
// frames. Engines, guns and landing legs stay procedural: they are placed from the design's parts,
// which the GLB has no equivalents for, and they carry the thrust and landing behaviour.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// yaw: degrees about Y to bring the model's nose onto the ship convention (local -Z).
// pitch, roll: degrees about X and Z that level the model once the yaw has turned it. A sculpted
//   export is posed, not axis-aligned, so all three are measured from renders of the file.
// length: the model's own nose-to-tail size, used to scale it to the design's length in metres.
// keep: which procedural parts survive the swap. A hull with its own engines modelled into it
//   leaves 'engines' out, so no painted flame burns over a nozzle the file already draws.
export const GLB_HULLS = {
  crimson: { file: 'ship-crimson', yaw: -90, length: 1.9, lift: 0, keep: ['engines', 'legs'] },
  vanguard: { file: 'ship-vanguard', yaw: 140.5, pitch: 12.8, roll: 30.5, length: 0.945, lift: 0, keep: ['legs'] },
};

const BASE = new URL('../../../assets/models/', import.meta.url).href;
const loader = new GLTFLoader();
const pending = new Map(); // name -> Promise<THREE.Group>
const ready = new Map();

function load(name) {
  if (!pending.has(name)) {
    const spec = GLB_HULLS[name];
    const p = loader.loadAsync(`${BASE}${spec.file}.glb`).then((g) => {
      ready.set(name, g.scene);
      return g.scene;
    });
    p.catch((e) => console.warn(`ship hull ${name} failed to load`, e));
    pending.set(name, p);
  }
  return pending.get(name);
}

// Worth calling at startup so the player's ship is never the placeholder on screen.
export function preloadShipHulls() {
  for (const name of Object.keys(GLB_HULLS)) load(name).catch(() => {});
}

// A fresh copy of the hull, turned and scaled to sit where the procedural one did.
function instance(scene, spec, metres, mat) {
  const hull = scene.clone(true);
  hull.traverse((o) => { if (o.isMesh) o.material = mat; }); // one material for the whole hull
  const holder = new THREE.Group();
  holder.add(hull);
  const deg = THREE.MathUtils.degToRad;
  // 'XZY' applies the yaw first, so pitch and roll level the model in ship space, where they were
  // measured, rather than in the file's own tilted frame.
  holder.rotation.set(deg(spec.pitch ?? 0), deg(spec.yaw), deg(spec.roll ?? 0), 'XZY');
  const box = new THREE.Box3().setFromObject(holder);
  const c = box.getCenter(new THREE.Vector3());
  const s = metres / spec.length;
  hull.position.sub(c.applyQuaternion(holder.quaternion.clone().invert()));
  holder.scale.setScalar(s);
  holder.position.y = spec.lift * s;
  return holder;
}

// A fresh material per ship carrying the hull file's own painted maps, so disposing one ship never
// takes the shared hull down with it. Textures stay shared: Material.dispose() leaves them alone.
function hullMaterial(scene) {
  let src = null;
  scene.traverse((o) => { if (!src && o.isMesh) src = o.material; });
  return new THREE.MeshStandardMaterial({
    map: src?.map ?? null, normalMap: src?.normalMap ?? null,
    metalnessMap: src?.metalnessMap ?? null, roughnessMap: src?.roughnessMap ?? null,
    metalness: 1, roughness: 1, side: src?.side ?? THREE.FrontSide,
  });
}

// Replaces `model`'s procedural hull with the sculpted one once the file is in.
// parts: the procedural groups the spec's `keep` list may name (engines, legs).
export function attachGlbHull(model, design, mats, parts) {
  const spec = GLB_HULLS[design.glb];
  if (!spec) return;
  const keep = spec.keep.map((name) => parts[name]);
  const swap = (scene) => {
    if (model.disposed) return;
    for (const child of [...model.group.children]) {
      if (!keep.includes(child)) child.visible = false; // kept, not disposed: dispose() still frees it
    }
    model.group.add(instance(scene, spec, model.length, hullMaterial(scene)));
  };
  const cached = ready.get(design.glb);
  if (cached) swap(cached);
  else load(design.glb).then(swap).catch(() => {});
}
