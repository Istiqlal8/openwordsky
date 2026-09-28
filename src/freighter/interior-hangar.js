// Hangar bay props: landing pads with parked ships, crates, fuel tanks, a gantry crane,
// floor markings, the space-door frame and lights.
import * as THREE from 'three';
import { buildShip } from '../view/ship/ship-model.js';
import { shipDesign } from '../view/ship/ship-design.js';
import { box, cyl } from './kit.js';
import { sign, terminal, crateStack, ceilingLights } from './interior-props.js';
import { SPACE_DOOR } from './interior-shell.js';

export const PLAYER_PAD = { x: 0, z: 0, r: 6.5 };
const NPC_PADS = [{ x: -18, z: -3, r: 6, rot: 0.35 }, { x: 18, z: -3, r: 6, rot: -0.3 }];
const PAD_H = 0.2;

function pad(ctx, g, { x, z, r }) {
  const { mats } = ctx;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.3, PAD_H, 40), [mats.dark, mats.pad, mats.dark]);
  m.position.set(x, PAD_H / 2, z);
  g.add(m);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.15, 0.06, 6, 48), mats.cool);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, PAD_H + 0.02, z);
  g.add(ring);
}

// Parks a ship model on a pad; its footprint becomes solid. Returns the model.
function park(ctx, g, design, p, rotY) {
  const model = buildShip(design);
  model.setLegs(true);
  model.setThrust(0);
  model.group.position.set(p.x, PAD_H + model.groundOffset - 0.05, p.z);
  model.group.rotation.y = rotY;
  g.add(model.group);
  model.group.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(model.group);
  ctx.blocks.push({ x0: b.min.x + 0.4, x1: b.max.x - 0.4, z0: b.min.z + 0.4, z1: b.max.z - 0.4 });
  model.box = b;
  return model;
}

function markings(ctx, g) {
  const { mats } = ctx, D = SPACE_DOOR;
  box(g, mats.hazard, D.x1 - D.x0, 0.03, 1.2, 0, 0.015, D.z + 0.9);
  for (const x of [0, ...NPC_PADS.map((p) => p.x)]) box(g, mats.warm, 0.18, 0.03, 7, x, 0.015, D.z + 5);
  box(g, mats.orange, 56, 0.03, 0.15, 0, 0.015, 12.2);
  for (const [x, z] of [[D.x0, 0], [D.x1, 0]]) box(g, mats.cool, 0.4, D.h, 0.4, x, D.h / 2, D.z + 0.3 + z);
  box(g, mats.cool, D.x1 - D.x0, 0.4, 0.4, 0, D.h, D.z + 0.3);
}

function structure(ctx, g) {
  const { mats } = ctx;
  for (const z of [-12, -6, 0, 6, 12]) for (const s of [-1, 1]) {
    box(g, mats.metal, 1, 16, 1, s * 29.4, 8, z);
    box(g, mats.cool, 0.1, 9, 0.25, s * 28.85, 6, z);
  }
  for (const x of [-24, -16, -8, 8, 16, 24]) box(g, mats.metal, 1, 16, 0.8, x, 8, 14.5);
  for (const z of [-9, 11]) box(g, mats.dark, 58, 0.6, 0.8, 0, 14.6, z); // crane rails
  const spots = [];
  for (let x = -24; x <= 24; x += 8) for (let z = -10; z <= 10; z += 5) spots.push([x, z]);
  ceilingLights(ctx, g, spots, 15.8, 4, 0.8);
}

// Gantry crane: a bridge beam rolling along the rails with a trolley and a hanging container.
function crane(ctx, g) {
  const { mats } = ctx;
  const bridge = new THREE.Group();
  box(bridge, mats.orange, 1.2, 1, 21, 0, 14, 1);
  const trolley = new THREE.Group();
  box(trolley, mats.dark, 2, 0.8, 2, 0, 13.3, 0);
  cyl(trolley, mats.metal, 0.05, 0.05, 3.4, 0, 11.3, 0, 6);
  box(trolley, mats.crate, 2.4, 2.4, 5.5, 0, 8.4, 0).material = mats.trim;
  box(trolley, mats.red, 0.2, 0.2, 0.2, 0, 12.8, 1.05);
  bridge.add(trolley);
  g.add(bridge);
  return { bridge, trolley };
}

function clutter(ctx, g, rng) {
  crateStack(ctx, g, rng, -26, 8, 2, 3, 3);
  crateStack(ctx, g, rng, -26, -9, 2, 2, 2);
  crateStack(ctx, g, rng, 26, 9, 2, 3, 2);
  crateStack(ctx, g, rng, -11, 12.4, 3, 1, 2);
  crateStack(ctx, g, rng, 12, 12.4, 2, 1, 3);
  for (const z of [-11, -7.5]) {
    cyl(g, ctx.mats.metal, 1.1, 1.1, 3.2, 26.5, 1.6, z, 20);
    cyl(g, ctx.mats.orange, 1.12, 1.12, 0.3, 26.5, 2.4, z, 20);
    ctx.blocks.push({ x0: 25.3, x1: 27.7, z0: z - 1.2, z1: z + 1.2 });
  }
}

// Returns { playerShip, npcShips, crane }.
export function buildHangar(ctx, g, design, rng) {
  for (const p of [PLAYER_PAD, ...NPC_PADS]) pad(ctx, g, p);
  const playerShip = park(ctx, g, design, PLAYER_PAD, 0);
  const npcShips = NPC_PADS.map((p) => park(ctx, g, shipDesign(rng.int(1e9)), p, p.rot));
  markings(ctx, g);
  structure(ctx, g);
  clutter(ctx, g, rng);
  sign(ctx, g, 'HANGAR', 0, 10.5, 14.2, Math.PI, 10);
  sign(ctx, g, 'HANGAR', 0, 3.55, 16.3, 0, 2.6);
  terminal(ctx, g, { x: 8.5, z: 9, rotY: -Math.PI / 2, label: 'Hangar', action: 'hangar' });
  return { playerShip, npcShips, crane: crane(ctx, g) };
}
