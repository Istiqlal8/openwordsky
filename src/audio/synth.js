// Low-level WebAudio building blocks shared by Sfx and the ambient scenes.

export function makeNoiseBuffer(ctx, seconds = 2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// Stop every source and disconnect every node, ignoring repeats.
export function stopAll(nodes) {
  for (const n of nodes) {
    try { if (n.stop) n.stop(); } catch (e) { /* already stopped */ }
    try { n.disconnect(); } catch (e) { /* already disconnected */ }
  }
}

// Attack/decay envelope on a gain param.
export function envelope(param, t, peak, attack, dur) {
  param.cancelScheduledValues(t);
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(peak, t + attack);
  param.exponentialRampToValueAtTime(0.0001, t + dur);
}

// Disconnect every node once the source finishes playing.
function autoClean(src, nodes) {
  src.onended = () => { for (const n of nodes) { try { n.disconnect(); } catch (e) { /* ok */ } } };
}

// One-shot oscillator with an exponential pitch sweep f0 -> f1.
export function tone(ctx, dest, o) {
  const t = ctx.currentTime + (o.delay || 0);
  const dur = o.dur || 0.2;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f0, t);
  if (o.f1 && o.f1 !== o.f0) osc.frequency.exponentialRampToValueAtTime(o.f1, t + (o.sweep || dur));
  if (o.detune) osc.detune.value = o.detune;
  envelope(g.gain, t, o.gain ?? 0.2, o.attack ?? 0.01, dur);
  osc.connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.05);
  autoClean(osc, [osc, g]);
}

// One-shot filtered noise burst with a filter sweep f0 -> f1.
export function noiseBurst(ctx, buffer, dest, o) {
  const t = ctx.currentTime + (o.delay || 0);
  const dur = o.dur || 0.2;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.playbackRate.value = o.rate || 1;
  const f = ctx.createBiquadFilter();
  f.type = o.filter || 'lowpass';
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.f0, t);
  if (o.f1 && o.f1 !== o.f0) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
  const g = ctx.createGain();
  envelope(g.gain, t, o.gain ?? 0.2, o.attack ?? 0.01, dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * (buffer.duration - 0.1));
  src.stop(t + dur + 0.05);
  autoClean(src, [src, f, g]);
}

// Continuous looping noise source (caller owns stop/disconnect).
export function noiseLoop(ctx, buffer) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.start(ctx.currentTime, Math.random() * buffer.duration);
  return src;
}

// Slow LFO modulating an AudioParam; returns [osc, depthGain].
export function lfo(ctx, param, rate, depth) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = rate;
  g.gain.value = depth;
  osc.connect(g).connect(param);
  osc.start();
  return [osc, g];
}

export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
