// Galaxy-map layer for void fauna. A creature this size registers as a biosignature from across
// the galaxy, so every system holding one is marked — but the mark only names the creature once
// you have been there. Unvisited ones stay an anonymous smudge, which is the point of going.
import { toScreen } from '../ui/galaxy-render.js';
import { voidFaunaOf } from './void-fauna.js';

const LABELS = {
  voidwhale: 'Paus Kekosongan', kraken: 'Kraken Angkasa', hivequeen: 'Ratu Sarang',
  guardian: 'Penjaga Purba', starleech: 'Lintah Bintang',
};
const COLOR = 'rgba(150, 230, 255, ';
const MARGIN = 40; // pixels of slack before a mark is culled
const NAME_SCALE = 4; // map zoom (0.25..14) at which names are worth the clutter
let cache = null; // { systems, list: [{ i, kind }] } — the sweep runs once per galaxy

// Every system with a creature, found once and kept. `systems` identity doubles as the cache key.
function scan(systems) {
  if (cache?.systems === systems) return cache.list;
  const list = [];
  systems.forEach((s, i) => {
    const kind = voidFaunaOf(s);
    if (kind) list.push({ i, kind });
  });
  cache = { systems, list };
  return list;
}

// Six-pointed tick: distinct from the round system dots and the devourer's pulsing rings.
function tick(ctx, x, y, r, alpha) {
  ctx.strokeStyle = `${COLOR}${alpha})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI;
    ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
  }
  ctx.stroke();
}

export function drawVoidFauna(ctx, cam, systems, visited, time) {
  const pulse = 0.55 + 0.45 * Math.sin(time * 0.002);
  ctx.save();
  ctx.font = '600 11px Rajdhani, sans-serif';
  for (const { i, kind } of scan(systems)) {
    const s = systems[i];
    const p = toScreen(cam, s.pos.x, s.pos.z);
    if (p.x < -MARGIN || p.y < -MARGIN || p.x > cam.w + MARGIN || p.y > cam.h + MARGIN) continue;
    const seen = visited.has(i);
    // Small at galaxy zoom so 474 of them read as scattered signals, not noise.
    tick(ctx, p.x, p.y, Math.min(9, 2.5 + cam.scale * 1.2) + pulse * 1.5, seen ? 0.85 : 0.22);
    if (!seen || cam.scale < NAME_SCALE) continue; // names only where you have been, zoomed in
    ctx.fillStyle = `${COLOR}0.85)`;
    ctx.fillText(LABELS[kind] ?? '', p.x + 11, p.y - 7);
  }
  ctx.restore();
}
