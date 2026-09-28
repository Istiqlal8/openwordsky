// Red pulsing ring on the galaxy map over the system the Pemakan Planet is eating.
// Drawn by GalaxyMap.draw() after the normal system layer.
import { toScreen } from '../ui/galaxy-render.js';
import { liveEvent } from './live.js';

export function drawEventMarker(ctx, cam, systems, time) {
  const ev = liveEvent();
  const sys = ev && systems[ev.sys];
  if (!sys) return;
  const p = toScreen(cam, sys.pos.x, sys.pos.z);
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.005);
  ctx.save();
  for (let i = 0; i < 2; i++) {
    const r = 10 + i * 9 + pulse * 7;
    ctx.strokeStyle = `rgba(255, 78, 44, ${(0.85 - i * 0.35) * (0.5 + pulse * 0.5)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#ff4e2c';
  ctx.font = '700 12px Orbitron, Rajdhani, sans-serif';
  ctx.fillText('PEMAKAN PLANET', p.x + 26, p.y - 8);
  ctx.fillStyle = 'rgba(255, 170, 140, 0.9)';
  ctx.font = '600 12px Rajdhani, sans-serif';
  ctx.fillText(ev.planetName, p.x + 26, p.y + 8);
  ctx.restore();
}
