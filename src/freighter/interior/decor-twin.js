// Signature props of the twin and ring hulls: the catamaran's glass walkway on pillars between
// two colour-coded bays, and the ring ship's domed garden with trees, pond and fireflies.
import * as THREE from 'three';
import { box, cyl, std, glow, instances } from '../kit.js';
import { desk, lockers, workbench } from '../interior-rooms.js';
import { aabb } from '../walkable.js';
import { bridgeFit, pillars, boxes, crates, tank, strip } from './fit.js';

const Q = Math.PI / 2;

function walkway(ctx) {
  const { mats } = ctx;
  for (const [x0, x1] of [[-32, -8], [8, 32]]) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.1), mats.glass);
    pane.position.set(cx, 6.65, 10.05);
    ctx.g.add(pane);
    box(ctx.g, mats.trim, w, 0.08, 0.12, cx, 7.2, 10.05);
    box(ctx.g, mats.dark, w, 0.35, 0.4, cx, 5.8, 10.1);
    box(ctx.g, mats.cool, w, 0.05, 0.05, cx, 5.6, 10.3);
    ctx.blocks.push({ x0, x1, z0: 9.8, z1: 10.3, y: 6, h: 1.5 });
  }
  const posts = [-28, -20, -12, 12, 20, 28].map((x) => [x, 10.3]);
  pillars(ctx, posts, { w: 0.5, d: 0.5, h: 5.8, mat: mats.metal });
  for (const [x, z] of posts) ctx.blocks.push(aabb(x, z, 0.6, 0.6));
  for (const s of [-1, 1]) {
    pillars(ctx, [-6, -2, 2, 6].map((z) => [s * 32.1, z]), { w: 0.3, d: 0.3, h: 1.2, y: 0, mat: mats.trim });
    box(ctx.g, mats.trim, 0.1, 0.1, 19, s * 32.1, 3.6, 1.2).rotation.x = -Math.atan2(6, 18.5);
  }
}

export function decorateCatamaran(ctx, rng) {
  const { mats } = ctx;
  walkway(ctx);
  strip(ctx, mats.warm, -22, -12, -22, -7, 0.2);
  strip(ctx, mats.accentGlow, 22, -12, 22, -7, 0.2);
  strip(ctx, mats.warm, -30, 8.5, -10, 8.5);
  strip(ctx, mats.accentGlow, 10, 8.5, 30, 8.5);
  pillars(ctx, [-8.4, 8.4].flatMap((x) => [[x, -12], [x, -4], [x, 2]]), { w: 0.6, d: 1, h: 14, mat: mats.trim });
  crates(ctx, rng, [[-30, -11, 2, 2, 2], [30, 6, 2, 2, 3], [14, -11, 2, 2, 1]]);
  tank(ctx, -11, 7.5, 1, 3, mats.trim);
  tank(ctx, 11, -1, 1, 3, mats.orange);
  bridgeFit(ctx, { zWin: 28, w: 13, n: 3, y: 6 });
  desk(ctx, { x: -17, z: 25.2, rotY: Math.PI });
  lockers(ctx, { x: -29.4, z: 18, rotY: Q, n: 3 });
  workbench(ctx, { x: 17.5, z: 25 });
  return [];
}

function tree(trunks, crowns, x, z, s) {
  trunks.push([x, 0.6 + 1.6 * s, z, 0, s, s, s]);
  crowns.push([x, 0.6 + 3.6 * s, z, x, 1.5 * s, 1.3 * s, 1.5 * s], [x + 0.6 * s, 0.6 + 2.9 * s, z + 0.4 * s, z, 1.1 * s, 1 * s, 1.1 * s]);
}

// Four raised beds with trees under the dome.
function beds(ctx, rng, C, grass) {
  const { mats, g } = ctx, trunks = [], crowns = [];
  for (let k = 0; k < 4; k++) {
    const a = Q / 2 + k * Q, x = Math.sin(a) * 8, z = C + Math.cos(a) * 8;
    cyl(g, mats.dark, 3, 3.1, 0.6, x, 0.3, z, 24);
    cyl(g, grass, 2.85, 2.85, 0.05, x, 0.62, z, 24);
    tree(trunks, crowns, x, z, rng.range(0.9, 1.3));
    ctx.blocks.push(aabb(x, z, 5.6, 5.6));
  }
  instances(g, new THREE.CylinderGeometry(0.18, 0.28, 3.2, 8), std({ color: 0x6a4a30, roughness: 0.9 }), trunks);
  const leaf = instances(g, new THREE.IcosahedronGeometry(1, 1), std({ color: 0xffffff, roughness: 0.8, flatShading: true }),
    crowns.map(([x, y, z, , sx, sy, sz]) => [x, y, z, rng.range(0, 3), sx, sy, sz]));
  crowns.forEach((_, i) => leaf.setColorAt(i, new THREE.Color().setHSL(0.25 + rng.range(0, 0.1), 0.55, rng.range(0.28, 0.4))));
}

