// Where the line lands: the first open water ahead of the player, a few metres out.
// Works from a beach, a wading spot or a fishing-village pier (the pier deck sits over water).

const REACH = 14;       // water must start within this many metres ahead
const DEPTH = 0.4;      // ground this far below the surface counts as open water
const CLIFF = 9;        // too high above the water to reach it with a line
const OUT = 3;          // bobber lands this far past the water's edge

// -> { x, y, z } water point, or { why } with a reason for the toast.
export function castSpot(surface) {
  const p = surface.planet, t = p?.terrain;
  if (!t?.hasWater) return { why: 'Tidak ada air di planet ini' };
  if (surface.flying) return { why: 'Mendarat dulu untuk memancing' };
  if (surface.swimming || surface.underwater) return { why: 'Tidak bisa memancing sambil berenang' };
  const f = surface.feet;
  if (f.y - t.waterY > CLIFF) return { why: 'Terlalu tinggi dari air' };
  const dx = -Math.sin(surface.yaw), dz = -Math.cos(surface.yaw);
  for (let d = 1.5; d <= REACH; d += 0.75) {
    if (!isWater(surface, f.x + dx * d, f.z + dz * d)) continue;
    const far = d + OUT, x = f.x + dx * far, z = f.z + dz * far;
    const ok = isWater(surface, x, z);
    return { x: ok ? x : f.x + dx * d, y: t.waterY, z: ok ? z : f.z + dz * d };
  }
  return { why: 'Hadap ke air di tepi pantai untuk memancing' };
}

function isWater(surface, x, z) {
  return surface.h(x, z) < surface.planet.terrain.waterY - DEPTH;
}

// Player wandered off: the line snaps.
export function tooFar(surface, spot, from) {
  const f = surface.feet;
  const moved = Math.hypot(f.x - from.x, f.z - from.z);
  const reach = Math.hypot(f.x - spot.x, f.z - spot.z);
  return moved > 3.5 || reach > REACH + OUT + 4;
}
