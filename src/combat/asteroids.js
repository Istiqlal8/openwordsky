// Seeded asteroid clusters: tumbling flat-shaded rocks, max 60 drawn at a time.
import * as THREE from 'three';
import { rngOf } from '../core/rng.js';
import { segmentHits } from './geom.js';

const MAX_VISIBLE = 60;
const RANGE = 800;
const VARIANTS = 6;
const byDist = (a, b) => a.dist - b.dist;

// Icosahedron with vertices jittered by position so shared corners stay welded.
function rockGeometry(rng) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  const offsets = new Map();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!offsets.has(key)) offsets.set(key, rng.range(0.72, 1.18));
    v.multiplyScalar(offsets.get(key));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.scale(1, rng.range(0.6, 0.95), rng.range(0.75, 1));
  geo.computeVertexNormals();
  return geo;
}

function rockMaterials(rng) {
  const base = new THREE.Color().setHSL(rng.range(0.02, 0.12), rng.range(0.08, 0.3), rng.range(0.3, 0.42));
  const mats = [];
  for (let i = 0; i < 3; i++) {
    const c = base.clone().offsetHSL(rng.range(-0.03, 0.03), 0, rng.range(-0.1, 0.08));
    mats.push(new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.95, metalness: 0.05, emissive: 0x0b0a09 }));
  }
  return mats;
}

// Cluster centre that does not sit on a planet orbit.
// Belts sit between planet orbits (first one just outside the innermost planet).
function clusterCenter(rng, orbits, outer, first) {
  for (let tries = 0; tries < 12; tries++) {
    const radius = first ? orbits[0] + rng.range(700, 1100) : rng.range(0.3, 1.1) * outer + 600;
    const c = new THREE.Vector3().setFromSphericalCoords(radius, Math.PI / 2 + rng.range(-0.05, 0.05), rng.range(0, 6.28));
    const r = Math.hypot(c.x, c.z);
    if (orbits.every((o) => Math.abs(o - r) > 450)) return c;
  }
  return new THREE.Vector3(0, 60, outer + 1500);
}

export class AsteroidField {
  constructor(parent, system, orbits) {
    const rng = rngOf(system.seed, 0xa57e);
    this.group = new THREE.Group();
    parent.add(this.group);
    this.geos = Array.from({ length: VARIANTS }, () => rockGeometry(rng));
    this.mats = rockMaterials(rng);
    this.clusters = [];
    this.visible = [];
    const outer = Math.max(150, ...orbits);
    const n = 2 + rng.int(3);
    for (let i = 0; i < n; i++) this.clusters.push(this.buildCluster(rng, clusterCenter(rng, orbits, outer, i === 0)));
  }

  buildCluster(rng, center) {
    const spread = rng.range(140, 280);
    const count = 20 + rng.int(41);
    const rocks = [];
    for (let i = 0; i < count; i++) {
      const r = 0.8 + Math.pow(rng.next(), 3) * 6.5;
      const mesh = new THREE.Mesh(rng.pick(this.geos), rng.pick(this.mats));
      mesh.position.set(rng.range(-1, 1), rng.range(-0.45, 0.45), rng.range(-1, 1)).multiplyScalar(spread).add(center);
      mesh.scale.setScalar(r);
      mesh.rotation.set(rng.range(0, 6), rng.range(0, 6), rng.range(0, 6));
      mesh.visible = false;
      this.group.add(mesh);
      const axis = new THREE.Vector3(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)).normalize();
      rocks.push({ mesh, pos: mesh.position, r, hp: 6 + r * 7, axis, spin: rng.range(0.05, 0.5) / r, alive: true });
    }
    return { center, spread, rocks, dist: 0 };
  }

  // Nearest clusters first; show at most MAX_VISIBLE rocks within RANGE and tumble only those.
  update(dt, shipPos) {
    for (const c of this.clusters) c.dist = c.center.distanceTo(shipPos);
    this.clusters.sort(byDist);
    this.visible.length = 0;
    for (const c of this.clusters) {
      const near = c.dist < RANGE + c.spread;
      for (const rock of c.rocks) {
        const show = near && rock.alive && this.visible.length < MAX_VISIBLE && rock.pos.distanceTo(shipPos) < RANGE;
        rock.mesh.visible = show;
        if (!show) continue;
        this.visible.push(rock);
        rock.mesh.rotateOnAxis(rock.axis, rock.spin * dt);
      }
    }
  }

  // First visible rock the segment a->b touches (pad widens the test).
  hitSegment(a, b, pad = 0) {
    for (const rock of this.visible) {
      if (rock.alive && segmentHits(a, b, rock.pos, rock.r * 0.9 + pad)) return rock;
    }
    return null;
  }

  // Returns true when the rock breaks.
  damage(rock, amount) {
    rock.hp -= amount;
    if (rock.hp > 0) return false;
    rock.alive = false;
    rock.mesh.visible = false;
    return true;
  }

  get count() {
    let n = 0;
    for (const c of this.clusters) for (const r of c.rocks) n += r.alive ? 1 : 0;
    return n;
  }

  dispose() {
    this.group.removeFromParent();
    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();
  }
}
