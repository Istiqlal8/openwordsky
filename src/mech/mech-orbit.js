// Free-look for the mech camera. Hold Alt (or the HUD's putar button) and move the mouse to swing
// the view all the way around the frame, head-on included; let go and it eases back to the normal
// chase framing in about 0.4 s.
//
// The frame itself never turns with the camera: the controllers freeze their own heading while the
// orbit is live, so aiming, walking and flight keep using the mech's facing and the player cannot
// lose control by looking around.
const SENS = 0.0042;
const PITCH_MAX = 1.22;          // ~70 degrees up and down
const EASE = 7.5;                // ~0.4 s back to the chase view
const TAU = Math.PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (a) => { const w = (a + Math.PI) % TAU; return (w < 0 ? w + TAU : w) - Math.PI; };

// Touch / HUD button state, written by src/ui/mech-hud.js.
export const orbitTouch = { held: false, dx: 0, dy: 0 };

export class MechOrbit {
  constructor() {
    this.yaw = 0;
    this.pitch = 0;
    this.t = 0;                  // 0 = chase framing, 1 = fully orbited
    this.held = false;
  }

  get live() { return this.t > 0.001; }

  update(dt, input) {
    const on = input.down('AltLeft') || input.down('AltRight') || orbitTouch.held;
    if (on && !this.held) { this.yaw = 0; this.pitch = 0; }
    this.held = on;
    if (on) {
      this.yaw = wrap(this.yaw - (input.mouse.dx + orbitTouch.dx) * SENS);
      this.pitch = clamp(this.pitch - (input.mouse.dy + orbitTouch.dy) * SENS, -PITCH_MAX, PITCH_MAX);
    }
    orbitTouch.dx = 0;
    orbitTouch.dy = 0;
    this.t += ((on ? 1 : 0) - this.t) * (1 - Math.exp(-EASE * dt));
    if (!on && this.t < 0.002) { this.t = 0; this.yaw = 0; this.pitch = 0; }
    return this.live;
  }
}
