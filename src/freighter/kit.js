// Small shared helpers for the freighter: meshes, canvas text textures and disposal.
import * as THREE from 'three';
import { makeCanvas, toTexture } from '../assets/canvas.js';

export function std(opts) {
  return new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.4, ...opts });
}

export function glow(hex, intensity = 2) {
  return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: hex, emissiveIntensity: intensity });
}

export function box(parent, mat, w, h, d, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// Cylinder along Y unless rotated by the caller.
export function cyl(parent, mat, rTop, rBot, h, x = 0, y = 0, z = 0, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// Canvas texture with centred text (signs, labels, screens). Caller owns (and disposes) it.
export function textTexture(text, opts = {}) {
  const { w = 512, h = 128, fg = '#e8f6ff', bg = null, font = 'bold 72px system-ui, sans-serif', border = null } = opts;
  const c = makeCanvas(w, h), g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  if (border) { g.strokeStyle = border; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); }
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = fg;
  g.shadowColor = fg;
  g.shadowBlur = 12;
  g.fillText(text, w / 2, h / 2 + 4);
  return toTexture(c);
}

// Flat emissive sign plane facing +Z (rotate to face elsewhere).
export function signPlane(tex, width, height) {
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
}

// Free geometries, materials and the given owned textures under root.
// Cached textures (glowTexture) are never disposed here: only those listed in `textures`.
export function disposeTree(root, textures = []) {
  root.traverse((o) => {
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) m.dispose();
  });
  for (const t of textures) t.dispose();
  root.removeFromParent();
}
