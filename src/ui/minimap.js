// Minimap: top-left canvas. Space = top-down system map (north = -Z up), surface = heading-up radar.
// Heading convention (both modes): forward = (-sin h, 0, -cos h), i.e. h = atan2(-fwd.x, -fwd.z).
import { el } from './dom.js';
import { dot, glowDot, ring, text, edgeArrow, shipArrow } from './minimap-draw.js';

const FRAME_MS = 1000 / 30;
const AMBER = '#ffb040';
const CYAN = '#6fe3ff';
const RED = '#ff5a4a';
const GREEN = '#7dff9a';
const TEXT = '#e8eef5';
const ZOOM_RATE = 5;
const MIN_VIEW = 150;
const COMPASS = [['U', 0, -1], ['T', 1, 0], ['S', 0, 1], ['B', -1, 0]];

function colorCss(c) {
  if (typeof c === 'number') return `#${(c >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
  return c || TEXT;
}

function fmtUnits(u) {
  return `${Math.round(u).toLocaleString('id-ID')} u`;
}

function niceStep(v) {
  const p = 10 ** Math.floor(Math.log10(Math.max(v, 1e-6)));
  const m = v / p;
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p;
}

// Distance from the ship to the second-nearest planet edge (fits ship + 2 nearest).
function autoReach(ship, bodies) {
  let a = Infinity;
  let b = Infinity;
  for (const p of bodies) {
    const d = Math.hypot(p.x - ship.x, p.z - ship.z) + p.r;
    if (d < a) { b = a; a = d; } else if (d < b) b = d;
  }
  const reach = Number.isFinite(b) ? b : a;
  return Math.max(Number.isFinite(reach) ? reach * 1.15 : 1000, MIN_VIEW);
}

function systemReach(ship, bodies) {
  let r = Math.hypot(ship.x, ship.z);
  for (const p of bodies) r = Math.max(r, (p.orbit || Math.hypot(p.x, p.z)) + p.r);
  return Math.max(r * 1.08, MIN_VIEW);
}

export class Minimap {
  constructor(root) {
    this.box = el('div', 'mm is-hidden');
    this.canvas = el('canvas', 'mm-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.tag = el('span', 'mm-tag');
    this.box.append(this.canvas, this.tag);
    root.append(this.box);
    this.mode = 'hidden';
    this.full = false;
    this.blend = 0;
    this.autoR = 0;
    this.last = 0;
    this.size = 0;
    addEventListener('resize', () => { this.size = 0; });
  }

  setMode(mode) {
    this.mode = mode === 'space' || mode === 'surface' ? mode : 'hidden';
    this.box.classList.toggle('is-hidden', this.mode === 'hidden');
    this.box.dataset.mode = this.mode;
    this.size = 0;
    this.autoR = 0;
    this.blend = this.full ? 1 : 0;
    this.setTag();
  }

  // Auto (ship + nearest planets) <-> full system view. Returns true when full.
  toggleZoom() {
    this.full = !this.full;
    this.setTag();
    return this.full;
  }

  setTag() {
    const text = this.mode === 'space' ? (this.full ? 'Sistem' : 'Dekat') : this.mode === 'surface' ? 'Radar' : '';
    if (this.tag.textContent !== text) this.tag.textContent = text;
  }

  update(data) {
    if (this.mode === 'hidden' || !data) return;
    const now = performance.now();
    if (now - this.last < FRAME_MS) return;
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    if (!this.fitCanvas()) return;
    this.ctx.clearRect(0, 0, this.size, this.size);
    if (this.mode === 'space' && data.ship) this.drawSpace(data, dt);
    else if (this.mode === 'surface' && data.player) this.drawRadar(data);
  }

  fitCanvas() {
    if (this.size) return true;
    const size = this.box.clientWidth;
    if (!size) return false;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round(size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.size = size;
    return true;
  }

  // ---------- Space ----------
  spaceView(d, dt) {
    const k = 1 - Math.exp(-dt * ZOOM_RATE);
    const autoTarget = autoReach(d.ship, d.bodies ?? []);
    this.autoR = this.autoR ? Math.exp(Math.log(this.autoR) + (Math.log(autoTarget) - Math.log(this.autoR)) * k) : autoTarget;
    this.blend += ((this.full ? 1 : 0) - this.blend) * k;
    if (Math.abs(this.blend - (this.full ? 1 : 0)) < 0.002) this.blend = this.full ? 1 : 0;
    const fullR = systemReach(d.ship, d.bodies ?? []);
    const R = Math.exp(Math.log(this.autoR) * (1 - this.blend) + Math.log(fullR) * this.blend);
    return { cx: d.ship.x * (1 - this.blend), cz: d.ship.z * (1 - this.blend), scale: (this.size / 2 - 6) / R };
  }

  drawSpace(d, dt) {
    const v = this.spaceView(d, dt);
    const h = this.size / 2;
    v.ox = h - v.cx * v.scale;
    v.oz = h - v.cz * v.scale;
    this.drawOrbits(d.bodies ?? [], v);
    this.drawStar(d.star, v);
    this.drawBodies(d.bodies ?? [], v);
    for (const e of d.hostiles ?? []) dot(this.ctx, v.ox + e.x * v.scale, v.oz + e.z * v.scale, 2, RED);
    shipArrow(this.ctx, v.ox + d.ship.x * v.scale, v.oz + d.ship.z * v.scale, -(d.ship.heading || 0), AMBER, d.pulse ? CYAN : null);
    this.drawScale(v.scale);
  }

  drawOrbits(bodies, v) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(111, 227, 255, 0.16)';
    ctx.lineWidth = 1;
    for (const b of bodies) {
      const r = (b.orbit || 0) * v.scale;
      if (r < 3) continue;
      ctx.beginPath();
      ctx.arc(v.ox, v.oz, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawStar(star, v) {
    const color = colorCss(star?.color ?? 0xfff2c0);
    const r = Math.max(3.5, Math.min((star?.r ?? 0) * v.scale, this.size * 0.3));
    if (this.inside(v.ox, v.oz, r)) glowDot(this.ctx, v.ox, v.oz, r, color);
    else edgeArrow(this.ctx, this.size, v.ox, v.oz, color);
  }

  drawBodies(bodies, v) {
    for (const b of bodies) {
      const x = v.ox + b.x * v.scale;
      const z = v.oz + b.z * v.scale;
      const r = Math.max(3, Math.min(b.r * v.scale, this.size * 0.3));
      if (!this.inside(x, z, r)) {
        if (b.current) edgeArrow(this.ctx, this.size, x, z, AMBER);
        continue;
      }
      dot(this.ctx, x, z, r, colorCss(b.color));
      if (b.current) ring(this.ctx, x, z, r + 3, AMBER);
    }
  }

  drawScale(scale) {
    const ctx = this.ctx;
    const step = niceStep((this.size * 0.3) / scale);
    const len = step * scale;
    const y = this.size - 8;
    ctx.strokeStyle = 'rgba(232, 238, 245, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, y - 3);
    ctx.lineTo(8, y);
    ctx.lineTo(8 + len, y);
    ctx.lineTo(8 + len, y - 3);
    ctx.stroke();
    text(this.ctx, fmtUnits(step), 12 + len, y, 'left', 'rgba(232, 238, 245, 0.8)');
  }

  // ---------- Surface radar ----------
  drawRadar(d) {
    const h = this.size / 2;
    const R = h - 6;
    const s = R / (d.range || 120);
    const p = d.player;
    const c = Math.cos(p.heading || 0);
    const sn = Math.sin(p.heading || 0);
    const rot = (x, z) => {
      const dx = (x - p.x) * s;
      const dz = (z - p.z) * s;
      return [h + dx * c - dz * sn, h + dx * sn + dz * c];
    };
    this.drawRings(h, R);
    for (const a of d.creatures ?? []) this.blip(rot(a.x, a.z), h, R, a.hostile ? RED : GREEN, 2.5);
    for (const a of d.sentinels ?? []) this.blip(rot(a.x, a.z), h, R, a.hostile ? RED : CYAN, 3);
    for (const pl of d.places ?? []) this.drawPlace(rot(pl.x, pl.z), h, R, pl.color);
    if (d.ship) this.drawRadarShip(rot(d.ship.x, d.ship.z), h, R);
    shipArrow(this.ctx, h, h, 0, TEXT, null);
    this.drawCompass(h, R, c, sn);
    text(this.ctx, fmtUnits(d.range || 120), this.size - 6, this.size - 6, 'right', 'rgba(232, 238, 245, 0.7)');
  }

  drawRings(h, R) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(4, 10, 18, 0.55)';
    ctx.beginPath();
    ctx.arc(h, h, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.strokeStyle = i === 3 ? 'rgba(111, 227, 255, 0.4)' : 'rgba(111, 227, 255, 0.14)';
      ctx.beginPath();
      ctx.arc(h, h, (R * i) / 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  blip([x, z], h, R, color, r) {
    if (Math.hypot(x - h, z - h) > R - r) return;
    dot(this.ctx, x, z, r, color);
  }

  // Places (home base, ruins, outposts): a small house icon, pinned to the rim when out of range.
  drawPlace([x, z], h, R, color) {
    const dist = Math.hypot(x - h, z - h), k = dist > R - 6 ? (R - 6) / dist : 1;
    const px = h + (x - h) * k, pz = h + (z - h) * k, ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(px, pz - 6); ctx.lineTo(px + 5, pz - 1); ctx.lineTo(px + 5, pz + 4);
    ctx.lineTo(px - 5, pz + 4); ctx.lineTo(px - 5, pz - 1); ctx.closePath();
    ctx.fill();
  }

  drawRadarShip([x, z], h, R) {
    const dist = Math.hypot(x - h, z - h);
    const edge = dist > R - 5;
    const px = edge ? h + ((x - h) / dist) * (R - 5) : x;
    const pz = edge ? h + ((z - h) / dist) * (R - 5) : z;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = AMBER;
    ctx.shadowColor = AMBER;
    ctx.shadowBlur = 6;
    ctx.fillRect(-3.5, -3.5, 7, 7);
    ctx.restore();
  }

  drawCompass(h, R, c, sn) {
    for (const [label, x, z] of COMPASS) {
      const px = h + (x * c - z * sn) * (R - 8);
      const pz = h + (x * sn + z * c) * (R - 8);
      text(this.ctx, label, px, pz + 3, 'center', label === 'U' ? AMBER : 'rgba(232, 238, 245, 0.75)');
    }
  }

  inside(x, z, r) {
    return x + r > 0 && z + r > 0 && x - r < this.size && z - r < this.size;
  }
}
