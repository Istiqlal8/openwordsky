// Ground cover around the player on Earth: ~10k instanced grass tufts plus colorful wildflower
// patches, tinted by the ground color under them and swaying in the wind. Rebuilt from the
// terrain patch (cheap lookups) whenever the player has moved a few metres.
import * as THREE from 'three';
import { hash32 } from '../core/rng.js';
import { noise2 } from '../core/noise.js';
import { withSway } from './earth-flora.js';
import { B } from './earth-biome.js';

const CELL = 0.9, RADIUS = 56, MAX = 12000, MAX_FLOWERS = 3500, MOVE = 5, HIDE_ABOVE = 45;
const DENSITY = new Float32Array(8);
DENSITY[B.grass] = 1; DENSITY[B.forest] = 0.45; DENSITY[B.pine] = 0.3; DENSITY[B.desert] = 0.12; DENSITY[B.beach] = 0.08;
const PETALS = [0xffe040, 0xffffff, 0xb070ff, 0xff4a4a, 0xff9a30, 0x6a9aff, 0xff80c0].map((h) => new THREE.Color(h));
const _c = new THREE.Color();

// Tuft: a few thin 3-sided blades, darker at the root.
function tuftGeometry(blades, h) {
  const geos = [];
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2, lean = 0.25 + (i % 2) * 0.2, hh = h * (0.7 + (i % 3) * 0.15);
    const g = new THREE.ConeGeometry(0.035, hh, 3, 1, true).translate(0, hh / 2, 0).rotateZ(lean).rotateY(a);
    geos.push(g.translate(Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06).toNonIndexed());
  }
  return shade(mergeFlat(geos), h);
}

function flowerGeometry() {
  const stem = new THREE.ConeGeometry(0.02, 0.4, 3, 1, true).translate(0, 0.2, 0).toNonIndexed();
  const head = new THREE.IcosahedronGeometry(0.075, 0).scale(1, 0.55, 1).translate(0, 0.42, 0);
  return shade(mergeFlat([stem, head]), 0.4);
}

function mergeFlat(geos) {
  const n = geos.reduce((s, g) => s + g.attributes.position.count, 0);
  const pos = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; g.dispose(); }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
}

// Root-to-tip brightness as vertex color.
function shade(geo, h) {
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) col.fill(0.55 + 0.6 * Math.min(1, p.getY(i) / h), i * 3, i * 3 + 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

function instanced(geo, max, sway) {
  const mat = withSway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }), sway);
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  mesh.count = 0;
  mesh.frustumCulled = false;
  return mesh;
}

export class EarthGrass {
  constructor(scene, patch, props) {
    Object.assign(this, { scene, patch, props });
    this.tufts = instanced(tuftGeometry(5, 0.55), MAX, 0.25);
    this.flowers = instanced(flowerGeometry(), MAX_FLOWERS, 0.3);
    this.last = null;
    scene.add(this.tufts, this.flowers);
  }

  blocked(x, z) {
    const c = this.props.clearZone;
    if (c && (x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r) return true;
    for (const e of this.props.extraZones) if ((x - e.x) ** 2 + (z - e.z) ** 2 < e.r * e.r) return true;
    return false;
  }

  // One instance: yaw + scale + translation written straight into the matrix array.
  put(mesh, n, x, y, z, hsh, color) {
    const a = ((hsh >>> 16) & 255) / 40.6, s = 0.7 + ((hsh >>> 24) & 255) / 400, c = Math.cos(a) * s, sn = Math.sin(a) * s;
    mesh.instanceMatrix.array.set([c, 0, -sn, 0, 0, s * (0.8 + (hsh & 63) / 100), 0, 0, sn, 0, c, 0, x, y, z, 1], n * 16);
    mesh.instanceColor.array.set([color.r, color.g, color.b], n * 3);
  }

  rebuild(px, pz) {
    let nt = 0, nf = 0;
    const r2 = RADIUS * RADIUS, x0 = Math.floor((px - RADIUS) / CELL), x1 = Math.floor((px + RADIUS) / CELL);
    const z0 = Math.floor((pz - RADIUS) / CELL), z1 = Math.floor((pz + RADIUS) / CELL);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1 && nt < MAX; iz++) {
        const hsh = hash32(0x96a55, ix, iz), x = (ix + (hsh & 255) / 256) * CELL, z = (iz + ((hsh >>> 8) & 255) / 256) * CELL;
        if ((x - px) ** 2 + (z - pz) ** 2 > r2) continue;
        const b = this.patch.biomeAt(x, z);
        if (b < 0 || ((hsh >>> 4) & 255) / 256 >= DENSITY[b] || this.blocked(x, z)) continue;
        const y = this.patch.heightAt(x, z) - 0.05;
        if (b === B.grass && nf < MAX_FLOWERS && (hsh & 3) === 0 && noise2(71, x / 9, z / 9) > 0.62) {
          this.put(this.flowers, nf++, x, y, z, hsh, PETALS[(hsh >>> 5) % PETALS.length]);
        } else if (this.patch.colorAt(x, z, _c)) {
          this.put(this.tufts, nt++, x, y, z, hsh, _c.multiplyScalar(1.15));
        }
      }
    }
    this.commit(this.tufts, nt);
    this.commit(this.flowers, nf);
  }

  commit(mesh, n) {
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  }

  // Force a rebuild on the next update (terrain patch or clear zones changed).
  invalidate() { this.last = null; }

  update(cam) {
    const high = cam.y - this.patch.heightAt(cam.x, cam.z) > HIDE_ABOVE;
    this.tufts.visible = this.flowers.visible = !high;
    if (high) return;
    if (this.last && Math.hypot(cam.x - this.last.x, cam.z - this.last.z) < MOVE) return;
    this.last = { x: cam.x, z: cam.z };
    this.rebuild(cam.x, cam.z);
  }

  dispose() {
    for (const m of [this.tufts, this.flowers]) {
      this.scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
      m.dispose();
    }
  }
}
