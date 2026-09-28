// Layered one-shot synthesis for combat audio. Every weapon sound is built from the same three
// parts -- a sharp transient, a body with a pitch envelope, and a tail -- stacked with `layer()`.
// Nothing here runs or allocates per frame: a layer only exists while its sound is audible.

export const rand = (a, b) => a + Math.random() * (b - a);
// Multiplier for per-shot pitch/timbre variation, so rapid fire never repeats one sample.
export const vary = (amount) => 1 + (Math.random() * 2 - 1) * amount;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Soft-clipping curve for the grit bus (tanh-ish, built once per context).
export function tanhCurve(n = 2048, k = 3) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return c;
}

// Exponentially decaying noise: a cheap stand-in for a hall impulse response.
export function impulse(ctx, seconds = 2.2, decay = 3.4) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const k = 1 - i / len;
      d[i] = (Math.random() * 2 - 1) * Math.pow(k, decay);
    }
  }
  return buf;
}

function envAt(param, t, peak, attack, dur, hold) {
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  if (hold) param.setValueAtTime(Math.max(0.0002, peak), t + attack + hold);
  param.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + (hold || 0) + 0.01));
}

function sweepParam(param, t, f0, f1, dur) {
  param.setValueAtTime(Math.max(1, f0), t);
  if (f1 && f1 !== f0) param.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
}

// Frequency-modulating oscillator with its own decaying index: metallic, gritty, bell-like bodies.
function attachFm(ctx, osc, o, t, dur, nodes) {
  const m = ctx.createOscillator();
  const mg = ctx.createGain();
  m.type = o.fmType || 'sine';
  m.frequency.setValueAtTime(o.fm, t);
  sweepParam(mg.gain, t, o.index, o.index1 ?? o.index * 0.02, o.indexDur ?? dur);
  m.connect(mg).connect(osc.frequency);
  m.start(t);
  m.stop(t + dur + 0.05);
  nodes.push(m, mg);
}

function source(ctx, kit, o, t, dur, nodes) {
  if (o.noise) {
    const s = ctx.createBufferSource();
    s.buffer = kit.noise;
    s.loop = true;
    s.playbackRate.value = o.rate || 1;
    s.start(t, Math.random() * (kit.noise.duration - 0.25));
    s.stop(t + dur + 0.05);
    return s;
  }
  const osc = ctx.createOscillator();
  osc.type = o.type || 'sine';
  sweepParam(osc.frequency, t, o.f0, o.f1, o.sweep ?? dur);
  if (o.detune) osc.detune.value = o.detune;
  if (o.fm) attachFm(ctx, osc, o, t, dur, nodes);
  osc.start(t);
  osc.stop(t + dur + 0.05);
  return osc;
}

// One scheduled layer. `kit` supplies the context, noise buffer and shared buses.
// o: { noise|type, f0, f1, fm, index, filter, q, lp, dur, gain, attack, hold, delay, wet, echo, grit }
export function layer(kit, o) {
  const ctx = kit.ctx;
  const t = ctx.currentTime + (o.delay || 0);
  const dur = o.dur || 0.2;
  const nodes = [];
  const src = source(ctx, kit, o, t, dur, nodes);
  nodes.push(src);
  let node = src;
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = o.filter;
    f.Q.value = o.q ?? 1;
    sweepParam(f.frequency, t, Math.min(o.ff0, o.lp ?? 20000), Math.min(o.ff1 ?? o.ff0, o.lp ?? 20000), dur);
    node = node.connect(f);
    nodes.push(f);
  }
  const g = ctx.createGain();
  envAt(g.gain, t, o.gain ?? 0.2, o.attack ?? 0.003, dur, o.hold);
  node.connect(g);
  nodes.push(g);
  g.connect(o.grit ? kit.grit : kit.dry);
  if (o.wet) sendTo(ctx, g, kit.verb, o.wet, nodes);
  if (o.echo) sendTo(ctx, g, kit.echo, o.echo, nodes);
  src.onended = () => { for (const n of nodes) { try { n.disconnect(); } catch { /* gone */ } } };
  return dur;
}

function sendTo(ctx, from, bus, amount, nodes) {
  const s = ctx.createGain();
  s.gain.value = amount;
  from.connect(s).connect(bus);
  nodes.push(s);
}

export { clamp };
