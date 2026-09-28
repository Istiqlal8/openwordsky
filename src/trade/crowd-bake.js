// Bakes alien bodies and ships into merged vertex-coloured geometry: one 'body' and one 'glow'
// geometry per model. Crowd bodies also get per-vertex limb data (pivot, swing, kind) that the
// crowd shader uses to swing arms and legs without separate meshes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Rng } from '../core/rng.js';
import { GeoKit, makeMats } from '../aliens/body-kit.js';
import { BUILDERS } from '../aliens/alien-body.js';

// Lower-detail geometry pool for crowds (same API as GeoKit).
export class LowKit extends GeoKit {
  sphere(detail = 18) { return super.sphere(Math.max(6, Math.round(detail * 0.55))); }
  cap(r, len) { return this.get('Capsule', r, len, 2, 6); }
  cyl(rt, rb, h, seg = 12) { return super.cyl(rt, rb, h, Math.max(4, Math.round(seg * 0.6))); }
  cone(r, h, seg = 12) { return super.cone(r, h, Math.max(4, Math.round(seg * 0.6))); }
  torus(r, t) { return this.get('Torus', r, t, 5, 12); }
}

const _c = new THREE.Color();
const isGlow = (mat) => mat.emissiveIntensity > 1;

// One mesh -> non-indexed world-space geometry with position, normal, color (+ limb attributes).
function bakeMesh(mesh, limb) {
  let g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  g.applyMatrix4(mesh.matrixWorld);
  const m = mesh.material, n = g.attributes.position.count;
  if (isGlow(m)) _c.copy(m.emissive).multiplyScalar(Math.min(1.4, m.emissiveIntensity * 0.8));
  else {
    _c.copy(m.color);
    if (m.emissive?.getHex()) _c.lerp(m.emissive, Math.min(0.5, m.emissiveIntensity * 0.5));
  }
  if (m.transparent && !isGlow(m)) _c.lerp(new THREE.Color(0xffffff), 0.25);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([_c.r, _c.g, _c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (limb) {
    const l = new Float32Array(n * 4), k = new Float32Array(n);
    for (let i = 0; i < n; i++) { l.set([limb.x, limb.y, limb.z, limb.swing], i * 4); k[i] = limb.kind; }
    g.setAttribute('aLimb', new THREE.BufferAttribute(l, 4));
    g.setAttribute('aKind', new THREE.BufferAttribute(k, 1));
  }
  return g;
}

// Merge every mesh under root into { body, glow } geometries (null when empty).
export function bakeGroup(root, limbOf = null) {
  root.updateMatrixWorld(true);
  const body = [], glow = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    (isGlow(o.material) ? glow : body).push(bakeMesh(o, limbOf ? limbOf(o) : null));
  });
  const merge = (list) => (list.length ? mergeGeometries(list, false) : null);
  const out = { body: merge(body), glow: merge(glow) };
  for (const g of [...body, ...glow]) g.dispose();
  return out;
}

// Limb record per mesh: arms/legs swing around their pivot; floaters' legs ripple by phase.
function limbTable(rig) {
  const table = new Map(), tmp = new THREE.Vector3();
  const mark = (pivot, swing, kind) => {
    pivot.getWorldPosition(tmp);
    const rec = { x: tmp.x, y: tmp.y, z: tmp.z, swing, kind };
    pivot.traverse((o) => { if (o.isMesh) table.set(o, rec); });
  };
  rig.arms.forEach((a, i) => mark(a, i % 2 ? 0.8 : -0.8, 0));
  rig.legs.forEach((l, i) => {
    if (rig.float) mark(l, (l.userData.phase ?? i) / (Math.PI * 2), 1);
    else mark(l, i === 0 ? 1 : i === 1 ? -1 : 0, 0);
  });
  return table;
}

const NONE = { x: 0, y: 0, z: 0, swing: 0, kind: 0 };

// Race template for the crowd -> { race, body, glow, unit, float }.
export function bakeRace(race, seed) {
  const kit = new LowKit(), rng = new Rng(seed), mats = makeMats(race, rng);
  const rig = BUILDERS[race.id](kit, mats, rng);
  rig.root.updateMatrixWorld(true);
  const table = limbTable(rig);
  const out = bakeGroup(rig.root, (o) => table.get(o) ?? NONE);
  for (const m of mats.all) m.dispose();
  kit.dispose();
  return { race, ...out, unit: rig.unit, float: rig.float };
}

// Crowd shader: swing limbs (walkers) or ripple tentacles (floaters) and bob the body.
// Per instance: iAnim = (walk phase, swing amplitude, time + personal phase).
const HEAD = `attribute vec4 aLimb; attribute float aKind; attribute vec3 iAnim;
mat3 crowdRotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
float crowdAngle() { return aKind > 0.5 ? sin(iAnim.z * 2.4 + aLimb.w * 6.2832) * 0.35 + iAnim.y * 0.3 : aLimb.w * sin(iAnim.x) * iAnim.y; }
`;

export function patchCrowd(material) {
  material.onBeforeCompile = (sh) => {
    sh.vertexShader = HEAD + sh.vertexShader
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = crowdRotX(crowdAngle()) * vec3(normal);')
      .replace('#include <begin_vertex>', `vec3 transformed = aLimb.xyz + crowdRotX(crowdAngle()) * (position - aLimb.xyz);
        transformed.y += abs(sin(iAnim.x)) * iAnim.y * 0.07 + sin(iAnim.z * 1.7) * 0.05;`);
  };
  material.customProgramCacheKey = () => 'alien-crowd';
  return material;
}
