// Shared timeline for the ship <-> mech transformation. Holds no scene objects: the space and
// surface controllers read the curves and apply them, mech-morph-fx.js draws the energy work.
// Allocates nothing.
//
//   0.00-0.30  charge   hull pitches up, landing legs deploy, engines flare, energy builds
//   0.30-0.40  compress the hull squashes and spins down to nothing
//   0.38       burst    white flash + shock ring; the folded mech is already inside it
//   0.40-0.86  unfold   limbs swing out with an overshoot
//   0.86-1.00  settle   locks clunk home, sparks, the camera arc lands
export const TRANSFORM_TIME = 1.8;

const BURST = 0.38;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (u) => u * u * (3 - 2 * u);
const span = (t, a, b) => clamp01((t - a) / (b - a));
// Time crawls through the burst so the eye can catch the swap.
const speedAt = (t) => (t > 0.3 && t < 0.5 ? 0.42 : 1);

export class Transform {
  constructor() {
    this.t = 0;       // 0 = ship, 1 = mech
    this.dir = 0;     // +1 unfolding, -1 folding, 0 idle
    this.burst = false;
  }

  start(dir) {
    this.dir = dir;
    this.t = clamp01(this.t);
    this.fired = false;
  }

  // Returns true while the sequence is still playing.
  update(dt) {
    if (!this.dir) return false;
    const before = this.t;
    this.t = clamp01(this.t + (this.dir * dt * speedAt(this.t)) / TRANSFORM_TIME);
    this.burst = (before < BURST) !== (this.t < BURST);
    if ((this.dir > 0 && this.t >= 1) || (this.dir < 0 && this.t <= 0)) this.dir = 0;
    return this.dir !== 0;
  }

  finish(toMech) {
    this.t = toMech ? 1 : 0;
    this.dir = 0;
    this.burst = false;
  }

  get busy() { return this.dir !== 0; }

  // ---- ship side ----
  get shipVisible() { return this.t < BURST + 0.02; }
  get shipScale() { return 1 - smooth(span(this.t, 0.16, BURST)); }
  get shipPitch() { return smooth(span(this.t, 0.02, 0.3)) * 0.85 - smooth(span(this.t, 0.3, BURST)) * 0.5; }
  get shipSpin() { return span(this.t, 0.06, BURST) ** 2 * 9.5; }
  get shipLegs() { return this.t > 0.1 && this.t < BURST; }
  // Stretch along the roll axis just before the hull disappears.
  get shipStretch() { return 1 + smooth(span(this.t, 0.24, BURST)) * 1.7; }

  // ---- mech side ----
  get mechVisible() { return this.t > BURST - 0.02; }
  get deploy() {
    const u = smooth(span(this.t, BURST, 0.86));
    return u + Math.sin(Math.PI * span(this.t, 0.7, 1)) * 0.07 * (1 - u) ** 0.5; // small settle overshoot
  }
  get spinIn() { return (1 - span(this.t, BURST, 0.78)) ** 2 * 2.6; }

  // ---- staging ----
  get charge() { return smooth(span(this.t, 0, BURST)); }
  get flash() { return Math.max(0, 1 - Math.abs(this.t - BURST) / 0.1) ** 2; }
  get ring() { return span(this.t, BURST, 0.78); }
  get settle() { return span(this.t, 0.86, 1); }
  // 0..1..0 bump used for the camera pull-back and the FOV.
  get kick() { return Math.sin(Math.PI * clamp01(this.t)); }
  // Camera arc, wide at the start and unwound by the time the mech stands.
  get arc() { return (1 - smooth(clamp01(this.t / 0.94))) * 1.25; }
  get cine() { return 1 - smooth(clamp01((this.t - 0.78) / 0.22)); }
}
