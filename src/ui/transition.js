// Full-screen cinematic between space and a planet surface.
// play(kind, onMid): covers the screen, calls onMid() at the peak (swap scenes there), then reveals.
const DURATION = { enter: 2200, exit: 2000 };
const STREAKS = 28;

export class Transition {
  constructor(root) {
    this.root = document.createElement('div');
    this.root.className = 'tr is-idle';
    this.root.innerHTML = '<div class="tr-heat"></div><div class="tr-streaks"></div><div class="tr-flash"></div>';
    const streaks = this.root.querySelector('.tr-streaks');
    for (let i = 0; i < STREAKS; i++) {
      const s = document.createElement('i');
      s.style.setProperty('--a', `${(i / STREAKS) * 360 + Math.random() * 8}deg`);
      s.style.setProperty('--d', `${Math.random() * 0.5}s`);
      streaks.append(s);
    }
    root.append(this.root);
    this.busy = false;
  }

  // sky: CSS colour of the planet sky, used for the cloud/whiteout layer.
  play(kind, onMid, sky = '#dfeaff') {
    if (this.busy) return;
    this.busy = true;
    const total = DURATION[kind];
    this.root.style.setProperty('--sky', sky);
    this.root.style.setProperty('--dur', `${total}ms`);
    this.root.className = `tr tr-${kind}`;
    setTimeout(onMid, total * 0.5);
    setTimeout(() => { this.root.className = 'tr is-idle'; this.busy = false; }, total);
  }
}
