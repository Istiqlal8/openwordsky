// Editor widgets built from SECTIONS: tabs, button groups, sliders, toggles, color pickers, name field.
// Each widget writes into the spec via onChange(path, value) and re-syncs from the spec on refresh().
import { el } from '../dom.js';
import { SECTIONS, getPath } from './shipyard-schema.js';

function field(label, control) {
  const row = el('label', 'sy-field');
  row.append(el('span', 'sy-field-label', label), control);
  return row;
}

function choice(f, change) {
  const group = el('div', 'sy-choices');
  const buttons = f.options.map(([value, text]) => {
    const b = el('button', 'sy-choice', text);
    b.type = 'button';
    b.onclick = () => change(f.key, value);
    group.append(b);
    return { b, value };
  });
  const sync = (v) => { for (const { b, value } of buttons) b.classList.toggle('is-on', value === v); };
  const row = el('div', 'sy-field');
  row.append(el('span', 'sy-field-label', f.label), group);
  return { node: row, sync };
}

function range(f, change) {
  const input = el('input', 'sy-range');
  Object.assign(input, { type: 'range', min: f.min, max: f.max, step: f.step });
  const out = el('span', 'sy-value');
  input.oninput = () => { out.textContent = Number(input.value).toFixed(2); change(f.key, Number(input.value)); };
  const wrap = el('div', 'sy-range-wrap');
  wrap.append(input, out);
  const sync = (v) => { input.value = v; out.textContent = Number(v).toFixed(2); };
  return { node: field(f.label, wrap), sync };
}

function toggle(f, change) {
  const b = el('button', 'sy-toggle', f.label);
  b.type = 'button';
  b.onclick = () => change(f.key, !b.classList.contains('is-on'));
  const sync = (v) => { b.classList.toggle('is-on', Boolean(v)); b.setAttribute('aria-pressed', String(Boolean(v))); };
  return { node: b, sync };
}

function color(f, change) {
  const input = el('input', 'sy-color');
  input.type = 'color';
  input.oninput = () => change(f.key, input.value);
  return { node: field(f.label, input), sync: (v) => { input.value = v; } };
}

function text(f, change) {
  const input = el('input', 'sy-text');
  Object.assign(input, { type: 'text', maxLength: f.max, spellcheck: false, autocomplete: 'off' });
  input.oninput = () => change(f.key, input.value);
  const sync = (v) => { if (document.activeElement !== input) input.value = v; };
  return { node: field(f.label, input), sync };
}

const WIDGETS = { choice, range, toggle, color, text };

// One section page; toggles are collected into a wrapping row at the bottom.
function buildPage(sec, onChange, widgets) {
  const page = el('div', 'sy-page');
  const toggles = el('div', 'sy-toggles');
  for (const f of sec.fields) {
    const w = WIDGETS[f.type](f, onChange);
    (f.type === 'toggle' ? toggles : page).append(w.node);
    widgets.push({ key: f.key, sync: w.sync });
  }
  if (toggles.childElementCount) page.append(toggles);
  return page;
}

// Builds tabs + section bodies into `host`. Returns { refresh(spec) }.
export function buildControls(host, onChange) {
  const tabs = el('div', 'sy-tabs');
  const body = el('div', 'sy-body');
  const widgets = [], pages = [];
  for (const [i, sec] of SECTIONS.entries()) {
    const page = buildPage(sec, onChange, widgets);
    const tab = el('button', 'sy-tab', sec.label);
    tab.type = 'button';
    tab.onclick = () => select(i);
    pages.push({ tab, page });
    tabs.append(tab);
    body.append(page);
  }
  function select(i) {
    pages.forEach((p, j) => { p.tab.classList.toggle('is-on', i === j); p.page.hidden = i !== j; });
  }
  select(0);
  host.append(tabs, body);
  return { refresh: (spec) => { for (const w of widgets) w.sync(getPath(spec, w.key)); } };
}
