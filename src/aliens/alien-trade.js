// Vendor trades: the alien asks for one of its race's favourite goods that the player
// carries, and pays in Nanit or rare items. Without goods it shares lore (and a one-time gift).
import { Rng, hash32 } from '../core/rng.js';
import { thanksLine, byeLine, loreLine, greetLine } from './races.js';

const STOCK = 3; // trades per vendor per landing

// vendor: { name, race, seed, trades, gifted }
export function createVendorState(name, race, seed) {
  return { name, race, seed, trades: 0, gifted: false };
}

const MIN_GOODS = 3;

// Favourite good the player has the most of (at least MIN_GOODS units) -> { item, n } | null.
function pickGood(race, player) {
  let best = null;
  for (const item of race.wants) {
    const n = player.count(item);
    if (n >= MIN_GOODS && n > (best?.n ?? 0)) best = { item, n };
  }
  return best;
}

// Payment roll: mostly Nanit, sometimes the race's special gift, rarely an ancient artefact.
function rollPay(rng, race, need) {
  const r = rng.next();
  if (r < 0.12) return { item: 'Artefak Kuno', n: 1 };
  if (r < 0.4) return { item: race.gifts === 'Nanit' ? 'Kristal Alien' : race.gifts, n: 1 + rng.int(2) };
  return { item: 'Nanit', n: need * 3 + rng.int(20) };
}

function noGoods(v, player, rng) {
  const wish = v.race.wants.slice(0, 3).join(', ');
  const title = `${v.name} · ${v.race.name}`;
  if (!v.gifted) {
    v.gifted = true;
    const n = 5 + rng.int(11);
    player.addItem('Nanit', n);
    return { title, text: `${greetLine(v.race, rng)} Hadiah: +${n} Nanit. Kami mencari ${wish}.` };
  }
  return { title, text: `"${loreLine(v.race, rng)}" Bawa ${wish} untuk berdagang.` };
}

// Do one interaction with the vendor -> { title, text } (toast-ready).
export function tradeWith(v, player) {
  const rng = new Rng(hash32(v.seed, v.trades, v.gifted ? 1 : 0));
  const title = `${v.name} · ${v.race.name}`;
  if (v.trades >= STOCK) return { title, text: byeLine(v.race) };
  const good = pickGood(v.race, player);
  if (!good) return noGoods(v, player, rng);
  const need = Math.min(good.n, 5 + rng.int(11));
  const pay = rollPay(rng, v.race, need);
  if (!player.removeItem(good.item, need)) return noGoods(v, player, rng);
  player.addItem(pay.item, pay.n);
  v.trades++;
  player.emit('act', { type: 'alienTrade', race: v.race.id });
  return { title, text: `Tukar ${need} ${good.item} → ${pay.n} ${pay.item}. ${thanksLine(v.race)}` };
}
