// Canvas drawing for the galaxy map. Pure functions over a camera + system list.
import { hexCss } from './dom.js';

const WORLD = 1000; // haze covers -WORLD..WORLD on x and z
const HAZE_PX = 1024;

// Camera: { cx, cz, scale, w, h } — scale is CSS px per world unit.
export function toScreen(cam, x, z) {
  return { x: cam.w / 2 + (x - cam.cx) * cam.scale, y: cam.h / 2 + (z - cam.cz) * cam.scale };
}

export function toWorld(cam, sx, sy) {
  return { x: cam.cx + (sx - cam.w / 2) / cam.scale, z: cam.cz + (sy - cam.h / 2) / cam.scale };
}

function blobSprite(rgb) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

// Pre-render soft spiral haze by splatting blobs at every system position.
export function buildHaze(systems) {
  const c = document.createElement('canvas');
  c.width = c.height = HAZE_PX;
  const g = c.getContext('2d');
  const warm = blobSprite('255,170,90');
  const cool = blobSprite('110,140,255');
  const k = HAZE_PX / (WORLD * 2);
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.045;
  for (const s of systems) {
    const r = Math.hypot(s.pos.x, s.pos.z);
    const size = 46 * k * (1 + r / 900);
    const px = (s.pos.x + WORLD) * k - size / 2;
    const pz = (s.pos.z + WORLD) * k - size / 2;
    g.drawImage(r < 260 ? warm : cool, px, pz, size, size);
  }
  return c;
}

export function drawBackground(ctx, cam, haze) {
  ctx.fillStyle = '#04060c';
  ctx.fillRect(0, 0, cam.w, cam.h);
  const o = toScreen(cam, 0, 0);
  const coreR = 320 * cam.scale;
  const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, coreR);
  grad.addColorStop(0, 'rgba(255,214,150,0.55)');
  grad.addColorStop(0.25, 'rgba(255,150,80,0.18)');
  grad.addColorStop(1, 'rgba(60,40,90,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cam.w, cam.h);
  const tl = toScreen(cam, -WORLD, -WORLD);
  ctx.drawImage(haze, tl.x, tl.y, WORLD * 2 * cam.scale, WORLD * 2 * cam.scale);
  drawRings(ctx, cam, o);
}

