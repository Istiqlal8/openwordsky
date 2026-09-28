// Humanoid mecha design derived from the player's ship design (pure data, no three.js).
// Every ship yields one deterministic mech: hull colours, wings, engines, cockpit and class
// all carry over, so the pilot recognises their own ship in the robot.
import { Rng, hash32 } from '../core/rng.js';

// Per class: height in metres and the proportion multipliers that shape the build.
const BUILD = {
  fighter: { H: 14, chest: 0.92, pad: 1.0, leg: 1.08, arm: 1.0, waist: 0.9, head: 0.95, crest: 'v' },
  explorer: { H: 16, chest: 1.0, pad: 1.05, leg: 1.0, arm: 1.0, waist: 1.0, head: 1.14, crest: 'sensor' },
  hauler: { H: 19.5, chest: 1.32, pad: 1.55, leg: 0.9, arm: 1.22, waist: 1.18, head: 0.88, crest: 'horn' },
  exotic: { H: 17, chest: 0.9, pad: 1.18, leg: 1.04, arm: 1.3, waist: 0.72, head: 1.0, crest: 'halo' },
};

const LABEL = { fighter: 'Rangka Petarung', explorer: 'Rangka Penjelajah', hauler: 'Rangka Pengangkut', exotic: 'Rangka Eksotis' };

// Skeleton as ratios first, then scaled so the top of the head lands exactly on H metres.
function skeleton(H, b) {
  const s = {
    footH: 0.05, footL: 0.135, footW: 0.052 * b.leg,
    shinL: 0.205 * b.leg, thighL: 0.225 * b.leg, pelvisH: 0.075, chestH: 0.202,
    chestW: 0.104 * b.chest, chestD: 0.072 * b.chest,
    waistW: 0.062 * b.waist, hipW: 0.118 * b.waist,
    shoulderX: 0.148 + 0.03 * b.chest, padR: 0.064 * b.pad,
    upperL: 0.17 * b.arm, foreL: 0.155 * b.arm, handL: 0.05,
    armR: 0.036 * b.arm * (b.chest > 1.2 ? 1.25 : 1),
    headR: 0.058 * b.head, neckL: 0.03,
  };
  s.hipY = s.footH + s.shinL + s.thighL;
  s.torsoY = s.hipY + s.pelvisH * 0.55;           // torso origin above the hip pivot
  s.shoulderY = s.torsoY + s.chestH * 0.75;
  const k = H / (s.torsoY + s.chestH + s.neckL + s.headR * 2);
  for (const key of Object.keys(s)) s[key] *= k;
  s.H = H;
  return s;
}

// Backpack and calf thrusters inherited from the ship's engine nozzles.
function thrusters(p, H) {
  const mounts = p.engines ?? [];
  const r = mounts.length ? Math.max(...mounts.map((m) => m.r)) : 0.45;
  const n = Math.max(2, Math.min(4, mounts.length + (p.nacelles ? 2 : 0)));
  return { count: n % 2 ? n + 1 : n, r: 0.052 * H * (0.7 + r), big: Boolean(p.nacelles), len: 0.11 * H * (p.engineLen ?? 1.3) / 1.4 };
}

// Shoulder / backpack binders cut from the ship's wing planform.
function binders(p, H) {
  const w = p.wings;
  if (!w || !w.pairs || w.shape === 'none') return null;
  return { shape: w.shape, span: Math.min(0.42 * H, 0.055 * H + w.span * 0.42 * (H / 14)),
    chord: 0.1 * H * (w.chord / 3), pairs: w.pairs, sweep: w.sweep, dihedral: w.dihedral };
}

export function mechDesign(design) {
  const p = design.parts, cls = BUILD[design.cls] ? design.cls : 'fighter';
  const b = BUILD[cls];
  const rng = new Rng(hash32(design.seed >>> 0, 0x6d3c));
  const H = b.H * (0.92 + (p.length / 8) * 0.16);
  return {
    key: `${design.seed}:${design.name}`, name: design.name, label: LABEL[cls], cls,
    palette: design.palette, stats: design.stats, d: skeleton(H, b), crest: b.crest,
    thrust: thrusters(p, H), binder: binders(p, H),
    armor: Math.min(4, p.cargo ?? 0), fins: p.fins ?? 0, spikes: Math.min(4, p.spikes ?? 0),
    ring: Boolean(p.ring), antenna: Boolean(p.antenna), dish: Boolean(p.dish),
    visor: (p.canopy?.size ?? 1) * (cls === 'explorer' ? 1.15 : 1),
    stripe: p.decal === 'stripe', skirt: cls === 'hauler' ? 6 : 4,
    hue: rng.next(), legFin: rng.chance(0.5) || cls === 'exotic',
  };
}
