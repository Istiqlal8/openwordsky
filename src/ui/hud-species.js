// Species catalog section of the scan panel: fauna and flora cards with lore.
import { el, hexCss } from './dom.js';
import { MOVE_LABELS, BODY_LABELS, FEATURE_LABELS } from '../gen/species.js';
import { pickKind } from '../view/life/dinos.js';

const DINO = { rex: 'T-rex', raptor: 'Raptor', longneck: 'Leher panjang', triceratops: 'Triceratops' };
const SEA = { fish: 'Kawanan ikan', jelly: 'Ubur-ubur', whale: 'Leviatan' };

function card(color, name, lines) {
  const c = el('div', 'sp-card');
  const head = el('div', 'sp-head');
  const dot = el('span', 'sp-dot');
  dot.style.background = hexCss(color);
  head.append(dot, el('span', 'sp-name', name));
  c.append(head);
  for (const [cls, text] of lines) c.append(el('div', cls, text));
  return c;
}

function faunaCard(sp) {
  const g = sp.genes, l = sp.lore;
  const body = [BODY_LABELS[g.body] ?? g.body, MOVE_LABELS[g.move], g.legs ? `${g.legs} kaki` : 'tanpa kaki', `${g.eyes} mata`];
  if (g.heads > 1) body.push(`${g.heads} kepala`);
  if (g.horns) body.push(`${g.horns} tanduk`);
  for (const f of g.features ?? []) body.push(FEATURE_LABELS[f] ?? f);
  if (g.wings) body.push('bersayap');
  if (g.glow) body.push('bercahaya');
  return card(g.primary, sp.name, [
    ['sp-line', body.join(' · ')],
    ['sp-line', `${l.temperament} · ${l.diet} · ${l.height} m · ${l.weight} kg`],
    ['sp-quirk', l.quirk],
  ]);
}

function floraCard(sp) {
  const g = sp.genes;
  const traits = [sp.label, `${g.height.toFixed(1)} m`];
  if (g.glow) traits.push('bercahaya');
  return card(g.primary, sp.name, [['sp-line', traits.join(' · ')], ['sp-quirk', sp.quirk]]);
}

function section(title, cards) {
  const s = el('div', 'sp-section');
  s.append(el('div', 'scan-key', title));
  if (!cards.length) s.append(el('div', 'sp-line', 'Tidak ada'));
  s.append(...cards);
  return s;
}

export function speciesSection(planet) {
  const wrap = el('div', 'sp-wrap');
  const { fauna, flora } = planet.species;
  const extra = [];
  if (planet.fauna.dinos) extra.push(['Dinosaurus', DINO[pickKind(planet)]]);
  if (planet.sea.count) extra.push(['Laut', SEA[planet.sea.kind]]);
  wrap.append(section(`Fauna · ${fauna.length} spesies`, fauna.map(faunaCard)));
  for (const [k, v] of extra) {
    const r = el('div', 'scan-row');
    r.append(el('span', 'scan-key', k), el('span', 'scan-val', v));
    wrap.append(r);
  }
  wrap.append(section(`Flora · ${flora.length} spesies`, flora.map(floraCard)));
  return wrap;
}
