// World addon part: spawns this planet's legendary monster (if any) far from the landing
// spot, drops clues as the player gets closer, shakes the camera and pays out on defeat.
// Debug: surfaceMode.gameplay.addons.find((a) => a.legend).legend.beast
import { legendOf, lairOf, trophyOf } from './legend-data.js';
import { isDefeated, markSeen, markDefeated } from './legend-store.js';
import { LegendBeast } from './legend-beast.js';

const REWARD_NANIT = 3000;
const CLUES = [
  { d: 300, text: () => 'Jejak raksasa di tanah… sesuatu yang sangat besar tinggal di dekat sini', roar: 0.25 },
  { d: 160, text: (n) => `Tanah bergetar. Raungan ${n} menggema!`, roar: 0.6, shake: 0.5 },
  { d: 80, text: (n) => `Monster legendaris: ${n}!`, roar: 1, seen: true },
];

export class LegendHunt {
  constructor(ctx) {
    this.ctx = ctx;
    this.def = legendOf(ctx.planet);
    this.beast = null;
    this.stage = 0;
    this.shakeT = 0;
    if (this.def && isDefeated(ctx.planet.key)) this.def = null;
  }

  update(dt) {
    if (!this.def) return;
    if (!this.beast) { if (!this.ctx.creatures) return; this.spawn(); }
    if (!this.beast.alive) return;
    const p = this.beast.ref.pos, f = this.ctx.surface.feet;
    const d = Math.hypot(p.x - f.x, p.z - f.z);
    this.clues(d);
    this.shake(dt, d);
  }

  spawn() {
    const { ctx, def } = this;
    const lair = lairOf(ctx.planet, ctx.surface.spawn ?? { x: 0, z: 0 });
    this.beast = new LegendBeast(ctx, def, lair, {
      onDefeat: (pt) => this.defeated(pt),
      onRoar: () => this.roar(1),
      onStomp: () => { this.roar(0.7); this.shakeT = 0.9; },
      onFlee: (on) => this.say(on ? `${def.name} terluka dan melarikan diri!` : `${def.name} kembali untuk bertarung!`),
    });
    ctx.creatures.groups.push(this.beast);
  }

  clues(d) {
    const c = CLUES[this.stage];
    if (!c || d > c.d) return;
    this.stage++;
    this.say(c.text(this.def.name));
    this.roar(c.roar);
    if (c.shake) this.shakeT = c.shake;
    if (c.seen) markSeen(this.def.id, this.ctx.planet.name);
  }

  // Ground shake: stomps and nearby roars jolt the camera (applied after the view placed it).
  shake(dt, d) {
    this.shakeT = Math.max(0, this.shakeT - dt);
    const k = Math.max(this.shakeT, d < 90 ? this.beast.shake * (1 - d / 90) : 0);
    if (k <= 0.01) return;
    const cam = this.ctx.surface.camera.position, a = 0.35 * k;
    cam.x += (Math.random() - 0.5) * a;
    cam.y += (Math.random() - 0.5) * a;
    cam.z += (Math.random() - 0.5) * a;
  }

  // Deep procedural roar through the shared Sfx (tone / noise one-shots).
  roar(level) {
    const s = this.ctx.sfx;
    if (!s?.live || !s.t || !s.n) return;
    const g = 0.12 + level * 0.25;
    s.t({ type: 'sawtooth', f0: 95, f1: 42, dur: 1.4, gain: g, attack: 0.15 });
    s.t({ type: 'square', f0: 70, f1: 36, dur: 1.2, gain: g * 0.5, attack: 0.2, detune: 30 });
    s.n({ filter: 'lowpass', f0: 600, f1: 90, dur: 1.3, gain: g * 0.8, attack: 0.1, rate: 0.5 });
  }

  defeated(point) {
    const { ctx, def } = this, pl = ctx.player;
    ctx.fx?.explode(point, { color: def.glow, size: 2.5, debris: true });
    pl.addItem(trophyOf(def), 1);
    pl.addItem('Nanit', REWARD_NANIT);
    markSeen(def.id, ctx.planet.name);
    markDefeated(ctx.planet.key, def.id);
    this.say(`${def.name} tumbang! +${trophyOf(def)} · +${REWARD_NANIT} Nanit`);
    ctx.sfx?.discover?.();
    pl.emit('act', { type: 'legend', id: def.id });
  }

  say(text) { this.ctx.player.emit('notice', { text }); }

  dispose() {
    const b = this.beast;
    if (!b) return;
    const groups = this.ctx.creatures?.groups;
    if (groups?.includes(b)) groups.splice(groups.indexOf(b), 1);
    b.dispose();
    this.beast = null;
  }
}
