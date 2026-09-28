// Spec -> capital-ship model, built with exactly the same parts the seeded NPC freighters use
// (freighter-hulls-*.js + freighter-details.js). The yard preview and the game both call this,
// so what the player designs is literally what gets parked in the system.
import * as THREE from 'three';
import { Rng } from '../core/rng.js';
import { Parts } from '../freighter/freighter-parts.js';
import { boundOf } from '../freighter/freighter-collide.js';
import { freighterMaterials } from '../freighter/freighter-model.js';
import { nozzle, mast, dish } from '../freighter/freighter-details.js';
import { classic, hammerhead } from '../freighter/freighter-hulls-long.js';
import { catamaran, ringShip } from '../freighter/freighter-hulls-twin.js';
import { citadel, saucer } from '../freighter/freighter-hulls-round.js';
import { whale, cruiser } from '../freighter/freighter-hulls-war.js';
import { normalizeSpec, specSeed, ARCHETYPE_LABELS } from './fleet-spec.js';

const ARCH = { classic, hammerhead, catamaran, ring: ringShip, citadel, saucer, whale, cruiser };
const DOWN_ENGINES = new Set(['citadel']);   // archetypes whose exhausts point -Y
const CRATE_TINTS = [0xb8452e, 0x2f6fa8, 0xd9a13a, 0x4d8a4a, 0x8a8f99];
const _v = new THREE.Vector3();

const hexNum = (css) => parseInt(css.slice(1), 16);

// Repaint the seeded palette with the player's three colours.
function tint(mats, s) {
  const hull = new THREE.Color(hexNum(s.hull)), accent = new THREE.Color(hexNum(s.accent)), glow = hexNum(s.glow);
  mats.hull.color.copy(hull);
  mats.hull.emissive.copy(hull).multiplyScalar(0.3);
  mats.plate.color.copy(hull).multiplyScalar(0.72);
  mats.plate.emissive.copy(hull).multiplyScalar(0.12);
  mats.dark.color.copy(hull).multiplyScalar(0.26);
  mats.dark.emissive.copy(hull).multiplyScalar(0.08);
  mats.accent.color.copy(accent);
  mats.accent.emissive.copy(accent);
  mats.window.emissive.setHex(glow);
  mats.bio.emissive.setHex(glow);
  mats.engine.emissive.setHex(glow);
  mats.engineHex = glow;
}

// Slim bridge fitted over the hangar mouth's roof lip, the one spot every archetype leaves open.
function bridge(p, s, b) {
  const x = b.x - 1, y = b.y + b.H / 2, z = b.z;
  if (s.bridgeStyle === 'datar') {
    p.block('plate', 14, 5, 22, x, y + 2.5, z);
    p.box('window', 13, 1.6, 0.5, x, y + 3.4, z - 11.2);
    dish(p, x, y + 5.5, z + 7, 5);
    return 12;
  }
  p.block('plate', 15, 12, 18, x, y + 6, z);
  if (s.bridgeStyle === 'kubah') {
    p.add('window', new THREE.SphereGeometry(8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), x, y + 12, z, null, [1, 0.72, 1]);
    return 24;
  }
  p.box('window', 14, 2.2, 0.5, x, y + 9, z - 9.2);
  const tip = mast(p, x, y + 12, z, 26);
  p.light(...tip, 0xffffff, 'strobe');
  return 42;
}

// Mast/antenna cluster along the bay roof, worked outward from the ends so the bridge stays clear.
function masts(p, s, b) {
  let top = 0;
  for (let i = 0; i < s.towers; i++) {
    const t = (i % 2 ? 1 : -1) * (0.44 - 0.18 * Math.floor(i / 2)), h = 16 + i * 4;
    const tip = mast(p, b.x - 2, b.y + b.H / 2, b.z + t * b.len, h);
    p.light(...tip, i % 2 ? 0xff5040 : 0xffb040, 'pulse');
    top = Math.max(top, h + 4);
  }
  return top;
}

// Container racks stacked on the bay roof, one row per cargo step.
function racks(p, rng, s, b) {
  if (!s.cargo) return 0;
  const y = b.y + b.H / 2;
  for (let z = b.z0 + 8; z < b.z1 - 8; z += 16) {
    if (Math.abs(z - b.z) < 14) continue;   // leave the bridge's bay clear
    for (let r = 0; r < s.cargo; r++) {
      if (r && rng.chance(0.25)) continue;
      p.instance('box', 'crate', b.x - 2, y + 3.2 + r * 6.2, z, 11, 6, 15, rng.pick(CRATE_TINTS));
    }
  }
  return s.cargo * 6.2 + 4;
}

// Extra thrusters ringed around the archetype's own exhaust cluster.
function engines(p, s, archetype) {
  if (!s.engines || !p.cores.length) return;
  const cores = p.cores.slice(), down = DOWN_ENGINES.has(archetype);
  _v.set(0, 0, 0);
  for (const c of cores) _v.add(c.p);
  _v.divideScalar(cores.length);
  const r = Math.max(4, (cores.reduce((a, c) => a + c.r, 0) / cores.length) * 0.75);
  const spread = Math.max(20, r * 3.4);
  for (let i = 0; i < s.engines; i++) {
    const a = (i / s.engines) * Math.PI * 2 + 0.4, cx = Math.cos(a) * spread, cy = Math.sin(a) * spread;
    if (down) nozzle(p, _v.x + cx, _v.y + 26, _v.z + cy, r * 0.7, r * 2.2, '-y');
    else nozzle(p, _v.x + cx, _v.y + cy, _v.z - 10, r * 0.7, r * 2.2);
  }
}

// Same descriptor shape as buildFreighterModel(), plus `owned`, `spec` and `size`.
export function buildSpecFreighter(spec) {
  const s = normalizeSpec(spec), arch = ARCH[s.archetype], rng = new Rng(specSeed(s));
  const mats = freighterMaterials(rng, arch.organic);
  tint(mats, s);
  const p = new Parts();
  const out = arch.build(p, rng, mats);
  const b = out.bay.spec;
  const extra = Math.max(bridge(p, s, b), masts(p, s, b), racks(p, rng, s, b));
  engines(p, s, s.archetype);
  const group = p.build(mats);
  group.name = 'freighter';
  for (const sp of out.spinners ?? []) group.add(sp.obj);
  return {
    group, mats, bay: out.bay, spinners: out.spinners ?? [],
    top: Math.max(out.top, b.y + b.H / 2 + extra + 12),
    engineCores: p.cores, lights: p.lights, solids: p.solids, holes: p.holes, bound: boundOf(p.solids) + 8,
    name: s.name, archetype: s.archetype, engineHex: mats.engineHex,
    owned: true, spec: s, size: s.size, title: ARCHETYPE_LABELS[s.archetype],
  };
}
