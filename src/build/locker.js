// Locker contents: the player moves items in and out by hand, one click at a time (shift = all).
// Nothing ever moves on its own.
const SLOTS = 24;      // how many different items one locker holds
const SKIP = new Set(['Nanit']);

const storeOf = (piece) => ((piece.data ??= {}).items ??= {});

// -> rows for the list panel: what can go in, then what is inside.
export function lockerView(piece, player) {
  const store = storeOf(piece);
  const inside = Object.entries(store).filter(([, n]) => n > 0).sort(([a], [b]) => a.localeCompare(b));
  const carried = Object.entries(player.inventory).filter(([name, n]) => n > 0 && !SKIP.has(name))
    .sort(([a], [b]) => a.localeCompare(b));
  const rows = carried.map(([name, n], i) => ({ head: i ? '' : 'Simpan (dari tas)', label: name, right: `×${n}`,
    ok: inside.length < SLOTS || name in store, run: (all) => deposit(piece, player, name, all ? n : 1) }));
  const out = inside.map(([name, n], i) => ({ head: i ? '' : `Isi loker (${inside.length}/${SLOTS})`, label: name,
    right: `×${n}`, run: (all) => withdraw(piece, player, name, all ? n : 1) }));
  return [...rows, ...out];
}

function deposit(piece, player, name, n) {
  const store = storeOf(piece);
  if (!(name in store) && Object.keys(store).length >= SLOTS) return 'Loker penuh';
  if (!player.removeItem(name, n)) return null;
  store[name] = (store[name] ?? 0) + n;
  return `Disimpan ${n} ${name}`;
}

function withdraw(piece, player, name, n) {
  const store = storeOf(piece);
  const take = Math.min(n, store[name] ?? 0);
  if (!take) return null;
  store[name] -= take;
  if (store[name] <= 0) delete store[name];
  player.addItem(name, take);
  return `Diambil ${take} ${name}`;
}

// Everything a locker holds, for the journal card.
export function lockerCount(piece) {
  return Object.values(storeOf(piece)).reduce((a, b) => a + b, 0);
}
