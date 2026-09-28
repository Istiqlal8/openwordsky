// Boss bar for raids: name, phase pips, a health bar that drains, a shield tint, a distance
// readout while the boss is still far away, and floating damage numbers near the crosshair.
// Nodes are pooled; a fight only writes text and transforms.
import { el, show, hexCss } from './dom.js';

const POOL = 14;
const RISE = 1.1; // seconds a damage number lives

export class RaidHud {
  constructor(root) {
    this.box = el('div', 'raid-bar is-hidden');
    this.name = el('div', 'raid-name');
    this.pips = el('div', 'raid-pips');
    this.track = el('div', 'raid-track');
    this.fill = el('i', 'raid-fill');
    this.track.append(this.fill);
    this.meta = el('div', 'raid-meta');
    this.box.append(this.name, this.pips, this.track, this.meta);
    this.nums = el('div', 'raid-nums');
    root.append(this.box, this.nums);
    this.pool = [];
    for (let i = 0; i < POOL; i++) {
      const n = el('span', 'raid-num');
      n.style.display = 'none';
      this.nums.append(n);
      this.pool.push({ node: n, t: -1, x: 0, y: 0 });
    }
    this.next = 0;
    this.shown = null;
    this.phaseCount = 0;
  }

  // status: null, or { name, color, now, max, phases, stage, label, dist, far, shielded }
  set(status) {
    show(this.box, Boolean(status));
    if (!status) { this.shown = null; return; }
    if (this.shown !== status.name) {
      this.shown = status.name;
      this.name.textContent = status.name;
      this.box.style.setProperty('--boss', hexCss(status.color));
      this.drawPips(status.phases.length);
    }
    this.markPips(status.stage);
    this.fill.style.width = `${Math.max(0, (100 * status.now) / status.max).toFixed(1)}%`;
    this.box.classList.toggle('is-shielded', Boolean(status.shielded));
    const dist = `${Math.round(status.dist).toLocaleString('id-ID')} u`;
    this.meta.textContent = status.far ? `${status.label} · ${dist} — di luar jangkauan` : `${status.label} · ${dist}`;
  }

  drawPips(n) {
    while (this.pips.firstChild) this.pips.removeChild(this.pips.firstChild);
    this.pip = [];
    for (let i = 0; i < n; i++) {
      const p = el('i', 'raid-pip');
      this.pips.append(p);
      this.pip.push(p);
    }
    this.phaseCount = n;
  }

  markPips(stage) {
    for (let i = 0; i < this.pip.length; i++) this.pip[i].className = i < stage ? 'raid-pip is-done' : i === stage ? 'raid-pip is-now' : 'raid-pip';
  }

  // One floating number per landed hit; `weak` marks a shielded (soaked) hit.
  damage(amount, weak = false, core = false) {
    const it = this.pool[this.next];
    this.next = (this.next + 1) % this.pool.length;
    it.node.textContent = String(amount); // a soaked hit is marked by colour, not punctuation
    it.node.className = `raid-num${weak ? ' is-weak' : ''}${core ? ' is-core' : ''}`;
    it.x = (Math.random() - 0.5) * 120;
    it.y = (Math.random() - 0.5) * 30;
    it.t = 0;
    it.node.style.display = '';
  }

  update(dt) {
    for (const it of this.pool) {
      if (it.t < 0) continue;
      it.t += dt;
      if (it.t >= RISE) { it.t = -1; it.node.style.display = 'none'; continue; }
      const k = it.t / RISE;
      it.node.style.transform = `translate3d(${it.x.toFixed(0)}px, ${(it.y - 70 * k).toFixed(0)}px, 0) scale(${(1.15 - k * 0.35).toFixed(2)})`;
      it.node.style.opacity = (1 - k * k).toFixed(2);
    }
  }

  dispose() {
    this.box.remove();
    this.nums.remove();
  }
}
