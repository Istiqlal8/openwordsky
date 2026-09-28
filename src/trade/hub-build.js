// Builds the static trade hub city: picks an orientation that keeps the player's parked ship
// on a landing pad, then merges streets, tower, lots, pads, cargo yards and lamps.
import * as THREE from 'three';
import { Builder } from '../villages/builder.js';
import { Frame } from '../base/site.js';
import { makeMaterials } from '../villages/materials.js';
import { HUB, planHub } from './hub-plan.js';
import { streets, tower, shopBuilding, stall, pad, cargoYard } from './hub-parts.js';

// Frame (rotated by yaw) whose local pad point p lands on the player's parked ship.
function frameFor(ship, p, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return new Frame(ship.x - (p.x * c + p.z * s), ship.z - (-p.x * s + p.z * c), yaw);
}

// Lower is better: height spread over key plan points plus a penalty for water.
function score(h, planet, plan, frame) {
  const t = planet.terrain, pts = [{ x: 0, z: 0 }, ...plan.pads, ...plan.lots.filter((l, i) => i % 4 === 0)];
  let lo = Infinity, hi = -Infinity, wet = 0;
  for (const p of pts) {
    const y = h(frame.x(p.x, p.z), frame.z(p.x, p.z));
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
    if (t.hasWater && y < t.waterY + 0.5) wet++;
  }
  return hi - lo + wet * 25;
}

// Try every pad as the player's pad and 12 headings; keep the driest, flattest layout.
export function chooseFrame(h, planet, plan, ship) {
  let best = null, bestScore = Infinity;
  for (const p of plan.pads) {
    for (let k = 0; k < 12; k++) {
      const f = frameFor(ship, p, (k / 12) * Math.PI * 2), s = score(h, planet, plan, f);
      if (s < bestScore) { best = { f, p }; bestScore = s; }
    }
  }
  for (const p of plan.pads) p.player = p === best.p;
  return best.f;
}

const wetAt = (h, planet, b, l) => planet.terrain.hasWater && b.groundAt(l.x, l.z) < planet.terrain.waterY + 0.4;

// Hub name board between the player's pad and the plaza, facing the pad.
function welcomeBoard(b, signs, p) {
  const d = Math.hypot(p.x, p.z), k = (d - 16) / d;
  b.place(p.x * k, p.z * k, Math.atan2(p.x, p.z), 1);
  b.colliders.pop();
  for (const x of [-6.4, 6.4]) b.kit.box('hull', 0x3b424c, 0.4, 6, 0.4, x, 1.5, 0);
  b.kit.box('hull', 0x10131a, 13, 3.4, 0.3, 0, 4.4, 0);
  signs.add(b.kit, 'name', 12.4, 0, 4.4, 0.17);
  signs.add(b.kit, 'name', 12.4, 0, 4.4, -0.17, Math.PI);
}

// -> { frame, plan, meshes, mats, colliders, vendors: [{ lot, spot }], pads: [world top], lampHeads, center }
export function buildHub(scene, h, planet, ship, rng, signs) {
  const plan = planHub(rng), frame = chooseFrame(h, planet, plan, ship);
  const b = new Builder({ x: frame.cx, z: frame.cz, yaw: frame.yaw }, h, planet);
  streets(b, plan);
  const center = tower(b, signs);
  welcomeBoard(b, signs, plan.pads.find((p) => p.player));
  const pads = [];
  for (const p of plan.pads) {
    if (p.player) b.disc(p.x, p.z, HUB.padR, 0x2c313a, 0.16, 32);
    else pads.push(pad(b, p));
  }
  const vendors = [];
  for (const lot of plan.lots) {
    if (wetAt(h, planet, b, lot)) continue;
    if (lot.kind === 'stall') { stall(b, lot, rng); continue; }
    const spot = shopBuilding(b, signs, lot, rng);
    if (spot) vendors.push({ lot, spot });
  }
  for (const yard of plan.cargo) cargoYard(b, yard, rng);
  for (const l of plan.lamps) if (!wetAt(h, planet, b, l)) b.lamp(l.x, l.z, 0xffe0a0);
  const mats = makeMaterials(signs.texture);
  mats.neon = new THREE.MeshBasicMaterial({ vertexColors: true });
  const meshes = b.build(mats);
  for (const m of meshes) scene.add(m);
  return { frame, plan, meshes, mats, colliders: b.colliders, vendors, pads, lampHeads: b.lampHeads, center };
}
