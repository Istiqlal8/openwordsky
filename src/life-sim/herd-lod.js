// Far level of detail for procedural herds: beyond a distance each animal is drawn as one instance
// of a static, merged copy of its species template (one InstancedMesh per species and material),
// so dozens of distant animals cost a handful of draw calls instead of ~30 meshes each.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const CAP = 32; // far instances per species

// Template meshes merged per material, in template space.
function mergedByMaterial(root) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    (groups.get(o.material) ?? groups.set(o.material, []).get(o.material)).push(g);
  });
  const out = [];
  for (const [mat, list] of groups) {
    const geo = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    if (geo) out.push({ geo, mat });
  }
  return out;
}

export class HerdLod {
  constructor(scene) {
    this.scene = scene;
    this.sets = new Map(); // species -> { meshes, n }
  }

  setFor(sp, tpl) {
    let s = this.sets.get(sp);
    if (s) return s;
    const meshes = mergedByMaterial(tpl.root).map(({ geo, mat }) => {
      const m = new THREE.InstancedMesh(geo, mat, CAP);
      m.frustumCulled = false; // instances spread far beyond the template's bounds
      m.count = 0;
      this.scene.add(m);
      return m;
    });
    s = { meshes, n: 0 };
    this.sets.set(sp, s);
    return s;
  }

  begin() { for (const s of this.sets.values()) s.n = 0; }

  // Draws animal `a` as a far instance; false when the species set is full (draw it normally).
  put(a, tpl) {
    const s = this.setFor(a.sp, tpl);
    if (s.n >= CAP || !s.meshes.length) return false;
    a.root.updateMatrix();
    for (const m of s.meshes) m.setMatrixAt(s.n, a.root.matrix);
    s.n++;
    return true;
  }

  end() {
    for (const s of this.sets.values()) {
      for (const m of s.meshes) {
        m.count = s.n;
        m.visible = s.n > 0;
        if (s.n) m.instanceMatrix.needsUpdate = true;
      }
    }
  }

  dispose() {
    for (const s of this.sets.values()) for (const m of s.meshes) { m.removeFromParent(); m.geometry.dispose(); m.dispose(); }
    this.sets.clear();
  }
}
