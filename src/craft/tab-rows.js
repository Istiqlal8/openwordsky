// Rows for the Dapur (cooking) and Pesawat (ship modules) tabs of the U panel.
// Each builder takes the CraftAddon (for costView/fail and the wiring) and returns panel rows.
import { affordable } from './recipes.js';
import { tierOf } from './upgrades.js';
import { DISHES, dishEffect, cookDish, eatDish } from './kitchen.js';
import { SHIP_MODS, shipMaxTier, installMod } from './ship-mods.js';

const ROMAN = ['0', 'I', 'II', 'III', 'IV'];

export function cookRows(addon) {
  const p = addon.w.player;
  const eat = DISHES.filter((d) => p.count(d.name) >= 1).map((d) => ({
    title: d.name, count: Math.floor(p.count(d.name)), sub: `${dishEffect(d)} · ${d.secs} dtk`,
    ok: true, button: 'Makan', run: () => eatDish(p, d.name) }));
  const cook = DISHES.map((d) => ({
    title: d.name, sub: `${dishEffect(d)} · ${d.secs} dtk`, cost: addon.costView(d.cost),
    ok: affordable(p, d.cost), button: 'Masak',
    run: () => (affordable(p, d.cost) ? cookDish(p, d) : addon.fail('Bahan belum cukup')) }));
  // Cooking first: a new dish adds an "eat" row below, so row numbers stay put while cooking.
  cook[0].head = 'Masak';
  if (eat[0]) eat[0].head = 'Makan';
  return [...cook, ...eat];
}

function modRow(addon, key) {
  const p = addon.w.player, m = SHIP_MODS[key];
  const t = tierOf(p, key), top = shipMaxTier(key), max = t >= top;
  const cost = max ? [] : m.tiers[t];
  return {
    title: m.name, tier: t, max: top, cost: addon.costView(cost), ok: !max && affordable(p, cost),
    sub: max ? `${m.desc(t, m)} · maks` : `${ROMAN[t + 1]}: ${m.desc(t + 1, m)}`,
    button: max ? '' : 'Pasang',
    run: () => {
      if (tierOf(p, key) >= top) return addon.fail('Sudah tingkat maksimum');
      return affordable(p, cost) ? installMod(p, key) : addon.fail('Bahan belum cukup');
    },
  };
}

export function shipRows(addon) {
  const rows = Object.keys(SHIP_MODS).map((key) => modRow(addon, key));
  rows[0].head = 'Modul pesawat · berlaku di semua kapal';
  return rows;
}
