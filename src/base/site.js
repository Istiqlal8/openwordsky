// Base layout (local coords, entrance at +Z) and placement on dry, gentle land near the spawn.
const STEP = 4; // terrain mesh lattice spacing (see surface.js SIZE / SEG)

// Building slots. face: yaw of the model front (+Z); r: footprint radius; door: model-local door point.
export const LAYOUT = {
  entrance: { x: 0, z: 13 },
  plaza: { x: 0, z: 0, r: 8 },
  pad: { x: 0, z: -23, r: 8.5 },
  hangar: { x: -25, z: -21, face: Math.PI / 2, r: 11.5 },
  workshop: { x: 25, z: -20, face: -Math.PI / 2, r: 9.5 },
  store: { x: 12, z: 7, face: null, r: 3.5 },
  tower: { x: 31, z: 2, r: 3 },
  waterTower: { x: -31, z: 1, r: 3 },
  solar: { x: -29, z: 16, r: 5 },
  houses: [
    { x: -21, z: 8, sign: 'rumahku', home: true },
    { x: -13, z: 20, sign: 'sari' },
    { x: 13, z: 21, sign: 'budi' },
    { x: 23, z: 11, sign: 'ayu' },
  ],
};

// Yaw that turns a model's +Z front toward the plaza centre.
export const faceCenter = (x, z) => Math.atan2(-x, -z);

// Local <-> world transform for the whole base (rotation about Y, then offset).
export class Frame {
  constructor(cx, cz, yaw) {
    Object.assign(this, { cx, cz, yaw, cos: Math.cos(yaw), sin: Math.sin(yaw) });
  }

  x(lx, lz) { return this.cx + lx * this.cos + lz * this.sin; }
  z(lx, lz) { return this.cz - lx * this.sin + lz * this.cos; }
}

// Walkable ground height: the true height, never below the terrain mesh's lattice interpolation.
export function groundY(h, planet, x, z) {
  const x0 = Math.floor(x / STEP) * STEP, z0 = Math.floor(z / STEP) * STEP;
  const fx = (x - x0) / STEP, fz = (z - z0) / STEP;
  const top = h(x0, z0) * (1 - fx) + h(x0 + STEP, z0) * fx;
  const bot = h(x0, z0 + STEP) * (1 - fx) + h(x0 + STEP, z0 + STEP) * fx;
  const y = Math.max(h(x, z), top * (1 - fz) + bot * fz);
  const t = planet.terrain;
  return t.hasWater ? Math.max(y, t.waterY + 0.05) : y;
}

// Lowest / highest ground over a footprint circle (centre + two rings).
export function groundRange(h, x, z, r) {
  let lo = h(x, z), hi = lo;
  for (let ring = 1; ring <= 2; ring++) {
    const rr = (r * ring) / 2, n = 6 * ring;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, y = h(x + Math.cos(a) * rr, z + Math.sin(a) * rr);
      if (y < lo) lo = y;
      if (y > hi) hi = y;
    }
  }
  return { lo, hi };
}

function footprints() {
  const L = LAYOUT;
  return [L.plaza, L.pad, L.hangar, L.workshop, L.store, L.tower, L.waterTower, ...L.houses.map((q) => ({ ...q, r: 5 }))];
}

// Lower is better: wet samples and uneven ground under each footprint.
function siteScore(h, planet, frame) {
  const t = planet.terrain;
  let score = 0;
  for (const f of footprints()) {
    const x = frame.x(f.x, f.z), z = frame.z(f.x, f.z);
    const { lo, hi } = groundRange(h, x, z, f.r);
    if (t.hasWater && lo < t.waterY + 0.3) score += 6 + (t.waterY - lo);
    score += hi - lo;
  }
  return score;
}

// Try several yaws around the spawn so the spawn stays at the base entrance. -> Frame
export function chooseSite(h, planet, spawn) {
  const e = LAYOUT.entrance;
  let best = null, bestScore = Infinity;
  for (let k = 0; k < 12; k++) {
    const yaw = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 6);
    const probe = new Frame(0, 0, yaw);
    const frame = new Frame(spawn.x - probe.x(e.x, e.z), spawn.z - probe.z(e.x, e.z), yaw);
    const score = siteScore(h, planet, frame) + Math.abs(yaw) * 0.5; // prefer facing the default view
    if (score < bestScore) { best = frame; bestScore = score; }
  }
  return best;
}

// Circles kept free of flora and rocks (footprints + path strips).
export function clearZones(frame) {
  const zones = footprints().map((f) => ({ x: frame.x(f.x, f.z), z: frame.z(f.x, f.z), r: f.r + 3 })); // margin for wide tree canopies
  for (const [ax, az, bx, bz] of pathSegments()) {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 3);
    for (let i = 0; i <= n; i++) {
      const lx = ax + ((bx - ax) * i) / n, lz = az + ((bz - az) * i) / n;
      zones.push({ x: frame.x(lx, lz), z: frame.z(lx, lz), r: 2.5 });
    }
  }
  return zones;
}

// Path strips from the plaza edge to every door (local coords [ax, az, bx, bz]).
export function pathSegments() {
  const L = LAYOUT;
  return [
    [0, 7, L.entrance.x, L.entrance.z + 3],
    [0, -7, L.pad.x, L.pad.z + 8],
    [-6, -4, L.hangar.x + 10, L.hangar.z + 2],
    [6, -4, L.workshop.x - 8.5, L.workshop.z + 2],
    [5, 5, L.store.x - 2, L.store.z - 2],
    ...L.houses.map((q) => [Math.sign(q.x) * 5, 5, q.x * 0.75, q.z * 0.75]),
  ];
}
