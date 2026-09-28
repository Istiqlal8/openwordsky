// Progressive tutorial: one small, non-blocking hint card at a time, ticked off by act events
// or key presses. State in log.s.tutorial; finished or skipped tutorials never come back.
import { el, clear, show, keyRow } from '../ui/dom.js';
import { STEPS, STEP_TIMEOUT } from './onboarding-steps.js';
import { keyLabel } from '../settings/settings-store.js';

const DONE_MS = 1300;
const VETERAN = 10; // finished quests: an old save skips the tutorial

export class Onboarding {
  constructor(w) {
    this.w = w;
    const old = !w.log.s.tutorial && (w.log.s.done ?? 0) >= VETERAN;
    this.s = (w.log.s.tutorial ??= { done: {}, off: old });
    this.card = el('div', 'tu-card is-hidden');
    w.hud.root.append(this.card);
    this.current = null;
    this.shownFor = 0;
    this.flashUntil = 0;
    this.last = performance.now();
    w.log.watchers.push((type) => this.onRecord(type));
  }

  get active() { return !this.s.off && !this.finished; }
  get finished() { return this.steps().every((st) => this.s.done[st.id]); }

  // Steps for features that exist in this build (fishing, fleet are separate addons).
  steps() {
    const names = new Set((this.w.addons ?? []).map((a) => a.constructor.name));
    return STEPS.filter((st) => !st.needs || names.has(st.needs));
  }

  skip() { this.s.off = true; this.w.log.version++; this.hide(); }
  restart() { this.s.off = false; this.s.done = {}; this.current = null; this.w.log.version++; }

  mark(id) {
    if (this.s.done[id]) return;
    this.s.done[id] = Date.now();
    if (this.current?.id !== id) return;
    this.flashUntil = performance.now() + DONE_MS; // keep the ticked card up for a moment
    this.card.classList.add('is-done');
  }

  onRecord(type) {
    for (const st of STEPS) if (st.acts?.includes(type)) this.mark(st.id);
  }

  update(input, w) {
    const now = performance.now(), dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    if (this.s.off) { this.hide(); return; }
    for (const st of STEPS) if (st.keys?.some((k) => input.pressed(k))) this.mark(st.id);
    if (now < this.flashUntil) return;
    this.pick(w.planet ? 'surface' : 'space', dt);
  }

  pick(mode, dt) {
    const next = this.steps().find((st) => !this.s.done[st.id] && (st.mode === 'any' || st.mode === mode)) ?? null;
    if (next !== this.current) { this.current = next; this.shownFor = 0; this.draw(); }
    if (!next) { this.hide(); if (this.finished) this.complete(); return; }
    this.shownFor += dt;
    if (this.shownFor > STEP_TIMEOUT) this.mark(next.id); // never nag forever about one thing
  }

  complete() {
    if (this.s.off) return;
    this.s.off = true;
    this.w.hud.toast('Tutorial selesai. Selamat menjelajah!');
  }

  hide() { show(this.card, false); }

  draw() {
    const st = this.current;
    if (!st) return;
    clear(this.card);
    const all = this.steps(), i = all.indexOf(st);
    this.card.classList.remove('is-done');
    const key = /^(Key[A-Z]|Backquote|Digit\d)$/.test(st.key) ? keyLabel(st.key) : st.key;
    this.card.append(el('div', 'tu-kicker', `Tutorial ${i + 1}/${all.length}`), keyRow(key.replace(' ', ' '), st.title),
      el('div', 'tu-text', st.text), el('div', 'tu-foot', 'Lewati di Pengaturan (`)'));
    show(this.card, true);
  }
}
