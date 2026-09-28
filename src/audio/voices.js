// Shared plumbing for combat audio: the reverb / echo / grit buses, the voice cap that keeps a
// 200-ship battle from choking the audio thread, and the distance + atmosphere model.
import { impulse, tanhCurve } from './dsp.js';

const MAX = 24;      // simultaneous combat voices before ordinary shots are dropped
const CEILING = 32;  // even a capital ship going up cannot push past this
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Budget for one-shot sounds. `take` is the only gate every combat sound goes through.
export class Voices {
  constructor(max = MAX) {
    this.max = max;
    this.n = 0;
    this.last = new Map();
    this.dec = () => { this.n = this.n > 0 ? this.n - 1 : 0; };
  }

  // key: sound family (own retrigger gap); prio 1 ordinary, 2 impact, 3 kill, 4 capital-scale boom.
  take(key, prio = 1, minGap = 0, holdMs = 400) {
    const t = now();
    if (minGap && t - (this.last.get(key) || 0) < minGap) return false;
    if (this.n >= (prio >= 3 ? CEILING : this.max)) return false;
    this.last.set(key, t);
    this.n++;
    setTimeout(this.dec, holdMs);
    return true;
  }

  reset() { this.n = 0; }
}

function bus(ctx, node, level, out) {
  const g = ctx.createGain();
  g.gain.value = level;
  node.connect(g).connect(out);
  return node;
}

// Builds the send buses once per AudioContext. `out` is the sfx bus the settings panel controls.
export function makeKit(ctx, noise, out) {
  const verb = ctx.createConvolver();
  verb.buffer = impulse(ctx, 2.4, 3.2);
  const echo = ctx.createDelay(0.5);
  echo.delayTime.value = 0.135;
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  echo.connect(fb).connect(echo);
  const grit = ctx.createWaveShaper();
  grit.curve = tanhCurve(2048, 3.2);
  grit.oversample = '2x';
  bus(ctx, verb, 0.9, out);
  bus(ctx, echo, 0.45, out);
  bus(ctx, grit, 0.6, out);
  return { ctx, noise, dry: out, verb, echo, grit, voices: new Voices(), air: 1, listener: null, ref: 80 };
}

// Reused between calls so placing a sound allocates nothing.
const P = { g: 1, lp: 20000, wet: 0.1, detail: true };
const CULL = 0.02;   // below this a sound is not worth a single node

// Distance + atmosphere: further away is quieter, duller and more reverberant; a thin atmosphere
// takes the body and the highs out of everything. `at` may be omitted (sound is on the listener).
export function place(kit, at) {
  P.g = 1;
  P.lp = 20000;
  P.wet = 0.1;
  const p = kit.listener?.position ?? kit.listener;
  if (at && p) {
    const k = Math.hypot(at.x - p.x, at.y - p.y, at.z - p.z) / kit.ref;
    P.g = 1 / (1 + k + k * k * 0.55);
    P.lp = 18000 / (1 + k * 2.2);
    P.wet = Math.min(0.75, 0.1 + k * 0.22);
  }
  const air = kit.air;
  if (air < 1) {
    P.g *= 0.45 + 0.55 * air;
    P.lp = Math.min(P.lp, 900 + 17000 * air);
  }
  P.detail = P.g > 0.3;   // sparkles, debris and shell rattle only when the source is close
  return P;
}

// Places a sound and claims a voice in one step: returns the placement, or null when the source is
// too far away to be worth any nodes or the budget is already full. This is the only gate.
export function cue(sfx, at, key, prio = 1, gap = 0, hold = 400) {
  const kit = sfx.kit;
  if (!kit) return null;
  const p = place(kit, at);
  if (p.g < CULL) return null;
  return kit.voices.take(key, prio, gap, hold) ? p : null;
}
