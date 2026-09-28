// The rival that did not let it go.
//
// Beating a duellist can leave it with a grudge: it rebuilds, repaints itself in its own scars
// and comes looking — not on the usual random timer, but in the system the player warps into
// next, and on the ground if they land to shake it off. Every time it loses it returns one level
// meaner, until the last level, which it does not walk away from.
//
// The frame is the same frame: same ship seed, same silhouette, darker paint. Recognising it is
// the point, so nothing here changes what it is built from — only how hard it hits.
import { RIVALS } from './duel-data.js';

const FIRST_CHANCE = 0.55;   // a beaten rival holds a grudge this often; after that it always does
const MAX_LEVEL = 4;         // beyond this it stays dead
const EPITHET = ['', 'Pendendam', 'Bangkit', 'Tak Mati', 'Bayangan'];

// Darken one hex channel-wise: the hull chars a little more with every defeat.
function scorch(hex, k) {
  const r = Math.round(((hex >> 16) & 0xff) * k);
  const g = Math.round(((hex >> 8) & 0xff) * k);
  const b = Math.round((hex & 0xff) * k);
  return (r << 16) | (g << 8) | b;
}

// The same rival, rebuilt harder. Keeps `id` so wins keep counting against the one machine.
// `level` is clamped: noteWin() never stores more than MAX_LEVEL, but a hand-edited save or the
// debug handle can, and an unnamed nemesis reads as a bug to the player.
function scarred(def, level) {
  const lv = Math.max(1, Math.min(level, MAX_LEVEL));
  const k = 1 + lv * 0.35, dark = Math.max(0.35, 1 - lv * 0.18);
  return {
    ...def,
    nemesis: lv,
    name: `${def.name} ${EPITHET[lv]}`.trim(),
    palette: { hull: scorch(def.palette.hull, dark), trim: scorch(def.palette.trim, dark), glow: def.palette.glow },
    hp: { space: Math.round(def.hp.space * k), ground: Math.round(def.hp.ground * k) },
    speed: { space: def.speed.space * (1 + lv * 0.06), ground: def.speed.ground * (1 + lv * 0.06) },
    gun: { ...def.gun, gap: def.gun.gap / (1 + lv * 0.12), damage: Math.round(def.gun.damage * (1 + lv * 0.15)) },
    blade: { ...def.blade, gap: def.blade.gap / (1 + lv * 0.1), damage: Math.round(def.blade.damage * (1 + lv * 0.12)) },
    guard: { ...def.guard, time: def.guard.time * (1 + lv * 0.1) },
    reward: {
      nanit: Math.round(def.reward.nanit * k), xp: Math.round(def.reward.xp * k),
      items: [...def.reward.items, ['Serpih Dendam', lv]],
    },
    hail: `${def.name} menemukanmu lagi — "kali ini tidak ada yang pulang."`,
    taunt: `${def.name} tidak menahan apa pun!`,
  };
}

// Called on every duel win. -> true when the wreck is still transmitting, i.e. it will be back.
export function noteWin(state, def) {
  const level = (def.nemesis ?? 0) + 1;
  if (level > MAX_LEVEL) { clearGrudge(state); return false; }
  if (level === 1 && Math.random() > FIRST_CHANCE) { clearGrudge(state); return false; }
  state.grudge = { id: def.id, level };
  return true;
}

// The rival that is currently hunting the player, already scarred, or null.
export function nemesisOf(state) {
  const g = state?.grudge;
  const base = g && RIVALS[g.id];
  return base ? scarred(base, g.level) : null;
}

export function clearGrudge(state) {
  if (state) state.grudge = null;
}

export const grudgeLevel = (state) => state?.grudge?.level ?? 0;
