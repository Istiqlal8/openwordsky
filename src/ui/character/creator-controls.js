// Creator widgets built from SECTIONS: tabs, option buttons, sliders, toggles, colour pickers, name field.
// Every widget writes into the look through onChange(path, value) and re-syncs on refresh(look).
import { el } from '../dom.js';
import { SECTIONS, getPath, kindOf, fits } from './creator-schema.js';

function field(label, control) {
  const row = el('label', 'cc-field');
  row.append(el('span', 'cc-field-label', label), control);
  return row;
}

function choice(f, change) {
  const group = el('div', 'cc-choices');
  const buttons = f.options.map(([value, text]) => {
    const b = el('button', 'cc-choice', text);
    b.type = 'button';
    b.onclick = () => change(f.key, value);
    group.append(b);
    return { b, value };
  });
  const row = el('div', 'cc-field');
  row.append(el('span', 'cc-field-label', f.label), group);
  return { node: row, sync: (v) => { for (const { b, value } of buttons) b.classList.toggle('is-on', value === v); } };
}

function range(f, change) {
  const input = el('input', 'cc-range');
  Object.assign(input, { type: 'range', min: f.min, max: f.max, step: f.step });
  const out = el('span', 'cc-value');
  input.oninput = () => { out.textContent = Number(input.value).toFixed(2); change(f.key, Number(input.value)); };
  const wrap = el('div', 'cc-range-wrap');
  wrap.append(input, out);
  return { node: field(f.label, wrap), sync: (v) => { input.value = v; out.textContent = Number(v).toFixed(2); } };
}

function toggle(f, change) {
  const b = el('button', 'cc-toggle', f.label);
  b.type = 'button';
  b.onclick = () => change(f.key, !b.classList.contains('is-on'));
  return { node: b, sync: (v) => { b.classList.toggle('is-on', Boolean(v)); b.setAttribute('aria-pressed', String(Boolean(v))); } };
}

function color(f, change) {
  const input = el('input', 'cc-color');
  input.type = 'color';
  input.oninput = () => change(f.key, input.value);
  return { node: field(f.label, input), sync: (v) => { input.value = v; } };
}

function text(f, change) {
  const input = el('input', 'cc-text');
  Object.assign(input, { type: 'text', maxLength: f.max ?? 16, spellcheck: false, autocomplete: 'off' });
  input.oninput = () => change(f.key, input.value);
  return { node: field(f.label, input), sync: (v) => { if (document.activeElement !== input) input.value = v; } };
}

const WIDGETS = { choice, range, toggle, color, text };

function buildPage(sec, onChange, widgets) {
  const page = el('div', 'cc-page');
  for (const f of sec.fields) {
    const w = WIDGETS[f.type](f, onChange);
    page.append(w.node);
    widgets.push({ field: f, node: w.node, sync: w.sync });
  }
  return page;
}

// Builds tabs + pages into `host`. onTab(section) fires when the player switches tab.
// Returns { refresh(look) } which also hides the fields that don't apply to the chosen species.
export function buildControls(host, onChange, onTab) {
  const tabs = el('div', 'cc-tabs');
  const body = el('div', 'cc-body');
  const widgets = [], pages = [];
  for (const [i, sec] of SECTIONS.entries()) {
    const page = buildPage(sec, onChange, widgets);
    const tab = el('button', 'cc-tab', sec.label);
    tab.type = 'button';
    tab.onclick = () => select(i);
    pages.push({ sec, tab, page });
    tabs.append(tab);
    body.append(page);
  }
  function select(i) {
    pages.forEach((p, j) => { p.tab.classList.toggle('is-on', i === j); p.page.hidden = i !== j; });
    onTab?.(pages[i].sec);
  }
  select(0);
  host.append(tabs, body);
  return { refresh: (look) => refresh(look, pages, widgets, select) };
}

function refresh(look, pages, widgets, select) {
  const kind = kindOf(look.species);
  for (const w of widgets) {
    w.node.classList.toggle('is-off', !fits(w.field, kind));
    w.sync(getPath(look, w.field.key));
  }
  let current = 0;
  pages.forEach((p, i) => {
    p.tab.classList.toggle('is-off', !fits(p.sec, kind));
    if (p.tab.classList.contains('is-on')) current = i;
  });
  if (!fits(pages[current].sec, kind)) select(0);
}
