// One canvas atlas per planet for settlement signs (village names + shop boards), mapped onto merged quads.
import * as THREE from 'three';
import { makeCanvas, toTexture } from '../assets/canvas.js';

const W = 1024, H = 1024, COLS = 2, ROWS = 8, SW = W / COLS, SH = H / ROWS;
export const SHOP_SIGNS = [
  { key: 'toko', text: 'TOKO KELONTONG', color: '#6aff8a' }, { key: 'warung', text: 'WARUNG MAKAN', color: '#f2c14e' },
  { key: 'pasar', text: 'PASAR', color: '#ff8a5a' }, { key: 'balai', text: 'BALAI DESA', color: '#9fd8ff' },
  { key: 'kopi', text: 'KEDAI KOPI', color: '#e0a070' }, { key: 'lab', text: 'LAB RISET', color: '#7df0ff' },
  { key: 'habitat', text: 'HABITAT', color: '#9cff6a' }, { key: 'tambang', text: 'TAMBANG', color: '#ffc04a' },
];
const NAME_COLORS = ['#ffd08a', '#9fd8ff', '#9cff6a', '#ff9ac0', '#c8a0ff', '#7df0ff', '#ffb070', '#e0e0e0'];
let slots = [];

function drawSlot(g, i, { text, color }) {
  const x = (i % COLS) * SW, y = Math.floor(i / COLS) * SH;
  g.fillStyle = '#1b2230';
  g.fillRect(x + 4, y + 4, SW - 8, SH - 8);
  g.strokeStyle = color;
  g.lineWidth = 8;
  g.strokeRect(x + 12, y + 12, SW - 24, SH - 24);
  g.fillStyle = '#ffffff';
  let size = 60;
  g.font = `bold ${size}px sans-serif`;
  while (g.measureText(text).width > SW - 60 && size > 18) g.font = `bold ${(size -= 4)}px sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, x + SW / 2, y + SH / 2 + 3);
}

// names: settlement names (up to 8). Returns the atlas texture; sets the slot table used by addSign.
export function makeSignAtlas(names) {
  slots = [...SHOP_SIGNS, ...names.slice(0, 8).map((text, i) => ({ key: `name${i}`, text: text.toUpperCase(), color: NAME_COLORS[i] }))];
  const c = makeCanvas(W, H), g = c.getContext('2d');
  slots.forEach((s, i) => drawSlot(g, i, s));
  const tex = toTexture(c);
  tex.anisotropy = 4;
  return tex;
}

// Quad of width w (4:1) showing sign `key`, facing +Z in kit-frame coords.
export function addSign(kit, key, w, x, y, z, ry = 0) {
  const i = Math.max(0, slots.findIndex((s) => s.key === key)), geo = new THREE.PlaneGeometry(w, w / 4);
  const u0 = (i % COLS) / COLS, v1 = 1 - Math.floor(i / COLS) / ROWS, uv = geo.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / COLS, v1 - (1 - uv.getY(k)) / ROWS);
  kit.add('sign', geo, 0xffffff, x, y, z, ry ? [0, ry, 0] : null);
}

// Double-sided village name board on two posts (kit frame on the ground).
export function nameBoard(kit, key) {
  for (const x of [-1.9, 1.9]) kit.box('hull', 0x6b4630, 0.18, 3.4, 0.18, x, 1.2, 0);
  kit.box('hull', 0x1b2230, 4, 1.05, 0.1, 0, 2.6, 0);
  addSign(kit, key, 3.9, 0, 2.6, 0.06);
  addSign(kit, key, 3.9, 0, 2.6, -0.06, Math.PI);
}
