// Body plan: deterministic proportions (torso, legs, neck, head, tail) derived from species genes.
import { Rng } from '../../../core/rng.js';
import { skinKind } from './skin.js';

// len, rh (height radius), rw (width radius), cross-section exponent, chest, hip, waist bumps
const BODY = {
  bulat: [0.95, 0.4, 0.38, 2, 0.12, 0.1, 0.04], lonjong: [1.5, 0.27, 0.25, 2, 0.22, 0.14, 0.14],
  pipih: [1.25, 0.2, 0.34, 2.4, 0.1, 0.1, 0.06], segmen: [1.35, 0.27, 0.27, 2, 0, 0, 0],
  'bola-ganda': [1.35, 0.35, 0.32, 2, 0.35, 0.3, 0.4], kubus: [1.25, 0.37, 0.35, 3.4, 0.1, 0.06, 0.02],
  tong: [1.35, 0.35, 0.35, 2.7, 0.04, 0.04, 0], ular: [1, 0.2, 0.2, 2, 0, 0, 0],
};

const legKind = (g) => (g.legs >= 6 ? 'insect' : g.legs === 4 ? 'quad' : g.legs === 2 ? 'biped' : 'none');

function quadLegs(p, rng) {
  const g = p.g, hop = g.move === 'lompat';
  p.H = (0.42 + 0.3 * g.stretch) * rng.range(0.85, 1.2) * (g.body === 'pipih' ? 0.6 : 1) * (p.heavy ? 0.9 : 1);
  const digi = hop || (!p.heavy && rng.chance(0.65));
  const r = Math.min(p.rh, p.rw) * rng.range(0.36, 0.46) * (p.heavy ? 1.3 : 1);
  const foot = p.heavy ? 'pad' : p.skin === 'fur' && rng.chance(0.5) ? 'hoof' : 'paw';
  const x = p.len * 0.3, z = p.rw * 0.62;
  p.legs = [];
  for (const front of [1, 0]) {
    for (const side of [-1, 1]) {
      const hind = !front;
      const l3 = hind && digi ? (hop ? 0.42 : 0.3) : p.heavy ? 0.08 : 0.2;
      p.legs.push({ x: front ? x : -x, y: -p.rh * 0.2, z: side * z, side, front, H: p.H, l3: p.H * l3,
        gamma: hind && digi ? (hop ? 0.55 : 0.32) : 0, bend: hind ? 1 : -1, r: r * (front ? 0.85 : 1.05),
        slack: hind && hop ? 1.35 : 1.1, foot: hind && hop ? 'long' : foot });
    }
  }
}

function bipedLegs(p, rng) {
  const g = p.g, fly = g.move === 'terbang' || g.move === 'melayang';
  p.H = fly ? 0.28 : (0.45 + 0.28 * g.stretch) * rng.range(0.85, 1.15);
  const hop = g.move === 'lompat', r = Math.min(p.rh, p.rw) * (hop ? 0.5 : 0.4);
  p.legs = [-1, 1].map((side) => ({ x: -p.len * 0.08, y: -p.rh * 0.25, z: side * p.rw * 0.55, side, front: 0, H: p.H,
    l3: p.H * (hop ? 0.4 : 0.26), gamma: hop ? 0.6 : 0.35, bend: 1, r, slack: hop ? 1.3 : 1.12,
    foot: hop ? 'long' : rng.chance(0.6) ? 'talon' : 'paw' }));
}

function insectLegs(p, rng) {
  const g = p.g, n = g.legs / 2, crawl = g.move === 'merayap';
  p.H = crawl ? 0.2 : 0.36;
  const reach = p.rw + (0.35 + 0.15 * g.stretch) * (crawl ? 1.2 : 1);
  p.legs = [];
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0.5 : i / (n - 1);
    for (const side of [-1, 1]) {
      p.legs.push({ x: p.len * (0.28 - 0.5 * k), y: -p.rh * 0.1, z: side * p.rw * 0.7, side, front: i === 0 ? 1 : 0, pair: i,
        H: p.H, l3: 0.12, gamma: 0.45, bend: 1, r: 0.045 * rng.range(0.9, 1.3), slack: 1.5, foot: 'claw',
        insect: 1, fan: (0.5 - k) * 1.3, reach: reach * (i === 0 || i === n - 1 ? 1.05 : 1) });
    }
  }
}

