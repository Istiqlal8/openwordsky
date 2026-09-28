// Settlement-local placement on the terrain: buildings on foundations, draped ground, fences, trees, lamps.
import * as THREE from 'three';
import { GeoKit } from '../base/geo-kit.js';
import { Frame, groundY, groundRange } from '../base/site.js';

const LEAF = [0x3f7f2e, 0x4f8f36, 0x2f6a2a, 0x6a9a3a];
const flatDisc = (r, seg) => new THREE.CircleGeometry(r, seg).rotateX(-Math.PI / 2);

export class Builder {
  // site: { x, z, yaw }; h: height fn; planet: descriptor.
  constructor(site, h, planet) {
    Object.assign(this, { h, planet, kit: new GeoKit(), frame: new Frame(site.x, site.z, site.yaw) });
    this.colliders = [];
    this.zones = [];
    this.lampHeads = [];
    this.doors = [];
  }

  world(lx, lz) { return { x: this.frame.x(lx, lz), z: this.frame.z(lx, lz) }; }
  ground(x, z) { return groundY(this.h, this.planet, x, z); }
  // Ground height at a settlement-local point.
  groundAt(lx, lz) { const p = this.world(lx, lz); return this.ground(p.x, p.z); }

  // Building floor on the highest ground of its footprint (above water); kit frame set there.
  // face: yaw relative to the settlement; r: footprint radius; door: model-local door point.
  place(lx, lz, face, r, door = { x: 0, z: r }, lift = 0.15) {
    const { x, z } = this.world(lx, lz), t = this.planet.terrain;
    const { lo, hi } = groundRange(this.h, x, z, r);
    const floor = Math.max(hi, t.hasWater ? t.waterY + 0.4 : -Infinity) + lift;
    const b = { x, z, floor, depth: floor - lo, yaw: this.frame.yaw + face };
    b.door = this.offset(b, door.x, door.z);
    b.drop = floor - this.ground(b.door.x, b.door.z);
    this.kit.at(x, floor, z, b.yaw);
    this.colliders.push({ x, z, r: r * 0.92 });
    this.zones.push({ x, z, r: r + 2.5 });
    return b;
  }

  // World point of a building-local offset.
  offset(b, dx, dz) {
    const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
    return { x: b.x + dx * c + dz * s, z: b.z - dx * s + dz * c };
  }

  // Kit frame on the ground at a local point -> { x, y, z } world.
  onGround(lx, lz, face = 0) {
    const { x, z } = this.world(lx, lz), y = this.ground(x, z);
    this.kit.at(x, y, z, this.frame.yaw + face);
    return { x, y, z };
  }

  zone(lx, lz, r) { const p = this.world(lx, lz); this.zones.push({ x: p.x, z: p.z, r }); }

  // Flat XZ geometry in settlement-local coords, draped over the terrain.
  drape(bucket, geo, hex, lift = 0.1) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const p = this.world(pos.getX(i), pos.getZ(i));
      pos.setXYZ(i, p.x, this.ground(p.x, p.z) + lift + pos.getY(i), p.z);
    }
    geo.computeVertexNormals();
    this.kit.addWorld(bucket, geo, hex);
  }

  disc(lx, lz, r, hex, lift = 0.1, seg = 24) {
    this.drape('ground', flatDisc(r, seg).translate(lx, 0, lz), hex, lift);
  }

  // Straight strip (path, field row) from a to b, local coords.
  strip(ax, az, bx, bz, width, hex, lift = 0.1, bucket = 'ground') {
    const len = Math.hypot(bx - ax, bz - az);
    const geo = new THREE.PlaneGeometry(width, len, 1, Math.max(1, Math.ceil(len / 3))).rotateX(-Math.PI / 2);
    geo.rotateY(Math.atan2(bx - ax, bz - az)).translate((ax + bx) / 2, 0, (az + bz) / 2);
    this.drape(bucket, geo, hex, lift);
  }

  // Wooden fence along local points (posts every ~2.5 m, two rails).
  fence(points, hex = 0x8a6a45) {
    for (let i = 1; i < points.length; i++) {
      const [ax, az] = points[i - 1], [bx, bz] = points[i];
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 2.5));
      let prev = null;
      for (let k = 0; k <= n; k++) {
        const p = this.onGround(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n);
        this.kit.box('hull', hex, 0.14, 1.1, 0.14, 0, 0.45, 0);
        if (prev) this.rails(prev, p, hex);
        prev = p;
      }
    }
  }

  rails(a, b, hex) {
    this.kit.at(0, 0, 0, 0);
    for (const y of [0.45, 0.85]) this.kit.beam('hull', hex, [a.x, a.y + y, a.z], [b.x, b.y + y, b.z], 0.045, 4);
  }

  // Leafy or pine tree on the ground at a local point.
  tree(lx, lz, rng, scale = 1) {
    this.onGround(lx, lz);
    const s = scale * rng.range(0.8, 1.25), trunk = 1.6 * s, leaf = rng.pick(LEAF);
    this.kit.cyl('hull', 0x6b4a30, 0.14 * s, 0.22 * s, trunk + 0.4, 5, 0, -0.4, 0);
    if (rng.chance(0.35)) {
      for (let i = 0; i < 3; i++) this.kit.add('hull', new THREE.ConeGeometry((1.5 - i * 0.35) * s, 1.8 * s, 7), 0x2f5f35, 0, trunk + (0.6 + i * 1.1) * s, 0);
    } else {
      this.kit.add('hull', new THREE.IcosahedronGeometry(1.5 * s, 0), leaf, 0, trunk + 1.1 * s, 0);
      this.kit.add('hull', new THREE.IcosahedronGeometry(1 * s, 0), leaf, 0.7 * s, trunk + 1.9 * s, 0.3 * s);
    }
    this.zone(lx, lz, 2.5 * s);
  }

  // Street lamp at a local point; its head joins the night halos, its light pool the ground.
  lamp(lx, lz, hex = 0xffd08a) {
    const p = this.onGround(lx, lz);
    this.kit.cyl('hull', 0x3b424c, 0.07, 0.1, 3.2, 6, 0, -0.3, 0);
    this.kit.box('lamp', hex, 0.36, 0.3, 0.36, 0, 3.05, 0);
    this.kit.box('hull', 0x3b424c, 0.5, 0.08, 0.5, 0, 3.25, 0);
    this.drape('pool', flatDisc(3.2, 16).translate(lx, 0, lz), 0xffffff, 0.2);
    this.lampHeads.push(p.x, p.y + 3.05, p.z);
    return p;
  }

  // Merge everything -> [mesh] (one per material bucket).
  build(mats) { return Object.values(this.kit.build(mats)); }
}
