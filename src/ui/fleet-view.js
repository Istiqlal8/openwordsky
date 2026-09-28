// Fleet tracker row + journal card (same look as quest cards).
import { el } from './dom.js';
import { bar } from './quest-panel.js';
import { clock } from './missions-view.js';
import { CLASSES, TYPE_BY_ID, xpToNext } from '../fleet/fleet-defs.js';

export function costText(cost) {
  return [`${cost.nanit} Nanit`, ...cost.items.map(([n, k]) => `${k} ${n}`)].join(' · ');
}

export function frigateLine(f) {
  return `${f.name} · ${CLASSES[f.cls]?.label ?? f.cls} · Lv ${f.level}`;
}

// Status text for one frigate: "siap", "Tambang 4:10", "selesai", "rusak".
export function statusText(fleet, f, now) {
  const st = fleet.status(f, now), e = fleet.expOf(f);
  if (st === 'away') return `${TYPE_BY_ID[e.type].label} ${clock((e.end - now) / 1000)}`;
  return { done: 'selesai', damaged: 'rusak', ready: 'siap' }[st];
}

export function fleetTrack(fleet, now) {
  const n = fleet.exps.length;
  if (!n) return null;
  const done = fleet.exps.filter((e) => e.end <= now).length, soon = fleet.soonest(now);
  const box = el('div', 'q-track is-fleet');
  const parts = [`Armada: ${n} ekspedisi`];
  if (soon) parts.push(`selesai dalam ${clock((soon - now) / 1000)}`);
  if (done) parts.push(`${done} menunggu (Y)`);
  box.append(el('div', 'q-title', parts.join(' · ')));
  const e = fleet.exps.find((x) => x.end === soon) ?? fleet.exps[0];
  box.append(bar(Math.min(e.end, now) - e.start, e.end - e.start));
  return box;
}

export function fleetCard(fleet, now) {
  const c = el('div', 'q-card is-fleet');
  c.append(el('div', 'q-tag', 'Armada · Y di angkasa'), el('div', 'q-title', `${fleet.frigates.length} fregat`));
  for (const f of fleet.frigates) {
    const line = el('div', 'q-line');
    line.append(el('span', 'q-goal', frigateLine(f)), el('span', 'q-num', statusText(fleet, f, now)));
    c.append(line, bar(f.xp, xpToNext(f.level)));
  }
  return c;
}
