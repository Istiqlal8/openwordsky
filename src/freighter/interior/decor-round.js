// Signature props of the round hulls: the citadel's banners, buttresses, braziers and glass
// lift; the saucer's aquariums with circling fish, radial floor rings and panoramic bridge.
import * as THREE from 'three';
import { box, cyl, glow, signPlane } from '../kit.js';
import { makeCanvas, toTexture } from '../../assets/canvas.js';
import { desk, lockers, workbench, consoles } from '../interior-rooms.js';
import { chair } from '../interior-props.js';
import { aabb } from '../walkable.js';
import { bridgeFit, pillars, boxes, crates, strip } from './fit.js';

const Q = Math.PI / 2, U = 8;

// Tall cloth banner with the accent stripes and the ship's name written downwards.
function bannerTexture(ctx) {
  const c = makeCanvas(128, 512), g = c.getContext('2d'), col = `#${new THREE.Color(ctx.pal.fabric).getHexString()}`;
  const acc = `#${new THREE.Color(ctx.pal.accent).getHexString()}`;
  g.fillStyle = col; g.fillRect(0, 0, 128, 512);
  g.fillStyle = acc; g.fillRect(0, 0, 128, 24); g.fillRect(12, 0, 10, 512); g.fillRect(106, 0, 10, 512);
  g.fillStyle = ctx.pal.sign; g.font = 'bold 54px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.translate(64, 270); g.rotate(Q); g.fillText(ctx.S.name.toUpperCase().slice(0, 14), 0, 0); g.restore();
  g.beginPath(); g.moveTo(0, 512); g.lineTo(64, 460); g.lineTo(128, 512); g.fillStyle = '#000'; g.globalCompositeOperation = 'destination-out'; g.fill();
  const tex = toTexture(c);
  ctx.textures.push(tex);
  return tex;
}

function banners(ctx) {
  const tex = bannerTexture(ctx);
  for (const [x, z, r] of [[-19.7, -6, Q], [-19.7, 2, Q], [19.7, -6, -Q], [19.7, 2, -Q], [-9, 13.8, Math.PI], [9, 13.8, Math.PI]]) {
    const m = signPlane(tex, 3, 12);
    m.material.toneMapped = true;
    m.position.set(x, 19, z);
    m.rotation.y = r;
    ctx.g.add(m);
  }
}

// Glass lift shaft in the corner with a platform riding between the floor and the balcony.
function lift(ctx) {
  const { mats } = ctx, x = 17.5, z = 4;
  pillars(ctx, [[x - 1.6, z - 1.6], [x + 1.6, z - 1.6], [x - 1.6, z + 1.6], [x + 1.6, z + 1.6]], { w: 0.25, d: 0.25, h: 16, mat: mats.metal });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 16, 20, 1, true), mats.glass);
  tube.position.set(x, 8, z);
  tube.userData.keep = true;
  ctx.g.add(tube);
  ctx.blocks.push(aabb(x, z, 3.8, 3.8, 0, 30));
  const cab = new THREE.Group();
  cyl(cab, mats.trim, 1.5, 1.5, 0.3, 0, 0, 0, 20);
  cyl(cab, mats.warm, 1.55, 1.55, 0.05, 0, 0.16, 0, 20);
  cab.position.set(x, 0.2, z);
  ctx.dyn.add(cab);
  return { update(t) { cab.position.y = 0.2 + (U + 1) * (0.5 - 0.5 * Math.cos(t * 0.35)); } };
}

// Bronze braziers whose embers flicker.
function braziers(ctx) {
  const ember = glow(ctx.pal.warm, 2.5);
  for (const [x, z] of [[-16, -12], [16, -12], [-14, 5.5], [8, 11]]) {
    cyl(ctx.g, ctx.mats.metal, 0.7, 0.35, 1.1, x, 0.55, z, 12);
    cyl(ctx.g, ember, 0.6, 0.6, 0.1, x, 1.1, z, 12);
    ctx.blocks.push(aabb(x, z, 1.5, 1.5));
  }
  return { update(t) { ember.emissiveIntensity = 2.2 + Math.sin(t * 9) * 0.4 + Math.sin(t * 23) * 0.3; } };
}

export function decorateCitadel(ctx, rng) {
  const { mats } = ctx;
  banners(ctx);
  const butt = [];
  for (const z of [-10, -2, 6]) butt.push([-19.3, z], [19.3, z]);
  for (const x of [-14, 14]) butt.push([x, 13.3]);
  pillars(ctx, butt, { w: 1.4, d: 1.4, h: 28, mat: mats.dark });
  boxes(ctx, mats.warm, butt.map(([x, z]) => [0.12, 18, 0.12, x * 0.955, 13, z > 13 ? 12.6 : z]));
  pillars(ctx, [-10, -2, 6, 14].map((x) => [x, 8.3]), { w: 0.8, d: 0.8, h: U, mat: mats.metal });
  for (const x of [-10, -2, 6, 14]) ctx.blocks.push(aabb(x, 8.3, 0.9, 0.9));
  box(ctx.g, mats.trim, 36.5, 1, 0.3, 1.75, U + 0.5, 7.9);
  box(ctx.g, mats.metal, 36.5, 0.1, 0.1, 1.75, U + 1.1, 7.9);
  ctx.blocks.push({ x0: -16.5, x1: 20, z0: 7.7, z1: 8.2, y: U, h: 1.5 });
  box(ctx.g, mats.metal, 0.1, 0.1, 19, -16.5, 4.9, -0.5).rotation.x = -Math.atan2(U, 19);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.25, 6, 40), mats.metal);
  ring.rotation.x = Q; ring.position.set(0, 24, 0);
  ctx.g.add(ring);
  boxes(ctx, mats.warm, [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [0.5, 0.8, 0.5, Math.sin(k * Q / 2) * 6, 23.4, Math.cos(k * Q / 2) * 6]));
  crates(ctx, rng, [[-12, 11, 2, 1, 2], [14, -11, 2, 2, 2]]);
  bridgeFit(ctx, { zWin: 42, w: 16, n: 4, y: U });
  desk(ctx, { x: -7, z: 19, y: U });
  lockers(ctx, { x: -17.4, z: 21, rotY: Q, n: 3, y: U });
  workbench(ctx, { x: 8.5, z: 28.8, rotY: 0, y: U });
  return [lift(ctx), braziers(ctx)];
}

