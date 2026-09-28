// Raid progress shared between the meta addon (journal, contracts, HUD) and the two fight
// drivers. Bound to the save at log.s.raid by RaidMeta; falls back to memory before binding.
import { RAIDS, RAID_IDS, contractReward } from './raid-data.js';

const CONTRACT_MS = 20 * 60 * 1000; // a timed contract lives 20 real minutes
const OFFER_GAP_MS = 6 * 60 * 1000; // a new offer at most this often

let state = fresh();
const listeners = [];

function fresh() {
  // defeated: id -> { at, where }; found: id -> where; contract: { id, until } | null
  return { defeated: {}, found: {}, contract: null, nextOffer: 0, kills: 0 };
}

export function bindRaidStore(saved) {
  state = saved;
  state.defeated ??= {};
  state.found ??= {};
  state.contract ??= null;
  state.nextOffer ??= 0;
  state.kills ??= 0;
}

export const raidState = () => state;
export const onRaidChange = (cb) => listeners.push(cb);
const fire = () => listeners.forEach((cb) => cb());

export const isBeaten = (id) => Boolean(state.defeated[id]);
export const beatenCount = () => Object.keys(state.defeated).length;

export function markFound(id, where) {
  if (state.found[id] === where) return false;
  state.found[id] = where;
  fire();
  return true;
}

export function markBeaten(id, where) {
  state.defeated[id] = { at: Date.now(), where };
  state.kills++;
  if (state.contract?.id === id) state.contract = null;
  fire();
}

export const activeContract = () => {
  const c = state.contract;
  if (!c) return null;
  if (Date.now() > c.until) { state.contract = null; fire(); return null; }
  return c;
};

export const contractLeft = () => Math.max(0, Math.round(((state.contract?.until ?? 0) - Date.now()) / 1000));

// Offers a timed contract on a boss the player has not beaten yet. -> the contract or null.
export function offerContract(now = Date.now()) {
  if (state.contract || now < state.nextOffer) return null;
  const open = RAID_IDS.filter((id) => !isBeaten(id));
  if (!open.length) return null;
  const id = open[Math.floor(Math.random() * open.length)];
  state.contract = { id, until: now + CONTRACT_MS, reward: contractReward(RAIDS[id], state.kills) };
  state.nextOffer = now + OFFER_GAP_MS + CONTRACT_MS;
  fire();
  return state.contract;
}

export function dropContract() {
  if (!state.contract) return false;
  state.contract = null;
  state.nextOffer = Date.now() + OFFER_GAP_MS;
  fire();
  return true;
}
