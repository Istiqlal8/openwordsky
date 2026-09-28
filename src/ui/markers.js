// Markers: screen-space labels for planets, star, ship and hostiles. Off-screen items clamp to the
// screen edge as arrows. DOM nodes are pooled by id; per frame only transforms/opacity change.
import { Vector3 } from 'three';
import { el } from './dom.js';

const EDGE = { rx: 0.3, ry: 0.34, cy: 0.5 };
const EDGE_TOUCH = { rx: 0.28, ry: 0.26, cy: 0.42 }; // clear of the action pad (bottom-right)
const AIM_R = 60;
const LABEL_SIDE = 90;
const FADE = 0.45;
const tmp = new Vector3();

function colorCss(c) {
  if (typeof c === 'number') return `#${(c >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
  return c || '';
}

function setText(node, value) {
  const v = value ?? '';
  if (node.textContent !== v) node.textContent = v;
}

function setClass(m, cls) {
  if (m.cls === cls) return;
  m.cls = cls;
  m.node.className = cls;
}

export class Markers {
  constructor(root) {
    this.box = el('div', 'mk-layer is-hidden');
    root.append(this.box);
    this.pool = new Map();
    this.dists = [];
    this.frame = 0;
    this.w = innerWidth;
    this.h = innerHeight;
    addEventListener('resize', () => { this.w = innerWidth; this.h = innerHeight; });
  }

  setMode(mode) {
    this.box.classList.toggle('is-hidden', mode !== 'space' && mode !== 'surface');
  }

  update(camera, items) {
    if (this.box.classList.contains('is-hidden')) return;
    const frame = ++this.frame;
    const list = items ?? [];
    const [near, far] = this.measure(camera, list);
    list.forEach((item, i) => {
      const m = this.node(item);
      m.frame = frame;
      const fade = far > near ? (this.dists[i] - near) / (far - near) : 0;
      this.place(m, camera, item, 1 - fade * FADE);
    });
    for (const m of this.pool.values()) {
      if (m.frame !== frame && m.visible) { m.visible = false; m.node.style.display = 'none'; }
    }
  }

  measure(camera, list) {
    let near = Infinity;
    let far = 0;
    this.dists.length = list.length;
    list.forEach((item, i) => {
      const d = item.kind === 'hostile' ? 0 : camera.position.distanceTo(item.position);
      this.dists[i] = d;
      if (item.kind === 'hostile') return;
      near = Math.min(near, d);
      far = Math.max(far, d);
    });
    return [near, far];
  }

  node(item) {
    let m = this.pool.get(item.id);
    if (!m) {
      const node = el('div');
      const icon = el('i', 'mk-icon');
      const label = el('span', 'mk-label');
      const sub = el('span', 'mk-sub');
      node.append(icon, label, sub);
      this.box.append(node);
      m = { node, icon, label, sub, cls: '', color: '', opacity: -1, angle: null, visible: true, frame: 0 };
      this.pool.set(item.id, m);
    }
    if (!m.visible) { m.visible = true; m.node.style.display = ''; }
    const color = colorCss(item.color);
    if (color !== m.color) { m.color = color; m.node.style.setProperty('--c', color || null); }
    setText(m.label, item.kind === 'hostile' ? '' : item.label);
    setText(m.sub, item.kind === 'hostile' ? '' : item.sub);
    return m;
  }

  // Project to pixels; returns { x, y, on } where on = in front of camera and inside the viewport.
  project(camera, pos) {
    tmp.copy(pos).applyMatrix4(camera.matrixWorldInverse);
    const behind = tmp.z > 0;
    tmp.applyMatrix4(camera.projectionMatrix);
    const sx = behind ? -tmp.x : tmp.x;
    const sy = behind ? -tmp.y : tmp.y;
    const x = (sx * 0.5 + 0.5) * this.w;
    const y = (-sy * 0.5 + 0.5) * this.h;
    const on = !behind && x >= 0 && x <= this.w && y >= 0 && y <= this.h;
    return { x, y, on };
  }

  place(m, camera, item, opacity) {
    const p = this.project(camera, item.position);
    let { x, y } = p;
    let angle = null;
    if (!p.on) [x, y, angle] = this.clampToEdge(x - this.w / 2, y - this.h / 2);
    const nearAim = p.on && Math.hypot(x - this.w / 2, y - this.h / 2) < AIM_R;
    const side = x < LABEL_SIDE ? ' al-l' : x > this.w - LABEL_SIDE ? ' al-r' : '';
    const low = y > this.h - LABEL_SIDE ? ' al-b' : '';
    const edge = angle === null ? '' : ' is-edge';
    setClass(m, `mk mk-${item.kind || 'planet'}${edge}${side}${low}${nearAim ? ' no-label' : ''}`);
    m.node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    this.setAngle(m, angle);
    const o = Math.round(opacity * 20) / 20;
    if (o !== m.opacity) { m.opacity = o; m.node.style.opacity = String(o); }
  }

  // Off-screen items sit on an inner ellipse so arrows stay clear of the corner panels and hints.
  clampToEdge(dx, dy) {
    if (Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3) dy = 1;
    const e = document.body.classList.contains('is-touch') ? EDGE_TOUCH : EDGE;
    const t = 1 / Math.hypot(dx / (this.w * e.rx), dy / (this.h * e.ry));
    return [this.w / 2 + dx * t, this.h * e.cy + dy * t, Math.atan2(dy, dx)];
  }

  setAngle(m, angle) {
    const a = angle === null ? null : Math.round(angle * 50) / 50;
    if (a === m.angle) return;
    m.angle = a;
    m.icon.style.transform = a === null ? '' : `rotate(${a}rad)`;
  }
}
