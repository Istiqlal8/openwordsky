// Sculpted ship hulls loaded from a GLB, swapped in over the procedural one.
//
// buildShip() is synchronous and is called from the hangar, the shipyard and the freighter bay, so
// the procedural ship is built as usual and stands in until the file arrives — normally for a few
// frames. Engines, guns and landing legs stay procedural: they are placed from the design's parts,
// which the GLB has no equivalents for, and they carry the thrust and landing behaviour.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// yaw: degrees about Y to bring the model's nose onto the ship convention (local -Z).
// length: the model's own nose-to-tail size, used to scale it to the design's length in metres.
export const GLB_HULLS = {
  crimson: { file: 'ship-crimson', yaw: -90, length: 1.9, lift: 0 },
};

const BASE = new URL('../../../assets/models/', import.meta.url).href;
const loader = new GLTFLoader();
const pending = new Map(); // name -> Promise<THREE.Group>
const ready = new Map();

function load(name) {
  if (!pending.has(name)) {
    const p = loader.loadAsync(`${BASE}${GLB_HULLS[name].file}.glb`).then((g) => {
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
  hull.traverse((o) => { if (o.isMesh) o.material = mat; }); // the file ships bare geometry
  const holder = new THREE.Group();
  holder.add(hull);
  holder.rotation.y = THREE.MathUtils.degToRad(spec.yaw);
  const box = new THREE.Box3().setFromObject(holder);
  const c = box.getCenter(new THREE.Vector3());
  const s = metres / spec.length;
  hull.position.sub(c.applyAxisAngle(new THREE.Vector3(0, 1, 0), -holder.rotation.y));
  holder.scale.setScalar(s);
  holder.position.y = spec.lift * s;
  return holder;
}

// Replaces `model`'s procedural hull with the sculpted one once the file is in.
// keep: parts of the group that must survive the swap (engines, landing legs).
export function attachGlbHull(model, design, mats, keep) {
  const spec = GLB_HULLS[design.glb];
  if (!spec) return;
  const swap = (scene) => {
    if (model.disposed) return;
    for (const child of [...model.group.children]) {
      if (!keep.includes(child)) child.visible = false; // kept, not disposed: dispose() still frees it
    }
    model.group.add(instance(scene, spec, model.length, mats.hull));
  };
  const cached = ready.get(design.glb);
  if (cached) swap(cached);
  else load(design.glb).then(swap).catch(() => {});
}
