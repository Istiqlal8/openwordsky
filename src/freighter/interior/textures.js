// Canvas textures for the interior surfaces, drawn from a palette so every archetype has its
// own deck plates, wall panels, stone, tiles, grating or living tissue. Caller owns them.
import * as THREE from 'three';
import { makeCanvas, toTexture } from '../../assets/canvas.js';

const S = 256;

function tiled(canvas) {
  const t = toTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function canvas(bg) {
  const c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  return { c, g };
}

// Deck plate: four panels, seams and rivets. f = [base, panelA, panelB, seam, rivet].
function plate(f) {
  const { c, g } = canvas(f[0]);
  for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) {
    g.fillStyle = (x + y) % 256 ? f[1] : f[2];
    g.fillRect(x + 3, y + 3, 122, 122);
  }
  g.fillStyle = f[3]; g.fillRect(0, 126, S, 4); g.fillRect(126, 0, 4, S);
  g.fillStyle = f[4];
  for (let i = 0; i < 16; i++) g.fillRect(10 + (i % 4) * 64 + 40 * ((i >> 2) % 2), 10 + (i >> 2) * 64, 3, 3);
  return c;
}

// Clean tiles with thin light grout (saucer, ring).
function tile(f) {
  const { c, g } = canvas(f[3]);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = (x + y) % 2 ? f[1] : f[2];
    g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
  }
  g.fillStyle = f[4]; g.fillRect(0, 127, S, 2); g.fillRect(127, 0, 2, S);
  return c;
}

// Metal grating with a hazard edge (cruiser).
function grate(f) {
  const { c, g } = canvas(f[0]);
  g.fillStyle = f[3];
  for (let i = 0; i < S; i += 12) g.fillRect(0, i, S, 5);
  g.fillStyle = f[1]; g.fillRect(0, 0, S, 8); g.fillRect(0, 248, S, 8);
  g.fillStyle = f[4]; g.fillRect(0, 124, S, 8);
  return c;
}

// Stone blocks with mortar and speckle (citadel).
function stone(f) {
  const { c, g } = canvas(f[3]);
  for (let row = 0; row < 4; row++) for (let i = 0; i < 3; i++) {
    const x = i * 96 - (row % 2) * 48, v = (row * 7 + i * 3) % 3;
    g.fillStyle = f[v === 0 ? 0 : v === 1 ? 1 : 2];
    g.fillRect(x + 3, row * 64 + 3, 90, 58);
    if (x < 0) g.fillRect(x + 3 + S, row * 64 + 3, 90, 58);
  }
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(0,0,0,${(i % 5) * 0.03})`;
    g.fillRect((i * 97) % S, (i * 57) % S, 2, 2);
  }
  return c;
}

// Living tissue: mottled blobs and glowing veins (whale). f[4] = vein colour.
function organic(f) {
  const { c, g } = canvas(f[0]);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = f[1 + (i % 3)] + '88';
    g.beginPath(); g.ellipse((i * 71) % S, (i * 43) % S, 10 + (i % 7) * 4, 6 + (i % 5) * 3, i, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = f[4]; g.lineWidth = 2; g.shadowColor = f[4]; g.shadowBlur = 6;
  for (let k = 0; k < 4; k++) {
    g.beginPath(); g.moveTo(0, k * 64 + 20);
    for (let x = 0; x <= S; x += 16) g.lineTo(x, k * 64 + 20 + Math.sin(x * 0.05 + k) * 12);
    g.stroke();
  }
  return c;
}

// Wall panel: lit band and vents. w = [base, band, dark, vent, stripe].
function panel(w) {
  const { c, g } = canvas(w[0]);
  g.fillStyle = w[1]; g.fillRect(0, 0, S, 40); g.fillRect(0, 200, S, 56);
  g.fillStyle = w[2]; g.fillRect(0, 38, S, 4); g.fillRect(0, 198, S, 4); g.fillRect(126, 42, 4, 156);
  g.fillStyle = w[3];
  for (let i = 0; i < 6; i++) g.fillRect(24, 215 + i * 6, 70, 3);
  g.fillStyle = w[4]; g.fillRect(8, 100, 110, 6); g.fillRect(138, 100, 110, 6);
  return c;
}

const FLOORS = { plate, tile, grate, stone, organic };
const WALLS = { panel, stone, organic, tile };

export function surfaceTextures(pal) {
  return {
    floor: tiled(FLOORS[pal.floorKind](pal.floor)),
    wall: tiled(WALLS[pal.wallKind](pal.wall)),
  };
}

export function hazardTexture(a = '#f2b61c') {
  const c = makeCanvas(128, 32), g = c.getContext('2d');
  g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, 128, 32);
  g.fillStyle = a;
  for (let x = -32; x < 160; x += 32) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 16, 32); g.lineTo(x + 32, 0); g.lineTo(x + 16, 0); g.fill(); }
  return tiled(c);
}

// Landing pad marking: ring + "H".
export function padTexture(ring = '#f2b61c', base = '#2b3037') {
  const c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  g.strokeStyle = ring; g.lineWidth = 10;
  g.beginPath(); g.arc(S / 2, S / 2, 110, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#e6edf5'; g.lineWidth = 4;
  g.beginPath(); g.arc(S / 2, S / 2, 92, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#e6edf5'; g.font = 'bold 120px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('H', S / 2, S / 2 + 6);
  return toTexture(c);
}

// Console display: dark glass with a grid, bars and a trace line, in the palette's hue.
export function screenTexture(hue = '#3fb8ff', trace = '#8fffcf') {
  const c = makeCanvas(256, 128), g = c.getContext('2d');
  g.fillStyle = '#04121f'; g.fillRect(0, 0, 256, 128);
  g.globalAlpha = 0.25; g.strokeStyle = hue; g.lineWidth = 1;
  for (let x = 0; x < 256; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  for (let y = 0; y < 128; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  g.globalAlpha = 1; g.fillStyle = hue;
  for (let i = 0; i < 8; i++) g.fillRect(12 + i * 14, 110 - ((i * 37) % 60) - 20, 9, ((i * 37) % 60) + 20);
  g.strokeStyle = trace; g.lineWidth = 2; g.beginPath();
  for (let x = 130; x < 250; x += 4) g.lineTo(x, 64 + Math.sin(x * 0.12) * 22 * Math.cos(x * 0.03));
  g.stroke();
  return toTexture(c);
}
