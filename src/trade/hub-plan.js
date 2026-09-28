// Trade hub street plan in hub-local metres (origin = exchange tower; hub-build picks which pad
// holds the player's ship): radial avenues, a ring road, market lots, landing pads, cargo yards and lamps.
export const HUB = { R: 200, plaza: 26, avenues: 6, avenueW: 12, ring: 112, padR: 11, innerPad: 72, outerPad: 158 };
const SHOP_TYPES = ['sumber', 'hayati', 'langka', 'perlengkapan', 'senjata'];

// Point on avenue angle t: distance d from the centre, lateral offset (right of travel) off.
export function avenuePoint(t, d, off = 0) {
  return { x: Math.sin(t) * d + Math.cos(t) * off, z: Math.cos(t) * d - Math.sin(t) * off };
}

export function planHub(rng) {
  const step = (Math.PI * 2) / HUB.avenues;
  const avenues = Array.from({ length: HUB.avenues }, (_, k) => step / 2 + k * step);
  const pads = [], cargo = [];
  for (let k = 0; k < HUB.avenues; k++) {
    const a = k * step;
    pads.push({ ...avenuePoint(a, HUB.innerPad), player: false, yaw: a });
    if (k % 2 === 0) pads.push({ ...avenuePoint(a, HUB.outerPad), yaw: a });
    else cargo.push({ ...avenuePoint(a, HUB.outerPad + 6), yaw: a });
  }
  const lots = makeLots(avenues, pads, cargo);
  assignShops(rng, lots);
  return { avenues, pads, cargo, lots, lamps: makeLamps(avenues) };
}

// Market lots on both sides of every avenue: small stalls near the road, shop buildings behind.
function makeLots(avenues, pads, cargo) {
  const lots = [];
  avenues.forEach((t, ai) => {
    for (let i = 0, d = 36; d < HUB.R - 4; i++, d += 12) {
      if (Math.abs(d - HUB.ring) < 10) continue;
      for (const side of [-1, 1]) {
        const shop = (i + (side > 0 ? 1 : 0)) % 3 === 0, off = side * (shop ? 16 : 9.5);
        const p = avenuePoint(t, d, off);
        const r = shop ? 6 : 3;
        if (pads.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < HUB.padR + r + 2)) continue;
        if (cargo.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 30 + r)) continue;
        const face = Math.atan2(-side * Math.cos(t), side * Math.sin(t)); // front toward the avenue
        lots.push({ ...p, t, d, side, face, kind: shop ? 'shop' : 'stall', avenue: ai, r });
      }
    }
  });
  return lots;
}

// Ten interactive shops (two of each type) on inner shop lots, spread over the avenues.
function assignShops(rng, lots) {
  const inner = lots.filter((l) => l.kind === 'shop' && l.d < 125);
  const order = rng.take(inner, inner.length).sort((a, b) => (a.d > 90) - (b.d > 90));
  const used = new Map();
  let n = 0;
  for (const lot of order) {
    if (n >= SHOP_TYPES.length * 2) break;
    if ((used.get(lot.avenue) ?? 0) >= 2) continue;
    used.set(lot.avenue, (used.get(lot.avenue) ?? 0) + 1);
    lot.shopType = SHOP_TYPES[n % SHOP_TYPES.length];
    n++;
  }
  let decor = 0;
  for (const lot of lots) if (lot.kind === 'shop' && !lot.shopType) lot.decor = decor++ % 8;
}

function makeLamps(avenues) {
  const out = [];
  for (const t of avenues) {
    for (let d = 32; d < HUB.R; d += 24) for (const side of [-1, 1]) out.push(avenuePoint(t, d, side * 6.8));
  }
  return out;
}
