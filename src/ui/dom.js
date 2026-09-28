// Small DOM + formatting helpers shared by HUD widgets. Text only, never innerHTML.
export function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function show(node, visible) {
  node.classList.toggle('is-hidden', !visible);
}

export function hexCss(hex) {
  return `#${(hex >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
}

export function fmtTemp(celsius) {
  return `${Math.round(celsius)}°C`;
}

export function fmtDistance(units) {
  return `${Math.round(units).toLocaleString('id-ID')} u`;
}

export function fmtGravity(g) {
  return `${Number(g).toFixed(1)} m/s²`;
}

// Key cap + label row, used by hints and the title cheat sheet.
export function keyRow(keys, label) {
  const row = el('div', 'keyrow');
  const caps = el('span', 'keyrow-keys');
  for (const k of String(keys).split(/ +/).filter((s) => s && s !== '/')) caps.append(el('kbd', 'key', k));
  row.append(caps, el('span', 'keyrow-label', label));
  return row;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

// Warning triangle icon for hazards.
export function hazardIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icon-hazard');
  const tri = document.createElementNS(SVG_NS, 'path');
  tri.setAttribute('d', 'M12 3 L22 20 L2 20 Z M12 9 L12 14 M12 16.5 L12 17.5');
  svg.append(tri);
  return svg;
}

// Segmented 0..max meter.
export function meter(value, max = 5) {
  const bar = el('span', 'meter');
  for (let i = 0; i < max; i++) {
    bar.append(el('i', i < value ? 'meter-seg on' : 'meter-seg'));
  }
  return bar;
}
