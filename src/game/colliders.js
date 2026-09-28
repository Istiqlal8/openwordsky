// Solid obstacles on a planet surface: circles on the ground plane that push the player out.
export const PLAYER_RADIUS = 0.6;

// Moves `pos` (x/z) out of every circle it overlaps. Returns true when it was pushed.
export function pushOut(pos, circles, radius = PLAYER_RADIUS) {
  let moved = false;
  for (const c of circles) {
    const dx = pos.x - c.x, dz = pos.z - c.z;
    const min = c.r + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(d2) || 0.0001;
    pos.x = c.x + (dx / d) * min;
    pos.z = c.z + (dz / d) * min;
    moved = true;
  }
  return moved;
}
