// Touch controls for phones/tablets: left joystick → WASD, right-side drag → look,
// buttons → keys / mouse buttons. Feeds the same Input object the game already reads.
// [code, label, modes]
const BUTTONS = [
  ['mouse0', 'Tembak', 'space surface'], ['mouse2', 'Roket', 'space surface'], ['Space', 'Lompat', 'surface'],
  ['ShiftLeft', 'Boost', 'space surface'], ['KeyE', 'E', 'space surface'], ['KeyF', 'Pindai', 'space surface'],
  ['KeyG', 'Isi', 'space surface'], ['KeyT', 'Aksi', 'surface'], ['KeyM', 'Peta', 'space'], ['KeyR', 'Naik', 'space'], ['KeyC', 'Turun', 'space'],
  ['KeyV', 'Kamera', 'space surface'], ['KeyH', 'Hangar', 'space'], ['Tab', 'Tas', 'space surface'],
  ['KeyQ', 'Ambil', 'surface'], ['KeyJ', 'Misi', 'space surface'], ['KeyU', 'Racik', 'space surface'],
  ['KeyL', 'Koleksi', 'space surface'],
];
const LOOK_GAIN = 1.6;
const DEAD = 0.25;

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function press(input, code, down) {
  if (code.startsWith('mouse')) {
    const b = Number(code.slice(5));
    if (down) { input.buttons.add(b); input.justClicked.add(b); } else input.buttons.delete(b);
    return;
  }
  if (down) { if (!input.keys.has(code)) input.justPressed.add(code); input.keys.add(code); } else input.keys.delete(code);
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  n.className = cls;
  if (text) n.textContent = text;
  return n;
}

function buildJoystick(input, root) {
  const base = el('div', 'tc-stick');
  const knob = el('div', 'tc-knob');
  base.append(knob);
  root.append(base);
  let id = null;
  const set = (x, y) => {
    knob.style.transform = `translate(${x * 40}px, ${y * 40}px)`;
    press(input, 'KeyW', y < -DEAD); press(input, 'KeyS', y > DEAD);
    press(input, 'KeyA', x < -DEAD); press(input, 'KeyD', x > DEAD);
  };
  const move = (t) => {
    const r = base.getBoundingClientRect();
    let x = (t.clientX - r.left - r.width / 2) / 50, y = (t.clientY - r.top - r.height / 2) / 50;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    set(x, y);
  };
  base.addEventListener('touchstart', (e) => { e.preventDefault(); id = e.changedTouches[0].identifier; move(e.changedTouches[0]); });
  base.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === id) move(t); });
  base.addEventListener('touchend', (e) => { e.preventDefault(); id = null; set(0, 0); });
}

function buildButtons(input, root) {
  const pad = el('div', 'tc-pad');
  for (const [code, label, modes] of BUTTONS) {
    const b = el('button', 'tc-btn', label);
    for (const m of modes.split(' ')) b.classList.add(`tc-${m}`);
    b.addEventListener('touchstart', (e) => { e.preventDefault(); press(input, code, true); });
    b.addEventListener('touchend', (e) => { e.preventDefault(); press(input, code, false); });
    pad.append(b);
  }
  root.append(pad);
}

function bindLook(input, canvas) {
  const last = new Map();
  canvas.addEventListener('touchstart', (e) => { for (const t of e.changedTouches) last.set(t.identifier, [t.clientX, t.clientY]); }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const p = last.get(t.identifier);
      if (!p) continue;
      input.mouse.dx += (t.clientX - p[0]) * LOOK_GAIN;
      input.mouse.dy += (t.clientY - p[1]) * LOOK_GAIN;
      last.set(t.identifier, [t.clientX, t.clientY]);
    }
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => { for (const t of e.changedTouches) last.delete(t.identifier); });
}

// Returns true when touch controls were installed.
export function attachTouch(input, canvas) {
  if (!isTouchDevice()) return false;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'src/ui/touch.css';
  document.head.append(link);
  document.body.classList.add('is-touch');
  input.locked = true;
  input.lock = () => { input.locked = true; };
  input.unlock = () => {};
  const root = el('div', 'tc-root');
  document.body.append(root);
  buildJoystick(input, root);
  buildButtons(input, root);
  bindLook(input, canvas);
  return true;
}