function neckPlan(p, rng) {
  const g = p.g, long = (g.body === 'lonjong' || g.body === 'tong' || g.stretch > 1.4) && rng.chance(0.3);
  const k = p.kind === 'insect' ? 0.25 : long ? rng.range(2.4, 3.6) : rng.range(0.8, 1.35);
  p.neck = { len: 0.26 * k * (0.7 + 0.3 * g.stretch), angle: p.kind === 'biped' ? rng.range(0.8, 1.15)
    : long ? rng.range(0.75, 1.0) : rng.range(0.25, 0.6), r0: Math.min(p.rh, p.rw) * (long ? 0.45 : 0.55), x: p.len * 0.38, y: p.rh * 0.25 };
}

function headPlan(p, rng) {
  const g = p.g, snout = g.features?.includes('moncong');
  const hs = 0.25 * rng.range(0.85, 1.25) * (g.heads === 2 ? 0.85 : 1) * (0.75 + 0.25 * (p.rh / 0.35));
  const style = ['curved', 'straight', 'antler', 'nasal'][rng.int(4)];
  p.head = { hs, muzzle: snout ? rng.range(0.9, 1.4) : p.kind === 'insect' ? 0.2 : rng.range(0.3, 0.8),
    dome: rng.range(0.85, 1.15), forward: rng.chance(0.35), iris: rng.pick([0xc08a2a, 0x5a3a1e, 0xd4b030, 0x7a9a30, 0xa03020]),
    ears: g.features?.includes('telinga') ? 'big' : p.skin === 'fur' ? rng.pick(['point', 'point', 'round', 'none']) : 'none',
    horn: g.horns === 1 ? 'nasal' : style === 'nasal' ? 'curved' : style, fangs: rng.chance(0.3),
    hornColor: rng.pick([0xe0d2b0, 0x3a3029, 0x8a7a66]) };
}

function tailPlan(p, rng) {
  const g = p.g, t = g.tail, biped = p.kind === 'biped';
  const n = t === 'none' ? 0 : t === 'short' ? 3 : t === 'club' ? 5 : 6;
  const len = p.len * (t === 'short' ? 0.35 : t === 'club' ? 0.75 : biped ? 1.1 : 0.85) * rng.range(0.85, 1.2);
  const r0 = Math.min(p.rh, p.rw) * (biped || g.body === 'pipih' ? 0.55 : 0.36);
  p.tail = { n, len, r0, droop: biped ? 0.02 : g.body === 'pipih' ? -0.04 : -0.18, x: -p.len * 0.44, y: p.rh * 0.2 };
}

function bodyHeight(p) {
  const g = p.g;
  if (p.serpent) return p.rh * 0.95;
  if (p.kind === 'none') return p.rh + (g.move === 'melayang' || g.move === 'terbang' ? 0.3 : 0);
  return p.H - (p.legs[0]?.y ?? 0);
}

export function makePlan(g) {
  const rng = new Rng((g.seed ?? 1) ^ 0xa7a7);
  const [len0, rh0, rw0, exp, chest, hip, waist] = BODY[g.body] ?? BODY.bulat;
  const girth = rng.range(0.85, 1.2), fly = g.move === 'terbang';
  const p = { g, kind: legKind(g), skin: skinKind(g), serpent: g.body === 'ular' || (g.legs === 0 && g.move === 'merayap'),
    len: len0 * (0.55 + 0.45 * g.stretch) * (fly ? 0.75 : 1), rh: rh0 * girth, rw: rw0 * girth, exp, chest, hip, waist,
    ripple: g.body === 'segmen' ? 0.1 : 0, arch: rng.range(-0.02, 0.05), withers: rng.range(0, 0.07), legs: [], H: 0 };
  p.heavy = ['kubus', 'tong', 'bulat'].includes(g.body) && rng.chance(0.6);
  if (p.kind === 'quad') quadLegs(p, rng);
  else if (p.kind === 'biped') bipedLegs(p, rng);
  else if (p.kind === 'insect') insectLegs(p, rng);
  neckPlan(p, rng);
  headPlan(p, rng);
  tailPlan(p, rng);
  p.bodyY = bodyHeight(p);
  p.restPitch = p.kind === 'biped' && !p.tail.n ? 0.5 : p.kind === 'biped' ? 0.08 : 0;
  return p;
}
