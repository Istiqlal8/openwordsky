// Player settings (graphics, audio, controls, key bindings), kept in localStorage apart from the save.
const KEY = 'openworldsky.settings';

export const DEFAULTS = {
  quality: 'tinggi', master: 1, music: 1, sfx: 1, sens: 1, invertY: false, hints: true,
  keys: {}, // logical code -> physical code, only for rebound actions
};

// Rebindable actions: [logical code, label]. The logical code is what the game code checks.
export const ACTIONS = [
  ['KeyQ', 'Ambil hasil hewan'], ['KeyJ', 'Jurnal misi'], ['KeyK', 'Ganti kontrak'], ['KeyU', 'Racik / pasar'],
  ['KeyL', 'Buku koleksi'], ['KeyO', 'Papan kargo'], ['KeyY', 'Mode bangun / armada'], ['KeyT', 'Interaksi'],
  ['KeyG', 'Isi suit / daya'], ['KeyF', 'Pindai'], ['KeyM', 'Peta galaksi'], ['KeyN', 'Zoom peta mini'],
];

// Keys the game uses for fixed controls; an action can never be moved onto one of these.
const FIXED = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyR', 'KeyC', 'KeyV', 'KeyH', 'KeyB', 'KeyI', 'KeyZ',
  'KeyX', 'KeyP', 'Space', 'Tab', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'Escape', 'Enter',
  'NumpadEnter', 'Backspace', 'Backquote', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'MetaLeft', 'MetaRight'];

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...DEFAULTS, ...raw, keys: { ...(raw.keys ?? {}) } };
  } catch {
    return { ...DEFAULTS, keys: {} };
  }
}

export const settings = read();
const listeners = [];

export function onSettings(fn) { listeners.push(fn); }

export function setSetting(name, value) {
  settings[name] = value;
  saveSettings();
}

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* storage blocked */ }
  for (const fn of listeners) fn(settings);
}

export function boundKey(logical) { return settings.keys[logical] ?? logical; }

// Short label for a KeyboardEvent code: KeyJ -> J, Digit3 -> 3, Backquote -> `.
export function keyLabel(code) {
  const c = boundKey(code);
  if (/^Key[A-Z]$/.test(c)) return c.slice(3);
  if (/^Digit\d$/.test(c)) return c.slice(5);
  return { Backquote: '`', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', BracketLeft: '[',
    BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=' }[c] ?? c;
}

// Why `physical` cannot take over `logical`, or '' when it can.
export function bindProblem(logical, physical) {
  if (/^Digit\d$/.test(physical) || /^F\d+$/.test(physical) || FIXED.includes(physical)) return 'Tombol itu dipakai kontrol tetap';
  const taken = ACTIONS.find(([l]) => l !== logical && boundKey(l) === physical);
  return taken ? `Sudah dipakai: ${taken[1]}` : '';
}

export function bindKey(logical, physical) {
  if (physical === logical) delete settings.keys[logical];
  else settings.keys[logical] = physical;
  saveSettings();
}

// Physical -> logical translation for Input: '' mutes a key whose action moved elsewhere.
export function remapTable(keys = settings.keys) {
  const map = {};
  const moved = Object.entries(keys).filter(([l, p]) => l !== p);
  for (const [logical] of moved) map[logical] = '';
  for (const [logical, physical] of moved) map[physical] = logical;
  return map;
}
