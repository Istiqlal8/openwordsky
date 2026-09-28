// Neon sign atlas for a trade hub (one canvas per mount): shop boards, the exchange tower and
// decorative storefronts. Quads are added to a GeoKit bucket 'sign' with atlas UVs.
import * as THREE from 'three';
import { makeCanvas, toTexture } from '../assets/canvas.js';
import { SHOP_TYPES } from './shops.js';

const W = 1024, H = 1024, COLS = 2, ROWS = 8, SW = W / COLS, SH = H / ROWS;
const DECOR = [['HOTEL NEBULA', '#ff6ad5'], ['KANTIN ANTARIKSA', '#ffd23a'], ['BENGKEL KAPAL', '#6affc8'],
  ['BAR ORBIT', '#b48cff'], ['GUDANG KARGO', '#ffa050'], ['PENUKARAN', '#7df0ff'], ['KLINIK', '#9cff6a'],
  ['PENGINAPAN', '#ff8a8a']];
export const DECOR_KEYS = DECOR.map((_, i) => `decor${i}`);

function slotList(hubName) {
  const shops = Object.entries(SHOP_TYPES).map(([key, t]) => ({ key, text: t.sign, color: t.color }));
  return [...shops, { key: 'tower', text: 'BURSA GALAKSI', color: '#ffc94a' },
    { key: 'name', text: hubName.toUpperCase(), color: '#ffe9a8' }, ...DECOR.map(([text, color], i) => ({ key: `decor${i}`, text, color }))];
}

// Glowing tube-light look: dark board, neon frame and text with bloom-like blur.
function drawSlot(g, i, { text, color }) {
  const x = (i % COLS) * SW, y = Math.floor(i / COLS) * SH;
  g.fillStyle = '#07080f';
  g.fillRect(x + 2, y + 2, SW - 4, SH - 4);
  g.shadowColor = color;
  g.shadowBlur = 18;
  g.strokeStyle = color;
  g.lineWidth = 6;
  g.strokeRect(x + 12, y + 12, SW - 24, SH - 24);
  let size = 62;
  g.font = `900 ${size}px sans-serif`;
  while (g.measureText(text).width > SW - 70 && size > 18) g.font = `900 ${(size -= 3)}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, x + SW / 2, y + SH / 2 + 3);
  g.fillText(text, x + SW / 2, y + SH / 2 + 3); // second pass: stronger glow
  g.shadowBlur = 4;
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillText(text, x + SW / 2, y + SH / 2 + 3); // hot white core
  g.shadowBlur = 0;
}

export class HubSigns {
  constructor(hubName) {
    this.slots = slotList(hubName);
    const c = makeCanvas(W, H), g = c.getContext('2d');
    this.slots.forEach((s, i) => drawSlot(g, i, s));
    this.texture = toTexture(c);
    this.texture.anisotropy = 4;
  }

  // Quad of width w (4:1) showing sign `key`, facing +Z in kit-frame coords.
  add(kit, key, w, x, y, z, ry = 0) {
    const i = Math.max(0, this.slots.findIndex((s) => s.key === key)), geo = new THREE.PlaneGeometry(w, w / 4);
    const u0 = (i % COLS) / COLS, v1 = 1 - Math.floor(i / COLS) / ROWS, uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / COLS, v1 - (1 - uv.getY(k)) / ROWS);
    kit.add('sign', geo, 0xffffff, x, y, z, ry ? [0, ry, 0] : null);
  }

  colorOf(key) {
    return this.slots.find((s) => s.key === key)?.color ?? '#ffffff';
  }

  dispose() { this.texture.dispose(); }
}
