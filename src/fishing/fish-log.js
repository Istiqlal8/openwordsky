// Fish log in the save: log.s.fish = { caught, species: { [name]: { item, tier, biome, best, n, first } } }.

export function fishState(logState) {
  const s = (logState.fish ??= { caught: 0, species: {} });
  s.species ??= {};
  s.caught ??= 0;
  return s;
}

// -> { isNew, best } where best is true when this size beats the previous record.
export function recordCatch(s, fish, size) {
  s.caught++;
  const prev = s.species[fish.name];
  if (!prev) {
    s.species[fish.name] = { item: fish.item, tier: fish.tier, biome: fish.biome, best: size, n: 1, first: Date.now() };
    return { isNew: true, best: true };
  }
  prev.n++;
  if (size <= prev.best) return { isNew: false, best: false };
  prev.best = size;
  return { isNew: false, best: true };
}

// Species rows, rarest and biggest first.
const ORDER = { legendary: 0, rare: 1, endemic: 2, uncommon: 3, common: 4 };
export function speciesRows(s) {
  return Object.entries(s.species)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => (ORDER[a.tier] ?? 9) - (ORDER[b.tier] ?? 9) || b.best - a.best);
}
