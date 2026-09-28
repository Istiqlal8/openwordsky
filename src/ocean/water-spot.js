// Random points in the water column around a center, filtered by depth zone.
// ctx: { h, waterY, scale }. band: [lo, hi] fraction of the column (0 = floor, 1 = surface).
export function waterSpot(ctx, center, r0, r1, zones, out, band = [0.15, 0.85], tries = 10) {
  const { h, waterY, scale } = ctx;
  for (let i = 0; i < tries; i++) {
    const a = Math.random() * Math.PI * 2, r = r0 + Math.random() * (r1 - r0);
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r, floor = h(x, z), d = waterY - floor;
    if (d < 2.2 || (zones && !zones.includes(scale.zone(d)))) continue;
    const u = band[0] + Math.random() * (band[1] - band[0]);
    return out.set(x, floor + 1 + (d - 1.8) * u, z);
  }
  return null;
}

// Keeps a point inside the water: above the floor + margin, below the surface - top.
export function clampToWater(ctx, p, margin = 0.8, top = 0.6) {
  const floor = ctx.h(p.x, p.z) + margin;
  p.y = Math.max(floor, Math.min(ctx.waterY - top, p.y));
  return floor < ctx.waterY - top; // false: stranded (no room here)
}
