// World addon: on-foot screen markers for quest targets (see guide-targets.js). Off-screen or
// behind-camera targets clamp to an inner ellipse with an arrow pointing their way.
import { Vector3 } from 'three';
import { el } from '../ui/dom.js';
import { guideTargets } from './guide-targets.js';

const PICK_EVERY = 0.3; // seconds between target re-picks
const EDGE = { rx: 0.3, ry: 0.34 }; // same inner ellipse as ui/markers.js, clear of side panels
const tmp = new Vector3();

export class GuideMarkers {
  constructor(ctx) {
    this.ctx = ctx;
    this.layer = el('div', 'gd-layer');
    (document.getElementById('hud') ?? document.body).append(this.layer);
    this.pool = new Map(); // target id -> { node, label, dist }
    this.targets = [];
    this.t = PICK_EVERY;
  }

  update(dt, alive) {
    const s = this.ctx.surface, on = alive && !s.flying && Boolean(s.feet);
    this.layer.classList.toggle('is-hidden', !on);
    if (!on) return;
    this.t += dt;
    if (this.t >= PICK_EVERY) { this.t = 0; this.targets = guideTargets(this.ctx); this.sync(); }
    for (const t of this.targets) this.place(this.pool.get(t.id), t);
  }

  // Create/drop DOM nodes so they match the current targets.
  sync() {
    const live = new Set(this.targets.map((t) => t.id));
    for (const [id, m] of this.pool) if (!live.has(id)) { m.node.remove(); this.pool.delete(id); }
    for (const t of this.targets) {
      let m = this.pool.get(t.id);
      if (!m) {
        m = { node: el('div', `gd-mk is-${t.kind}`), arrow: el('i', 'gd-arrow'), label: el('span', 'gd-label'), dist: el('span', 'gd-dist') };
        m.node.style.setProperty('--c', t.color);
        m.node.append(m.arrow, m.label, m.dist);
        this.layer.append(m.node);
        this.pool.set(t.id, m);
      }
      m.label.textContent = t.label;
      m.dist.textContent = `${Math.round(t.d)} m`;
    }
  }

  place(m, t) {
    const w = innerWidth, h = innerHeight, cam = this.ctx.surface.camera;
    tmp.set(t.x, t.y, t.z).applyMatrix4(cam.matrixWorldInverse);
    const behind = tmp.z > 0;
    tmp.applyMatrix4(cam.projectionMatrix);
    const sx = behind ? -tmp.x : tmp.x, sy = behind ? -tmp.y : tmp.y;
    let x = (sx * 0.5 + 0.5) * w, y = (-sy * 0.5 + 0.5) * h, angle = null;
    if (behind || x < 0 || x > w || y < 0 || y > h) {
      const dx = x - w / 2, dy = y - h / 2;
      const k = 1 / Math.max(1e-6, Math.hypot(dx / (w * EDGE.rx), dy / (h * EDGE.ry)));
      x = w / 2 + dx * k; y = h / 2 + dy * k; angle = Math.atan2(dy, dx);
    }
    m.node.classList.toggle('is-edge', angle !== null);
    m.node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    m.arrow.style.transform = angle === null ? '' : `rotate(${angle.toFixed(2)}rad)`;
  }

  dispose() {
    this.layer.remove();
    this.pool.clear();
  }
}
