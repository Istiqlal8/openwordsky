// Shared legend progress. The journal addon binds it to the save (log.s.legend);
// the surface addon reads/writes it. Falls back to an in-memory object before binding.
let state = fresh();
const listeners = [];

function fresh() {
  return { defeated: {}, seen: {} }; // defeated: planetKey -> legend id, seen: legend id -> planet name
}

export function bindLegendStore(saved) {
  state = saved;
  state.defeated ??= {};
  state.seen ??= {};
}

export const legendState = () => state;

export function onLegendChange(cb) { listeners.push(cb); }

export function markSeen(id, planetName) {
  if (state.seen[id]) return;
  state.seen[id] = planetName;
  listeners.forEach((cb) => cb());
}

export function markDefeated(planetKey, id) {
  state.defeated[planetKey] = id;
  listeners.forEach((cb) => cb());
}

export const isDefeated = (planetKey) => Boolean(state.defeated[planetKey]);

export const defeatedIds = () => new Set(Object.values(state.defeated));
