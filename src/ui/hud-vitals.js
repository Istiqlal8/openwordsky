// Vitals: ship/suit bars, threat row, mining ring, lock bracket and hit feedback.
import { el, show, hazardIcon } from './dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const RING_R = 22;
const RING_LEN = 2 * Math.PI * RING_R;
const LOW = 25;
const DRAIN_HOLD_MS = 600;
const FLASH_MS = 450;
const HIT_MS = 160;

const SPACE_BARS = [['shield', 'Perisai', 'bar-shield'], ['hull', 'Lambung', 'bar-hull'], ['energy', 'Energi', 'bar-energy']];
const SURFACE_BARS = [['health', 'Kesehatan', 'bar-health'], ['lifeSupport', 'Oksigen', 'bar-oxygen'], ['hazard', 'Pelindung', 'bar-hazard']];

function svg(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// One labelled bar: label, track with fill, numeric value.
function makeBar(label, cls) {
  const row = el('div', `vbar ${cls}`);
  const track = el('div', 'vbar-track');
  const fill = el('div', 'vbar-fill');
  const value = el('span', 'vbar-val', '100');
  track.append(fill);
  row.append(el('span', 'vbar-label', label), track, value);
  return { row, fill, value, last: null };
}

function setBar(bar, raw) {
  const v = Math.max(0, Math.min(100, Math.round(raw ?? 0)));
  if (v === bar.last) return;
  bar.last = v;
  bar.fill.style.transform = `scaleX(${v / 100})`;
  bar.value.textContent = String(v);
  bar.row.classList.toggle('is-low', v < LOW);
}

export class Vitals {
  constructor(root) {
    this.root = root;
    this.box = el('div', 'vitals');
    this.cache = {};
    this.prevHazard = 100;
    this.lastDrain = 0;
    this.buildBars();
    this.buildThreat();
    this.buildReticle();
    this.buildOverlays();
    root.append(this.box);
    this.setMode('hidden');
  }

  buildBars() {
    this.panel = el('div', 'panel vitals-panel');
    this.warnRow = el('div', 'vitals-warn');
    this.storm = el('span', 'vwarn vwarn-storm is-hidden', 'Badai');
    this.hazard = el('span', 'vwarn vwarn-hazard is-hidden');
    this.hazard.append(hazardIcon());
    this.warnRow.append(this.storm, this.hazard);
    this.spaceBars = this.barGroup(SPACE_BARS, 'vbars-space');
    this.surfaceBars = this.barGroup(SURFACE_BARS, 'vbars-surface');
    this.panel.append(this.warnRow, this.spaceBars.group, this.surfaceBars.group);
    this.box.append(this.panel);
  }

  barGroup(defs, cls) {
    const group = el('div', `vbars ${cls}`);
    const bars = {};
    for (const [key, label, barCls] of defs) {
      bars[key] = makeBar(label, barCls);
      group.append(bars[key].row);
    }
    return { group, bars };
  }

  buildThreat() {
    this.threat = el('div', 'threat is-hidden');
    this.stars = el('div', 'wanted');
    this.starEls = [];
    for (let i = 0; i < 5; i++) {
      const s = el('i', 'wanted-star');
      this.starEls.push(s);
      this.stars.append(s);
    }
    this.hostiles = el('span', 'hostiles is-hidden');
    this.threat.append(this.stars, this.hostiles);
    this.box.append(this.threat);
  }

  buildReticle() {
    this.ring = svg('svg', { class: 'mine-ring is-hidden', viewBox: '0 0 60 60' });
    this.ring.append(svg('circle', { class: 'mine-ring-bg', cx: 30, cy: 30, r: RING_R }));
    this.ringArc = svg('circle', {
      class: 'mine-ring-arc', cx: 30, cy: 30, r: RING_R,
      'stroke-dasharray': RING_LEN.toFixed(1), 'stroke-dashoffset': RING_LEN.toFixed(1),
    });
    this.ring.append(this.ringArc);
    this.beamLabel = el('div', 'mine-label is-hidden');
    this.lock = el('div', 'lock-bracket is-hidden');
    for (const c of ['tl', 'tr', 'bl', 'br']) this.lock.append(el('i', `lock-c lock-${c}`));
    this.hit = el('div', 'hit-marker');
    this.box.append(this.ring, this.beamLabel, this.lock, this.hit);
  }

  buildOverlays() {
    this.lowVig = el('div', 'vig vig-low');
    this.flashVig = el('div', 'vig vig-flash');
    this.box.prepend(this.lowVig, this.flashVig);
  }

  // 'space' | 'surface' show their bars; anything else hides the whole layer.
  setMode(mode) {
    const m = mode === 'space' || mode === 'surface' ? mode : 'hidden';
    if (this.mode === m) return;
    this.mode = m;
    this.box.dataset.mode = m;
    this.cache = {};
    if (m === 'hidden') this.setLow(false);
  }

  // True when key's value differs from last frame (and remembers it).
  changed(key, value) {
    if (this.cache[key] === value) return false;
    this.cache[key] = value;
    return true;
  }

  update(player, extra = {}) {
    if (this.mode === 'hidden' || !player) return;
    if (this.mode === 'space') this.updateSpace(player.ship, extra);
    else this.updateSurface(player.suit, extra);
    this.updateThreat(extra.wanted ?? 0, extra.hostiles ?? 0);
    this.updateBeam(extra.beam ?? null);
    if (this.changed('storm', !!extra.storm)) show(this.storm, !!extra.storm);
    if (this.changed('lock', !!extra.lock)) show(this.lock, !!extra.lock);
  }

  updateSpace(ship, extra) {
    const { bars } = this.spaceBars;
    setBar(bars.shield, ship.shield);
    setBar(bars.hull, ship.hull);
    setBar(bars.energy, ship.energy);
    const noBoost = extra.boostAllowed === false;
    if (this.changed('noBoost', noBoost)) bars.energy.row.classList.toggle('is-off', noBoost);
    this.setLow(ship.hull < LOW);
    if (this.changed('hazardOn', false)) show(this.hazard, false);
  }

  updateSurface(suit, extra) {
    const { bars } = this.surfaceBars;
    setBar(bars.health, suit.health);
    setBar(bars.lifeSupport, suit.lifeSupport);
    setBar(bars.hazard, suit.hazard);
    this.setLow(suit.health < LOW);
    const now = performance.now();
    if (suit.hazard < this.prevHazard - 1e-6) this.lastDrain = now;
    this.prevHazard = suit.hazard;
    const draining = extra.hazard ?? now - this.lastDrain < DRAIN_HOLD_MS;
    if (this.changed('hazardOn', !!draining)) show(this.hazard, !!draining);
  }

  setLow(low) {
    if (this.changed('low', low)) this.lowVig.classList.toggle('is-on', low);
  }

  updateThreat(wanted, hostiles) {
    const w = Math.max(0, Math.min(5, Math.round(wanted)));
    const h = Math.max(0, Math.round(hostiles));
    if (this.changed('wanted', w)) this.starEls.forEach((s, i) => s.classList.toggle('on', i < w));
    if (this.changed('hostiles', h)) {
      this.hostiles.textContent = `Musuh: ${h}`;
      show(this.hostiles, h > 0);
    }
    if (this.changed('threat', w > 0 || h > 0)) show(this.threat, w > 0 || h > 0);
  }

  updateBeam(beam) {
    if (this.changed('beamOn', !!beam)) {
      this.ring.classList.toggle('is-hidden', !beam);
      show(this.beamLabel, !!beam);
    }
    if (!beam) return;
    if (this.changed('beamLabel', beam.label ?? '')) this.beamLabel.textContent = beam.label ?? '';
    const pct = Math.round(Math.max(0, Math.min(1, beam.progress ?? 0)) * 100);
    if (this.changed('beamPct', pct)) {
      this.ringArc.setAttribute('stroke-dashoffset', (RING_LEN * (1 - pct / 100)).toFixed(1));
    }
  }

  // Brief edge vignette: blue for shield, red for hull/suit.
  damageFlash(kind = 'hull') {
    this.flashVig.classList.toggle('is-shield', kind === 'shield');
    this.restart(this.flashVig, 'is-on', 'flashTimer', FLASH_MS);
  }

  // Small X flash at the crosshair.
  hitMarker() {
    this.restart(this.hit, 'is-on', 'hitTimer', HIT_MS);
  }

  // Re-trigger a CSS animation class and drop it after ms.
  restart(node, cls, timerKey, ms) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
    clearTimeout(this[timerKey]);
    this[timerKey] = setTimeout(() => node.classList.remove(cls), ms);
  }
}