// Cylindrical fish tanks [[x, z, r, h, y]] and a school of fish circling in each.
function aquariums(ctx, tanks) {
  const { mats } = ctx, water = new THREE.MeshStandardMaterial({ color: 0x2aa8e0, emissive: 0x0a4a80, emissiveIntensity: 0.6,
    transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false });
  for (const [x, z, r, h, y = 0] of tanks) {
    cyl(ctx.g, mats.metal, r + 0.2, r + 0.25, 0.5, x, y + 0.25, z, 24);
    cyl(ctx.g, mats.metal, r + 0.2, r + 0.2, 0.3, x, y + h - 0.15, z, 24);
    const tank = cyl(ctx.g, water, r, r, h - 0.8, x, y + h / 2, z, 24);
    tank.userData.keep = true;
    cyl(ctx.g, glow(0x3fe0a0, 1.2), 0.1, 0.25, 1.2, x + r * 0.4, y + 1.1, z, 5);
    ctx.blocks.push(aabb(x, z, r * 2 + 0.5, r * 2 + 0.5, y));
  }
  const per = 9, N = tanks.length * per;
  const fish = new THREE.InstancedMesh(new THREE.ConeGeometry(0.12, 0.45, 5).rotateX(Q), new THREE.MeshStandardMaterial({ roughness: 0.4 }), N);
  for (let i = 0; i < N; i++) fish.setColorAt(i, new THREE.Color().setHSL([0.08, 0.13, 0.55, 0.95][i % 4], 0.9, 0.55));
  ctx.dyn.add(fish);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), Y = new THREE.Vector3(0, 1, 0);
  return { update(t) {
    for (let i = 0; i < N; i++) {
      const [x, z, r, h, y = 0] = tanks[Math.floor(i / per)], k = i % per, dir = k % 2 ? 1 : -1;
      const a = dir * t * (0.6 + k * 0.07) + k * 0.7, rr = r * (0.35 + 0.08 * k % 0.5);
      p.set(x + Math.sin(a) * rr, y + 0.9 + ((k * 0.61) % 1) * (h - 1.8) + Math.sin(t + k) * 0.15, z + Math.cos(a) * rr);
      fish.setMatrixAt(i, m.compose(p, q.setFromAxisAngle(Y, a + dir * Q), s));
    }
    fish.instanceMatrix.needsUpdate = true;
  } };
}

export function decorateSaucer(ctx) {
  const { mats } = ctx;
  for (const [r, mat] of [[9.5, mats.accentGlow], [15, mats.cool], [20.5, mats.accentGlow]]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 4, 96), mat);
    t.rotation.x = Q; t.position.y = 0.03;
    ctx.g.add(t);
  }
  for (let k = 0; k < 12; k++) {
    const a = k * Math.PI / 6;
    if (Math.abs(Math.cos(a) + 1) < 0.2) continue; // leave the door lane clear
    strip(ctx, mats.cool, Math.sin(a) * 10, Math.cos(a) * 10, Math.sin(a) * 20, Math.cos(a) * 20, 0.08);
  }
  boxes(ctx, mats.cool, Array.from({ length: 16 }, (_, k) => { const a = k * Math.PI / 8;
    return [2.2, 0.12, 0.5, Math.sin(a) * 21.4, 9.6, Math.cos(a) * 21.4, a]; }));
  const sky = new THREE.Mesh(new THREE.CircleGeometry(3.4, 32), mats.cool);
  sky.rotation.x = Q; sky.position.y = 22;
  ctx.g.add(sky);
  ctx.blocks.push({ x0: -10.5, x1: 10.5, z0: -23, z1: -19.6, y: 0, h: 4 });
  const pane = new THREE.Mesh(new THREE.CylinderGeometry(8.9, 8.9, 4, 16, 1, true, -0.9, 1.8), mats.glass);
  pane.position.set(0, 3, 38);
  pane.userData.keep = true;
  ctx.g.add(pane);
  consoles(ctx, { x: 0, z: 44.2, n: 2, gap: 3.6 });
  chair(ctx, ctx.g, 0, 40.8, 0, true);
  lockers(ctx, { x: -43.4, z: -2, rotY: Q, n: 3 });
  desk(ctx, { x: -34, z: -5.2, rotY: Math.PI });
  workbench(ctx, { x: 37, z: -5.8, rotY: Math.PI });
  return [aquariums(ctx, [[19.2, -4, 2, 7], [-19.2, -4, 2, 7], [-37, 0, 2.2, 4]])];
}
