// Free-look camera. Hold Alt (or the touch "Putar" button) and move the mouse to swing the view
// all the way around the ship or the explorer -- head-on included -- and Alt+wheel to pull in or
// out. Let go and it eases back to the normal chase framing in about 0.4 s, exactly where it was.
//
// The orbit never steers: while it is live the ship's and the player's own heading is frozen, so
// flying, walking and aiming keep using their own facing and the player cannot lose control by
// looking around. Same control scheme and feel as src/mech/mech-orbit.js.
import * as THREE from 'three';

const SENS = 0.0042;
const PITCH_MAX = 1.22;   // ~70 degrees up and down
const EASE = 7.5;         // ~0.4 s back to the chase view
const ZOOM_MIN = 0.45, ZOOM_MAX = 3.2;
const TAU = Math.PI * 2;
const AX = new THREE.Vector3(1, 0, 0);
const AY = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion();
const _a = new THREE.Quaternion();
const _b = new THREE.Quaternion();
const _v = new THREE.Vector3();

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (a) => { const w = (a + Math.PI) % TAU; return (w < 0 ? w + TAU : w) - Math.PI; };

// Alt+wheel, collected globally: the bare wheel belongs to weapon switching.
const wheel = { v: 0 };
let bound = false;
function bindWheel() {
  if (bound || typeof window === 'undefined') return;
  bound = true;
  addEventListener('wheel', (e) => { if (e.altKey) wheel.v += Math.sign(e.deltaY); }, { passive: true });
}

export class CameraOrbit {
  constructor() {
    this.yaw = 0;
    this.pitch = 0;
    this.zoom = 1;
    this.t = 0;          // 0 = normal framing, 1 = fully orbited
    this.held = false;
    bindWheel();
  }

  get live() { return this.t > 0.001; }

  // Returns true while the orbit owns the mouse; the caller must then leave its own heading alone.
  update(dt, input) {
    const on = Boolean(input?.down?.('AltLeft') || input?.down?.('AltRight'));
    if (on && !this.held) { this.yaw = 0; this.pitch = 0; this.zoom = 1; }
    this.held = on;
    if (on) this.aim(input);
    wheel.v = 0;
    this.t += ((on ? 1 : 0) - this.t) * (1 - Math.exp(-EASE * Math.min(dt, 0.1)));
    if (!on && this.t < 0.002) { this.t = 0; this.yaw = 0; this.pitch = 0; this.zoom = 1; }
    return this.live;
  }

  aim(input) {
    const m = input.mouse ?? { dx: 0, dy: 0 };
    this.yaw = wrap(this.yaw - m.dx * SENS);
    this.pitch = clamp(this.pitch - m.dy * SENS, -PITCH_MAX, PITCH_MAX);
    if (wheel.v) this.zoom = clamp(this.zoom * (1 + wheel.v * 0.12), ZOOM_MIN, ZOOM_MAX);
  }

  // Orientation only (cockpit / first person): base turned by the orbit, eased by t.
  orient(out, base) {
    return out.copy(base)
      .multiply(_a.setFromAxisAngle(AY, this.yaw * this.t))
      .multiply(_b.setFromAxisAngle(AX, this.pitch * this.t));
  }

  // Puts `camera` on a sphere around `anchor`, looking straight at it once fully orbited.
  // `base` is the un-orbited orientation; `offset` the chase offset (x right, y up, z back).
  apply(camera, anchor, base, offset) {
    const t = this.t;
    this.orient(_q, base);
    camera.quaternion.copy(_q);
    _v.set(offset.x * (1 - t), offset.y * (1 - t), offset.z * (1 + (this.zoom - 1) * t));
    camera.position.copy(anchor).add(_v.applyQuaternion(_q));
  }
}

// Steering proxy: the real input with the mouse taken out, so a view that is orbiting cannot
// turn the thing it is orbiting. Allocated once per owner, never per frame.
export function lookFreezer() {
  const f = { src: null, locked: false, mouse: { dx: 0, dy: 0, wheel: 0 },
    down: (c) => Boolean(f.src?.down?.(c)), pressed: (c) => Boolean(f.src?.pressed?.(c)),
    mouseDown: (b) => Boolean(f.src?.mouseDown?.(b)), clicked: (b) => Boolean(f.src?.clicked?.(b)) };
  return f;
}