function drawRings(ctx, cam, o) {
  ctx.strokeStyle = 'rgba(120,200,255,0.07)';
  ctx.lineWidth = 1;
  for (let r = 250; r <= 1000; r += 250) {
    ctx.beginPath();
    ctx.arc(o.x, o.y, r * cam.scale, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function dotRadius(cam, system) {
  const zoom = Math.min(2.4, Math.max(0.6, Math.sqrt(cam.scale / 2)));
  return (0.7 + system.planetCount * 0.28) * zoom;
}

// Batch dots by star color: one path per color keeps 4096 arcs cheap.
export function drawSystems(ctx, cam, systems) {
  const groups = new Map();
  for (const s of systems) {
    const p = toScreen(cam, s.pos.x, s.pos.z);
    if (p.x < -10 || p.y < -10 || p.x > cam.w + 10 || p.y > cam.h + 10) continue;
    let path = groups.get(s.star.color);
    if (!path) groups.set(s.star.color, (path = new Path2D()));
    const r = dotRadius(cam, s);
    path.moveTo(p.x + r, p.y);
    path.arc(p.x, p.y, r, 0, Math.PI * 2);
  }
  for (const [color, path] of groups) {
    ctx.fillStyle = hexCss(color);
    ctx.fill(path);
  }
  drawBlackHoles(ctx, cam, systems);
}

// Black holes: dark core with a glowing accretion ring, labelled when zoomed in.
function drawBlackHoles(ctx, cam, systems) {
  ctx.font = '600 11px Rajdhani, "Segoe UI", sans-serif';
  for (const s of systems) {
    if (!s.star.blackHole) continue;
    const p = toScreen(cam, s.pos.x, s.pos.z);
    if (p.x < -10 || p.y < -10 || p.x > cam.w + 10 || p.y > cam.h + 10) continue;
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#ffa860';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (cam.scale > 1.2) { ctx.fillStyle = '#ffa860'; ctx.fillText('Lubang Hitam', p.x + 8, p.y + 4); }
  }
}

export function drawVisited(ctx, cam, systems, visited) {
  ctx.strokeStyle = 'rgba(90,220,255,0.75)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const i of visited) {
    const s = systems[i];
    if (!s) continue;
    const p = toScreen(cam, s.pos.x, s.pos.z);
    const r = dotRadius(cam, s) + 3.5;
    ctx.moveTo(p.x + r, p.y);
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  }
  ctx.stroke();
}

export function drawCurrent(ctx, cam, system, time) {
  const p = toScreen(cam, system.pos.x, system.pos.z);
  const t = (time / 1400) % 1;
  ctx.strokeStyle = `rgba(255,170,60,${1 - t})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 6 + t * 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffb040';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
  ctx.fill();
}

// Bracket marker + name label for hovered / selected systems.
export function drawMarker(ctx, cam, system, color, label) {
  const p = toScreen(cam, system.pos.x, system.pos.z);
  const r = dotRadius(cam, system) + 8;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    ctx.moveTo(p.x + sx * r, p.y + sy * (r - 5));
    ctx.lineTo(p.x + sx * r, p.y + sy * r);
    ctx.lineTo(p.x + sx * (r - 5), p.y + sy * r);
  }
  ctx.stroke();
  if (!label) return;
  ctx.font = '600 13px Rajdhani, "Segoe UI", sans-serif';
  ctx.fillStyle = color;
  ctx.fillText(label, p.x + r + 6, p.y + 4);
}

// Home (Solar System): always labelled; pinned to the screen edge with an arrow when off-screen.
export function drawHome(ctx, cam, home) {
  const p = toScreen(cam, home.pos.x, home.pos.z);
  const pad = 28, x = Math.min(cam.w - pad, Math.max(pad, p.x)), y = Math.min(cam.h - pad, Math.max(pad, p.y));
  const off = x !== p.x || y !== p.y;
  ctx.strokeStyle = ctx.fillStyle = '#7dffb2';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (off) {
    const a = Math.atan2(p.y - y, p.x - x);
    ctx.moveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
    ctx.lineTo(x + Math.cos(a + 2.5) * 9, y + Math.sin(a + 2.5) * 9);
    ctx.lineTo(x + Math.cos(a - 2.5) * 9, y + Math.sin(a - 2.5) * 9);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.moveTo(x, y - 10); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + 10); ctx.lineTo(x - 10, y); ctx.closePath();
    ctx.stroke();
  }
  ctx.font = '700 13px Rajdhani, "Segoe UI", sans-serif';
  const label = 'Tata Surya';
  const w = ctx.measureText(label).width;
  const lx = Math.min(cam.w - w - 8, Math.max(8, x + 14)), ly = y < 40 ? y + 22 : y - 12;
  ctx.fillText(label, lx, ly);
}

export function drawRoute(ctx, cam, from, to) {
  const a = toScreen(cam, from.pos.x, from.pos.z);
  const b = toScreen(cam, to.pos.x, to.pos.z);
  ctx.strokeStyle = 'rgba(255,176,64,0.6)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

// Nearest system within maxPx of a screen point, or -1.
export function pickSystem(cam, systems, sx, sy, maxPx = 14) {
  let best = -1;
  let bestD = maxPx * maxPx;
  for (const s of systems) {
    const p = toScreen(cam, s.pos.x, s.pos.z);
    const d = (p.x - sx) ** 2 + (p.y - sy) ** 2;
    if (d < bestD) { bestD = d; best = s.index; }
  }
  return best;
}
