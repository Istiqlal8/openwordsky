// A real beam sword, not a glowing line: a machined hilt with a pommel and a cross guard, a solid
// tapered blade with a fuller down each face, a white-hot core inside it and a soft outer shell of
// light around the whole thing. The blade grows out of the emitter along its own length, so
// igniting reads as the beam forming rather than a cylinder appearing.
import * as THREE from 'three';
import { part } from '../view/ship/ship-materials.js';
import { block, rod } from './mech-geo.js';

// Flat diamond section that narrows to a point: the blade's real silhouette.
function bladeGeo(len, width, thick) {
  const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 4, 1);
  g.rotateY(Math.PI / 4);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = v.y > 0 ? 0.12 : 1;                 // taper to the tip
    pos.setXYZ(i, v.x * width * 2 * k, (v.y + 0.5) * len, v.z * thick * 2 * k);
  }
  g.computeVertexNormals();
  return g;
}

function coreMaterial(color) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
}

// Hilt: grip, collar, emitter throat and a short cross guard.
function buildHilt(mats, r, g) {
  g.add(part(rod(r * 0.92, r * 4.4, 10), mats.dark, 0, r * 2.2, 0));
  g.add(part(block(r * 1.5, r * 0.5, r * 1.5, 0.9, 6), mats.trim, 0, r * 0.4, 0));       // pommel ring
  g.add(part(block(r * 1.3, r * 0.42, r * 1.3, 0.9, 6), mats.trim, 0, r * 3.1, 0));
  g.add(part(rod(r * 1.25, r * 0.9, 12), mats.hull, 0, r * 4.7, 0));                      // emitter
  for (const s of [-1, 1]) {                                                              // cross guard
    const arm = part(block(r * 0.55, r * 2.1, r * 0.8, 0.6), mats.trim, s * r * 1.05, r * 4.7, 0);
    arm.rotation.z = -s * (Math.PI / 2 - 0.35);
    g.add(arm);
  }
  return r * 5.2;   // where the beam leaves the emitter
}

// -> { group, beam, core, shell, length, tip, base } ; setLit(0..1) grows the blade.
export function buildBlade(m, mats, color) {
  const d = m.d, g = new THREE.Group();
  const r = d.armR * 0.46;
  const root = buildHilt(mats, r, g);
  const len = (d.upperL + d.foreL) * 1.16;
  const width = r * 1.35, thick = r * 0.5;
  const hot = coreMaterial(0xffffff);
  const halo = coreMaterial(color);
  halo.opacity = 0.3;
  const beam = part(bladeGeo(len, width, thick), mats.flame, 0, root, 0);
  const core = part(bladeGeo(len, width * 0.42, thick * 0.5), hot, 0, root, 0);
  const shell = part(bladeGeo(len, width * 2.1, thick * 2.6), halo, 0, root, 0);
  beam.renderOrder = 2;
  core.renderOrder = 3;
  shell.renderOrder = 1;
  g.add(shell, beam, core);
  g.rotation.x = -Math.PI / 2;
  const api = {
    group: g, beam, core, shell, length: len, mats: { hot, halo },
    tip: new THREE.Vector3(0, root + len, 0),
    setLit(t) {
      const k = Math.max(0.001, t);
      beam.scale.set(0.35 + k * 0.65, k, 0.35 + k * 0.65);
      core.scale.set(0.3 + k * 0.7, k * 0.985, 0.3 + k * 0.7);
      shell.scale.set(0.4 + k * 0.6, k, 0.4 + k * 0.6);
      hot.opacity = 0.95 * k;
      halo.opacity = 0.3 * k;
      mats.flame.opacity = Math.max(mats.flame.opacity, 0.25 + k * 0.5);
    },
  };
  api.setLit(0);
  return api;
}
