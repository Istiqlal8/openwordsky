// Scanner result panel (right side) with the full planet readout.
import { el, clear, show, fmtTemp, fmtGravity, meter, hazardIcon } from './dom.js';
import { speciesSection } from './hud-species.js';
import { breathable } from '../gameplay/life-support.js';

const AUTO_HIDE_MS = 8000;

function densityLabel(d) {
  if (d < 0.05) return 'Tidak ada';
  if (d < 0.3) return 'Jarang';
  if (d < 0.65) return 'Sedang';
  return 'Lebat';
}

function row(label, value) {
  const r = el('div', 'scan-row');
  r.append(el('span', 'scan-key', label), el('span', 'scan-val', value));
  return r;
}

function meterRow(label, value) {
  const r = el('div', 'scan-row');
  const v = el('span', 'scan-val');
  v.append(meter(value, 5));
  r.append(el('span', 'scan-key', label), v);
  return r;
}

export class ScanPanel {
  constructor(parent) {
    this.root = el('div', 'panel scan is-hidden');
    this.timer = 0;
    parent.append(this.root);
  }

  show(planet, isNew) {
    clear(this.root);
    if (isNew) this.root.append(el('div', 'scan-banner', 'Penemuan baru'));
    this.root.append(this.header(planet), this.body(planet));
    show(this.root, true);
    this.root.classList.remove('scan-in');
    void this.root.offsetWidth; // restart entry animation
    this.root.classList.add('scan-in');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.hide(), AUTO_HIDE_MS);
  }

  get isOpen() {
    return !this.root.classList.contains('is-hidden');
  }

  hide() {
    clearTimeout(this.timer);
    show(this.root, false);
  }

  header(p) {
    const head = el('div', 'scan-head');
    head.append(el('div', 'panel-label', 'Hasil pindai'));
    head.append(el('div', 'scan-name', p.name));
    head.append(el('div', 'scan-biome', p.biome.label));
    return head;
  }

  body(p) {
    const body = el('div', 'scan-body');
    body.append(
      row('Suhu', fmtTemp(p.temperature)),
      row('Gravitasi', fmtGravity(p.gravity)),
      row('Atmosfer', p.atmosphere),
      row('Udara', breathable(p) ? 'Layak hirup' : 'Butuh oksigen'),
      row('Cuaca', p.weather),
      this.hazardRow(p.hazard),
      meterRow('Radiasi', p.radiation),
      meterRow('Toksisitas', p.toxicity),
      row('Vegetasi', densityLabel(p.flora.density)),
      row('Bulan', String(p.moons)),
      row('Cincin', p.rings ? 'Ada' : 'Tidak'),
      this.resources(p.resources),
      speciesSection(p),
    );
    return body;
  }

  hazardRow(hazard) {
    const r = row('Bahaya', hazard ?? 'Aman');
    if (hazard) {
      r.classList.add('is-danger');
      r.lastChild.prepend(hazardIcon());
    }
    return r;
  }

  resources(list) {
    const box = el('div', 'scan-res');
    box.append(el('div', 'scan-key', 'Sumber daya'));
    const tags = el('div', 'tags');
    for (const name of list) tags.append(el('span', 'tag', name));
    box.append(tags);
    return box;
  }
}
