// Hyperspace jump cinematic on a 2D canvas: charge → star tunnel → exit flash.
// play(onMid, onDone): onMid swaps the star system while the tunnel hides the scene.
const TOTAL = 3.6, MID = 1.9;
const STAR_COUNT = 420;

export class WarpFx {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'warp-fx';
    Object.assign(this.canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: '55', display: 'none' });
    document.body.append(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.stars = Array.from({ length: STAR_COUNT }, () => this.spawnStar({}));
    this.busy = false;
  }

  spawnStar(s) {
    s.a = Math.random() * Math.PI * 2;
    s.r = 0.02 + Math.random() * 0.98;   // radial position on screen (0 centre .. 1 edge)
    s.hue = 190 + Math.random() * 80;
    return s;
  }

  play(onMid, onDone) {
    if (this.busy) return;
    this.busy = true;
    this.t = 0;
    this.midDone = false;
    this.cb = { onMid, onDone };
    this.canvas.style.display = 'block';
    this.resize();
    this.last = performance.now();
    requestAnimationFrame((now) => this.frame(now));
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    if (!this.midDone && this.t >= MID) { this.midDone = true; this.cb.onMid(); }
    if (this.t >= TOTAL) return this.finish();
    this.draw(dt);
    requestAnimationFrame((n) => this.frame(n));
  }

  finish() {
    this.canvas.style.display = 'none';
    this.busy = false;
    this.cb.onDone?.();
  }

  // 0..1 speed curve: ramp up, cruise, brake at the end.
  speed() {
    const t = this.t;
    if (t < 1) return t * t;
    if (t < 2.8) return 1;
    return Math.max(0, 1 - (t - 2.8) / 0.8);
  }

  draw(dt) {
    const { ctx } = this, w = innerWidth, h = innerHeight;
    const v = this.speed();
    const dark = this.t < 0.6 ? this.t / 0.6 : this.t > 3.1 ? Math.max(0, (TOTAL - this.t) / 0.5) : 1;
    ctx.fillStyle = `rgba(2, 4, 14, ${0.35 + 0.55 * dark})`;
    ctx.fillRect(0, 0, w, h);
    this.drawTunnel(w, h, v);
    this.drawStars(w, h, v, dt);
    this.drawFlash(w, h);
  }

  drawStars(w, h, v, dt) {
    const { ctx } = this, cx = w / 2, cy = h / 2, R = Math.hypot(cx, cy);
    ctx.lineCap = 'round';
    for (const s of this.stars) {
      const r0 = s.r;
      s.r *= 1 + (0.4 + v * 5) * dt;
      if (s.r > 1.1) this.spawnStar(s).r = 0.02 + Math.random() * 0.1;
      const len = Math.max(0.002, (s.r - r0) * (1 + v * 6));
      const x1 = cx + Math.cos(s.a) * s.r * R, y1 = cy + Math.sin(s.a) * s.r * R;
      const x0 = cx + Math.cos(s.a) * (s.r - len) * R, y0 = cy + Math.sin(s.a) * (s.r - len) * R;
      ctx.strokeStyle = `hsla(${s.hue}, 95%, ${62 + 18 * v}%, ${0.3 + 0.7 * Math.min(1, s.r * 2)})`;
      ctx.lineWidth = 1 + s.r * 2.5 * (0.5 + v);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
  }

  // Swirling coloured rings rushing outward while at full speed.
  drawTunnel(w, h, v) {
    if (v < 0.3) return;
    const { ctx } = this, cx = w / 2, cy = h / 2, R = Math.hypot(cx, cy);
    for (let i = 0; i < 7; i++) {
      const k = ((this.t * 1.4 + i / 7) % 1);
      const r = Math.pow(k, 2.2) * R;
      ctx.strokeStyle = `hsla(${(200 + i * 25 + this.t * 60) % 360}, 90%, 60%, ${0.25 * v * (1 - k)})`;
      ctx.lineWidth = 2 + k * 30;
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.9, this.t * 0.8 + i, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // White burst when entering the tunnel and when dropping out of it.
  drawFlash(w, h) {
    const f = Math.max(0, 1 - Math.abs(this.t - 1.0) / 0.18) * 0.8 + Math.max(0, 1 - Math.abs(this.t - 2.9) / 0.25);
    if (f <= 0) return;
    this.ctx.fillStyle = `rgba(230, 240, 255, ${Math.min(1, f)})`;
    this.ctx.fillRect(0, 0, w, h);
  }
}