// Flowers along the wall (entrances kept clear) and a pond with a fountain in the middle.
function flowersAndPond(ctx, rng, C) {
  const { mats, g } = ctx, flowers = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    if (Math.abs(Math.sin(2 * a)) < 0.3) continue;
    flowers.push([Math.sin(a) * 14, 0.35, C + Math.cos(a) * 14, a, 0.6, 0.5, 0.6]);
  }
  const bloom = instances(g, new THREE.SphereGeometry(0.7, 8, 6), std({ color: 0xffffff, roughness: 0.8 }), flowers);
  flowers.forEach((_, i) => bloom.setColorAt(i, new THREE.Color().setHSL(rng.pick([0.95, 0.12, 0.8, 0.02]), 0.7, 0.6)));
  cyl(g, mats.metal, 2.3, 2.4, 0.5, 0, 0.25, C, 32);
  cyl(g, glow(0x3fa8d8, 0.6), 2.1, 2.1, 0.05, 0, 0.48, C, 32);
  cyl(g, mats.metal, 0.15, 0.2, 1.6, 0, 0.8, C, 8);
  ctx.blocks.push(aabb(0, C, 4.8, 4.8));
}

// Lawn with crossing paths, beds, flowers, pond, grow-light ring and dome ribs.
function garden(ctx, rng, C) {
  const { mats, g } = ctx, grass = std({ color: 0x4f8a3a, roughness: 0.95, metalness: 0 });
  cyl(g, grass, 14.6, 14.6, 0.04, 0, 0.02, C, 48);
  box(g, mats.floor, 3, 0.06, 29, 0, 0.04, C);
  box(g, mats.floor, 29, 0.06, 3, 0, 0.04, C);
  beds(ctx, rng, C, grass);
  flowersAndPond(ctx, rng, C);
  const grow = new THREE.Mesh(new THREE.TorusGeometry(11, 0.12, 6, 64), mats.warm);
  grow.rotation.x = Q;
  grow.position.set(0, 8.2, C);
  g.add(grow);
  instances(g, new THREE.TorusGeometry(15, 0.14, 4, 40, Math.PI), mats.metal, [0, 1, 2, 3].map((k) => [0, 5, C, k * Q / 2, 1, 0.45, 1]));
}

// Glowing fireflies drifting in loops over the garden.
function fireflies(ctx, C) {
  const N = 24, inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 4), glow(0xfff29a, 3), N);
  ctx.dyn.add(inst);
  const m = new THREE.Matrix4();
  return { update(t) {
    for (let i = 0; i < N; i++) {
      const a = t * (0.15 + (i % 5) * 0.03) + i * 1.7, r = 3 + (i % 7) * 1.4;
      inst.setMatrixAt(i, m.makeTranslation(Math.sin(a) * r, 1.2 + (i % 4) * 0.9 + Math.sin(t * 1.3 + i) * 0.4, C + Math.cos(a * 1.1) * r));
    }
    inst.instanceMatrix.needsUpdate = true;
  } };
}

export function decorateRing(ctx, rng) {
  const { mats } = ctx, C = 32;
  garden(ctx, rng, C);
  const lamps = [];
  for (let i = 0; i < 18; i++) {
    const t = (i / 18) * Math.PI * 2;
    lamps.push([2.4, 0.1, 0.6, Math.sin(t) * 17.25, 3.92, C + Math.cos(t) * 17.25, t]);
  }
  boxes(ctx, mats.cool, lamps);
  const band = new THREE.Mesh(new THREE.TorusGeometry(19.35, 0.05, 4, 96), mats.accentGlow);
  band.rotation.x = Q;
  band.position.set(0, 1, C);
  ctx.g.add(band);
  pillars(ctx, [-21.5, 21.5].flatMap((x) => [[x, -10], [x, -2], [x, 6]]), { w: 0.8, d: 1, h: 12, mat: mats.trim });
  crates(ctx, rng, [[-19, 8, 2, 1, 2], [18, -11, 2, 2, 2]]);
  bridgeFit(ctx, { zWin: 63.6, w: 14, n: 3 });
  desk(ctx, { x: -27, z: 26.8 });
  lockers(ctx, { x: -32.4, z: 29, rotY: Q, n: 2 });
  workbench(ctx, { x: 25, z: 37 });
  return [fireflies(ctx, C)];
}
