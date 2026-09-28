// Editor fields of the DIY capital-ship yard: what can be picked, and the widgets that pick it.
// Every widget writes through onChange(key, value) and re-syncs from the spec on refresh().
import { el } from '../ui/dom.js';
import { ARCHETYPE_IDS, ARCHETYPE_LABELS, BRIDGE_STYLES, BRIDGE_LABELS, LIMITS } from './fleet-spec.js';

const nums = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => [a + i, String(a + i)]);

export const FIELDS = [
  { type: 'choice', key: 'archetype', label: 'Rangka', wide: true,
    options: ARCHETYPE_IDS.map((id) => [id, ARCHETYPE_LABELS[id]]) },
  { type: 'range', key: 'size', label: 'Ukuran', min: LIMITS.size[0], max: LIMITS.size[1], step: 0.05 },
  { type: 'choice', key: 'engines', label: 'Pendorong tambahan', options: nums(...LIMITS.engines) },
  { type: 'choice', key: 'towers', label: 'Tiang antena', options: nums(...LIMITS.towers) },
  { type: 'choice', key: 'cargo', label: 'Rak kargo', options: nums(...LIMITS.cargo) },
  { type: 'choice', key: 'bridgeStyle', label: 'Jembatan', options: BRIDGE_STYLES.map((b) => [b, BRIDGE_LABELS[b]]) },
  { type: 'color', key: 'hull', label: 'Warna lambung' },
  { type: 'color', key: 'accent', label: 'Warna aksen' },
  { type: 'color', key: 'glow', label: 'Warna nyala' },
  { type: 'text', key: 'name', label: 'Nama kapal', max: 22 },
];

function row(label, control) {
  const wrap = el('div', 'fl-field');
  wrap.append(el('span', 'fl-field-label', label), control);
  return wrap;
}

function choice(f, change) {
  const group = el('div', `fl-choices${f.wide ? ' is-wide' : ''}`);
  const items = f.options.map(([value, text]) => {
    const b = el('button', 'fl-choice', text);
    b.type = 'button';
    b.onclick = () => change(f.key, value);
    group.append(b);
    return { b, value };
  });
  return { node: row(f.label, group), sync: (v) => { for (const i of items) i.b.classList.toggle('is-on', i.value === v); } };
}

function range(f, change) {
  const input = el('input', 'fl-range');
  Object.assign(input, { type: 'range', min: f.min, max: f.max, step: f.step });
  const out = el('span', 'fl-value');
  input.oninput = () => { out.textContent = Number(input.value).toFixed(2); change(f.key, Number(input.value)); };
  const wrap = el('div', 'fl-range-wrap');
  wrap.append(input, out);
  return { node: row(f.label, wrap), sync: (v) => { input.value = v; out.textContent = Number(v).toFixed(2); } };
}

function color(f, change) {
  const input = el('input', 'fl-color');
  input.type = 'color';
  input.oninput = () => change(f.key, input.value);
  return { node: row(f.label, input), sync: (v) => { input.value = v; } };
}

function text(f, change) {
  const input = el('input', 'fl-text');
  Object.assign(input, { type: 'text', maxLength: f.max, spellcheck: false, autocomplete: 'off' });
  input.oninput = () => change(f.key, input.value);
  return { node: row(f.label, input), sync: (v) => { if (document.activeElement !== input) input.value = v; } };
}

const WIDGETS = { choice, range, color, text };

// Builds every field into `host`. Returns { refresh(spec) }.
export function buildFields(host, onChange) {
  const body = el('div', 'fl-body');
  const widgets = [];
  for (const f of FIELDS) {
    const w = WIDGETS[f.type](f, onChange);
    body.append(w.node);
    widgets.push({ key: f.key, sync: w.sync });
  }
  host.append(body);
  return { refresh: (spec) => { for (const w of widgets) w.sync(spec[w.key]); } };
}
