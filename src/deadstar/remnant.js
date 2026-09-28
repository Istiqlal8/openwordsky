// The corpse of the star itself.
//
// systemAt() caches one object per system for the whole session, and everything that draws a
// star — SpaceView.mount()'s buildStar/PointLight and the galaxy map's dots — reads system.star
// off that cached object. Dimming it in place is therefore all a dead star needs, and it keeps
// the whole feature out of gen/galaxy.js.
import { systemAt } from '../gen/galaxy.js';

const REMNANT = { type: 'R', label: 'Sisa Nova', color: 0x7a5f6e };
const SHRINK = 0.38;
const MIN_SIZE = 45;

// Idempotent: a system already dimmed keeps the size it was first given, so orbits (which are
// derived from star.size) never drift on a second call.
export function dimSystem(galaxySeed, index) {
  const sys = systemAt(galaxySeed, index);
  if (!sys || sys.dead) return sys;
  sys.dead = true;
  sys.star = { ...sys.star, ...REMNANT, blackHole: false,
    size: Math.max(MIN_SIZE, Math.round(sys.star.size * SHRINK)) };
  return sys;
}

export function dimAll(galaxySeed, list) {
  for (const i of list ?? []) dimSystem(galaxySeed, i);
}

// The star mesh the player is looking at right now was built from the *old* star, so after a
// nova fired under their nose we drop its light in place instead of making them warp out and
// back to see the system die. Cosmetic only, and it must run before dimSystem() because the
// star group is found by matching the core sphere against the system's current star size.
export function dimLiveStar(space) {
  const size = space?.system?.star?.size;
  if (!space?.root || !size) return false;
  for (const child of space.root.children) {
    if (child.isPointLight) { child.intensity = 0.35; child.color.setHex(REMNANT.color); continue; }
    if (!isStarGroup(child, size)) continue;
    const [core, glow] = child.children;
    core.material.color.setHex(REMNANT.color);
    core.scale.setScalar(SHRINK);
    glow.material.color.setHex(REMNANT.color);
    glow.material.opacity = 0.35;
  }
  return true;
}

// buildStar() makes a Group of exactly [core sphere of star.size, glow sprite]; planet bodies
// and the starfield never match all three tests at once.
function isStarGroup(node, size) {
  if (!node.isGroup || node.children.length !== 2) return false;
  const [core, glow] = node.children;
  return Boolean(core?.isMesh && glow?.isSprite && core.geometry?.parameters?.radius === size);
}
