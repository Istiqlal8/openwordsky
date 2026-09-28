// Materials and canvas textures for the freighter interior. Everything here is owned
// by the interior and freed by its dispose().
import * as THREE from 'three';
import { makeCanvas, toTexture } from '../assets/canvas.js';
import { std, glow } from './kit.js';

function tiled(canvas) {
  const t = toTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// 4 m deck plate: dark panels, seams and a few rivets.
function floorTexture() {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = '#3a3f47'; g.fillRect(0, 0, S, S);
  for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) {
    g.fillStyle = (x + y) % 256 ? '#40464f' : '#373c44';
    g.fillRect(x + 3, y + 3, 122, 122);
  }
  g.fillStyle = '#23262c';
  g.fillRect(0, 126, S, 4); g.fillRect(126, 0, 4, S);
  g.fillStyle = '#5a616b';
  for (let i = 0; i < 16; i++) g.fillRect(10 + (i % 4) * 64 + 40 * ((i >> 2) % 2), 10 + (i >> 2) * 64, 3, 3);
  return tiled(c);
}

// Wall panels with a lit band and vents.
function wallTexture() {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = '#6b7380'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#5b626e'; g.fillRect(0, 0, S, 40); g.fillRect(0, 200, S, 56);
  g.fillStyle = '#2d3138'; g.fillRect(0, 38, S, 4); g.fillRect(0, 198, S, 4); g.fillRect(126, 42, 4, 156);
  g.fillStyle = '#434954';
  for (let i = 0; i < 6; i++) g.fillRect(24, 215 + i * 6, 70, 3);
  g.fillStyle = '#9aa3b0'; g.fillRect(8, 100, 110, 6); g.fillRect(138, 100, 110, 6);
  return tiled(c);
}

function hazardTexture() {
  const c = makeCanvas(128, 32), g = c.getContext('2d');
  g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, 128, 32);
  g.fillStyle = '#f2b61c';
  for (let x = -32; x < 160; x += 32) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 16, 32); g.lineTo(x + 32, 0); g.lineTo(x + 16, 0); g.fill(); }
  return tiled(c);
}

// Landing pad marking: ring + "H".
function padTexture() {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = '#2b3037'; g.fillRect(0, 0, S, S);
  g.strokeStyle = '#f2b61c'; g.lineWidth = 10;
  g.beginPath(); g.arc(S / 2, S / 2, 110, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#e6edf5'; g.lineWidth = 4;
  g.beginPath(); g.arc(S / 2, S / 2, 92, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#e6edf5'; g.font = 'bold 120px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('H', S / 2, S / 2 + 6);
  return toTexture(c);
}

// Console display: dark glass with a grid, bars and a trace line.
function screenTexture() {
  const c = makeCanvas(256, 128), g = c.getContext('2d');
  g.fillStyle = '#04121f'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = 'rgba(80,190,255,0.25)'; g.lineWidth = 1;
  for (let x = 0; x < 256; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  for (let y = 0; y < 128; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  g.fillStyle = '#3fb8ff';
  for (let i = 0; i < 8; i++) g.fillRect(12 + i * 14, 110 - ((i * 37) % 60) - 20, 9, ((i * 37) % 60) + 20);
  g.strokeStyle = '#8fffcf'; g.lineWidth = 2; g.beginPath();
  for (let x = 130; x < 250; x += 4) g.lineTo(x, 64 + Math.sin(x * 0.12) * 22 * Math.cos(x * 0.03));
  g.stroke();
  return toTexture(c);
}

export function interiorMaterials() {
  const tex = { floor: floorTexture(), wall: wallTexture(), hazard: hazardTexture(), pad: padTexture(), screen: screenTexture() };
  const mats = {
    floor: std({ map: tex.floor, roughness: 0.8, metalness: 0.3 }),
    wall: std({ map: tex.wall, roughness: 0.7, metalness: 0.35 }),
    ceiling: std({ color: 0x2a2e35, roughness: 0.9 }),
    metal: std({ color: 0x8b939e, roughness: 0.45, metalness: 0.7 }),
    dark: std({ color: 0x1f2328, roughness: 0.7 }),
    trim: std({ color: 0x3d7fc0, roughness: 0.5 }),
    orange: std({ color: 0xd9782a, roughness: 0.6 }),
    hazard: std({ map: tex.hazard, roughness: 0.7 }),
    pad: std({ map: tex.pad, roughness: 0.7 }),
    cool: glow(0x8fe8ff, 2.2),
    warm: glow(0xffc47a, 2),
    red: glow(0xff4030, 2.5),
    green: glow(0x40ff80, 2),
    screen: new THREE.MeshBasicMaterial({ map: tex.screen, toneMapped: false }),
    holo: glow(0x2fa8ff, 0.9),
    fabric: std({ color: 0x3e5a7a, roughness: 0.95, metalness: 0 }),
    crate: std({ color: 0xffffff, roughness: 0.8, metalness: 0.2 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.9, depthWrite: false }),
  };
  return { mats, textures: Object.values(tex) };
}

// Scale a geometry's UVs so a texture repeats every `tile` metres along (u, v).
export function tileUv(geo, u, v) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
  return geo;
}
