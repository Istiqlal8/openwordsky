// Galaxy-map layer for dead systems. Same shape and call site as devourer/map-marker.js's
// drawEventMarker: GalaxyMap.draw() calls it after the normal system layer.
//
// A dead star is not an event to fly to, so the mark is quiet — an ashen cross with a thin
// collapse ring, no pulse fighting the devourer's red rings for attention. Names only appear
// once the map is zoomed in, like the void-fauna layer.
import { toScreen } from '../ui/galaxy-render.js';
import { deadIndices } from './dead-registry.js';

const COLOR = 'rgba(190, 150, 175, ';
const MARGIN = 40;         // pixels of slack before a mark is culled
const NAME_SCALE = 3;      // map zoom at which names are worth the clutter

function cross(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
  ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawDeadStar(ctx, cam, systems, time) {
  const list = deadIndices();
  if (!list.length) return;
  const breathe = 0.7 + 0.3 * Math.sin(time * 0.0012);
  ctx.save();
  ctx.font = '600 11px Rajdhani, sans-serif';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < list.length; k++) {
    const s = systems[list[k]];
    if (!s) continue;
    const p = toScreen(cam, s.pos.x, s.pos.z);
    if (p.x < -MARGIN || p.y < -MARGIN || p.x > cam.w + MARGIN || p.y > cam.h + MARGIN) continue;
    ctx.strokeStyle = `${COLOR}${(0.75 * breathe).toFixed(3)})`;
    cross(ctx, p.x, p.y, Math.min(8, 3 + cam.scale));
    if (cam.scale < NAME_SCALE) continue;
    ctx.fillStyle = `${COLOR}0.9)`;
    ctx.fillText(`${s.name} · mati`, p.x + 14, p.y - 8);
  }
  ctx.restore();
}
