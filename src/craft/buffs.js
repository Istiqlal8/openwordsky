// Timed food buffs. player.buffs = { buffId: expiresAt } on the craft buff clock (seconds of
// play, saved). Gameplay modules read buffMul(id) (or hasBuff) with minimal hooks.
import { owner } from './owner.js';

const REGEN_RATE = 1.5; // suit health per second

export const BUFFS = {
  warm: { name: 'Hangat', icon: '♨', mul: 0.5, effect: 'Kuras suhu ekstrem ×0.5' },
  sprint: { name: 'Lincah', icon: '»', mul: 1.3, effect: 'Lari +30%' },
  regen: { name: 'Pulih', icon: '✚', mul: 1, effect: `Kesehatan +${REGEN_RATE}/dtk` },
  toxic: { name: 'Kebal Racun', icon: '☣', mul: 0.5, effect: 'Kuras racun/radiasi ×0.5' },
};

export function hasBuff(id, player = owner.player) {
  return Boolean(player?.buffs?.[id]);
}

export function buffMul(id, player = owner.player) {
  return hasBuff(id, player) ? BUFFS[id].mul : 1;
}

export function buffClock() {
  return owner.state?.clock ?? 0;
}

// Starts (or extends) buffs; a longer remaining time is never cut short.
export function grantBuffs(player, ids, secs) {
  const until = buffClock() + secs;
  for (const id of ids) player.buffs[id] = Math.max(player.buffs[id] ?? 0, until);
}

// Called every playing frame: advances the clock, heals, drops expired buffs.
export function tickBuffs(player, dt) {
  if (!owner.state) return;
  const now = (owner.state.clock = (owner.state.clock ?? 0) + dt);
  if (hasBuff('regen', player) && !player.dead) {
    player.suit.health = Math.min(100, player.suit.health + REGEN_RATE * dt);
  }
  for (const [id, until] of Object.entries(player.buffs)) {
    if (until <= now || !BUFFS[id]) delete player.buffs[id];
  }
}

// -> [{ id, icon, name, left }] for the HUD, soonest to expire first.
export function activeBuffs(player) {
  const now = buffClock();
  return Object.entries(player.buffs ?? {})
    .filter(([id]) => BUFFS[id])
    .map(([id, until]) => ({ id, icon: BUFFS[id].icon, name: BUFFS[id].name, left: Math.max(0, Math.ceil(until - now)) }))
    .sort((a, b) => a.left - b.left);
}
