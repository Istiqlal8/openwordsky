// One fishing attempt as a small state machine (no DOM, no three.js):
//   cast (line in the air) -> wait (2-8 s) -> bite (short window to strike) -> reel -> caught | escaped.
// Reel minigame: holding the key pushes the marker up, releasing lets it sink; keep it inside
// the moving zone to fill the catch meter, outside it drains.

const CAST_TIME = 0.7;
const WAIT = [2, 8];
const BITE_WINDOW = { common: 1.0, uncommon: 0.9, rare: 0.8, endemic: 0.8, legendary: 0.65 };
// Zone half-width and how fast the fish drags it around, per tier.
const PULL = {
  common: { half: 0.17, speed: 0.35 }, uncommon: { half: 0.14, speed: 0.5 }, rare: { half: 0.12, speed: 0.65 },
  endemic: { half: 0.13, speed: 0.6 }, legendary: { half: 0.1, speed: 0.85 },
};
const LIFT = 2.6, SINK = 1.9, DRAG = 3;
const GAIN = 0.24, LOSS = 0.2, START = 0.25;

export class FishSession {
  constructor(rand = Math.random) {
    this.rand = rand;
    this.state = 'idle';
    this.fish = null;
  }

  get active() { return this.state !== 'idle'; }

  cast(fish) {
    Object.assign(this, { state: 'cast', fish, t: CAST_TIME });
  }

  cancel() { this.state = 'idle'; this.fish = null; }

  // hold: key held this frame; strike: key pressed this frame. Returns an event name or null.
  update(dt, hold, strike) {
    if (this.state === 'cast') return this.tickCast(dt);
    if (this.state === 'wait') return this.tickWait(dt);
    if (this.state === 'bite') return this.tickBite(dt, strike);
    if (this.state === 'reel') return this.tickReel(dt, hold);
    return null;
  }

  tickCast(dt) {
    this.t -= dt;
    if (this.t > 0) return null;
    this.state = 'wait';
    this.t = WAIT[0] + (WAIT[1] - WAIT[0]) * this.rand();
    return 'landed';
  }

  tickWait(dt) {
    this.t -= dt;
    if (this.t > 0) return null;
    this.state = 'bite';
    this.t = BITE_WINDOW[this.fish.tier] ?? 0.9;
    return 'bite';
  }

  tickBite(dt, strike) {
    if (strike) { this.startReel(); return 'hooked'; }
    this.t -= dt;
    if (this.t > 0) return null;
    this.state = 'idle';
    return 'missed';
  }

  startReel() {
    const p = PULL[this.fish.tier] ?? PULL.common;
    Object.assign(this, { state: 'reel', half: p.half, speed: p.speed, marker: 0.5, vel: 0,
      zone: 0.5, target: 0.5, progress: START, time: 0 });
  }

  tickReel(dt, hold) {
    this.time += dt;
    this.vel += (hold ? LIFT : -SINK) * dt;
    this.vel -= this.vel * Math.min(1, DRAG * dt * 0.5);
    this.marker += this.vel * dt;
    if (this.marker < 0 || this.marker > 1) { this.marker = Math.max(0, Math.min(1, this.marker)); this.vel = 0; }
    this.moveZone(dt);
    this.progress += (this.inZone ? GAIN : -LOSS) * dt;
    if (this.progress >= 1) { this.state = 'idle'; return 'caught'; }
    if (this.progress <= 0) { this.state = 'idle'; return 'escaped'; }
    return null;
  }

  get inZone() { return Math.abs(this.marker - this.zone) <= this.half; }

  // The fish swims the zone toward a random target, picking a new one on arrival.
  moveZone(dt) {
    const d = this.target - this.zone, step = this.speed * dt;
    if (Math.abs(d) <= step) {
      this.zone = this.target;
      this.target = this.half + (1 - 2 * this.half) * this.rand();
    } else this.zone += Math.sign(d) * step;
  }
}
