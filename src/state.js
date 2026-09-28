// Save game: galaxy seed, where the player is, what they discovered.
const KEY = 'openworldsky.save.v1';

function fresh() {
  return { galaxySeed: 1337, systemIndex: 0, visited: [0], discoveries: {} };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...fresh(), ...JSON.parse(raw) } : fresh();
  } catch {
    return fresh();
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // storage blocked: progress just won't persist
  }
}

export function markVisited(save, systemIndex) {
  save.systemIndex = systemIndex;
  if (!save.visited.includes(systemIndex)) save.visited.push(systemIndex);
  writeSave(save);
}

// Returns true when this planet is a new discovery.
export function recordDiscovery(save, planet) {
  if (save.discoveries[planet.key]) return false;
  save.discoveries[planet.key] = { name: planet.name, biome: planet.biome.label, at: Date.now() };
  writeSave(save);
  return true;
}

export function discoveryCount(save) {
  return Object.keys(save.discoveries).length;
}
