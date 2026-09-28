// Shared timeline for the ship <-> mech transformation. Holds no scene objects: the space and
// surface controllers read the curves and apply them. Allocates nothing.
export const TRANSFORM_TIME = 1.25;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (u) => u * u * (3 - 2 * u);

export class Transform {
  constructor() {
    this.t = 0;       // 0 = ship, 1 = mech
    this.dir = 0;     // +1 unfolding, -1 folding, 0 idle
  }

  start(dir) {
    this.dir = dir;
    this.t = clamp01(this.t);
  }

  // Returns true while the sequence is still playing.
  update(dt) {
    if (!this.dir) return false;
    this.t = clamp01(this.t + (this.dir * dt) / TRANSFORM_TIME);
    if ((this.dir > 0 && this.t >= 1) || (this.dir < 0 && this.t <= 0)) this.dir = 0;
    return this.dir !== 0;
  }

  finish(toMech) {
    this.t = toMech ? 1 : 0;
    this.dir = 0;
  }

  get busy() { return this.dir !== 0; }
  get shipVisible() { return this.t < 0.44; }
  get shipScale() { return clamp01(1 - this.t / 0.44); }
  get mechVisible() { return this.t > 0.16; }
  get deploy() { return smooth(clamp01((this.t - 0.16) / 0.84)); }
  // 0..1..0 bump used for the camera pull-back and the flash.
  get kick() { return Math.sin(Math.PI * clamp01(this.t)); }
}
