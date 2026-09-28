// Canvas textures used only by effects: soft smoke puff and shockwave ring.
import { cached, makeCanvas, toTexture } from '../assets/canvas.js';

// Soft round puff, white so SpriteMaterial.color tints it.
export function puffTexture() {
  return cached('fx:puff', () => {
    const S = 128, c = makeCanvas(S, S), g = c.getContext('2d');
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.45, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    return toTexture(c);
  });
}

// Thin bright ring with a soft falloff on both edges.
export function shockTexture() {
  return cached('fx:shock', () => {
    const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.72, 'rgba(255,255,255,0)');
    grad.addColorStop(0.88, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.94, 'rgba(255,255,255,0.3)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    return toTexture(c);
  });
}
