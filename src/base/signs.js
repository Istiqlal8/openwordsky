// One canvas atlas for every base sign (Indonesian labels), mapped onto merged quads.
import * as THREE from 'three';
import { makeCanvas, toTexture } from '../assets/canvas.js';

const W = 1024, H = 512, COLS = 2, ROWS = 4, SW = W / COLS, SH = H / ROWS;
export const SIGNS = {
  hangar: { text: 'HANGAR', color: '#3fb6a8' },
  bengkel: { text: 'BENGKEL DIY', color: '#f08a3c' },
  rumahku: { text: 'RUMAHKU', color: '#ffd08a' },
  toko: { text: 'TOKO', color: '#6aff8a' },
  pangkalan: { text: 'PANGKALAN BUMI', color: '#9fd8ff' },
  sari: { text: 'Rumah Sari', color: '#e55d87' },
  budi: { text: 'Rumah Budi', color: '#9fd8ff' },
  ayu: { text: 'Rumah Ayu', color: '#f2c14e' },
};
const KEYS = Object.keys(SIGNS);

function drawSlot(g, i, { text, color }) {
  const x = (i % COLS) * SW, y = Math.floor(i / COLS) * SH;
  g.fillStyle = '#1b2230';
  g.fillRect(x + 4, y + 4, SW - 8, SH - 8);
  g.strokeStyle = color;
  g.lineWidth = 8;
  g.strokeRect(x + 12, y + 12, SW - 24, SH - 24);
  g.fillStyle = '#ffffff';
  let size = 64;
  g.font = `bold ${size}px sans-serif`;
  while (g.measureText(text).width > SW - 70 && size > 20) g.font = `bold ${(size -= 4)}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, x + SW / 2, y + SH / 2 + 3);
}

export function makeAtlas() {
  const c = makeCanvas(W, H), g = c.getContext('2d');
  KEYS.forEach((k, i) => drawSlot(g, i, SIGNS[k]));
  const tex = toTexture(c);
  tex.anisotropy = 4;
  return tex;
}

// Quad of width w (4:1) showing sign `key`, facing +Z in kit-frame coords.
export function addSign(kit, key, w, x, y, z, ry = 0) {
  const i = KEYS.indexOf(key), geo = new THREE.PlaneGeometry(w, w / 4);
  const u0 = (i % COLS) / COLS, v1 = 1 - Math.floor(i / COLS) / ROWS;
  const uv = geo.attributes.uv;
  for (let k = 0; k < uv.count; k++) {
    uv.setXY(k, u0 + uv.getX(k) / COLS, v1 - (1 - uv.getY(k)) / ROWS);
  }
  kit.add('sign', geo, 0xffffff, x, y, z, ry ? [0, ry, 0] : null);
}
