// The hull file carries only positions and normals — no UVs, no texture, so it can wear exactly one
// flat colour. This paints a livery into vertex colours instead, banded along the length the way a
// real panel scheme runs: red nose, white shoulders, blue spine, a yellow accent, dark engines.
import * as THREE from 'three';

// [start, end] along the nose->tail axis (0 = nose), and the colour of that band.
const BANDS = [
  [0.00, 0.24, 0xd8392c], // nose cone, well down the forward fuselage
  [0.24, 0.40, 0xf2f2f0], // forward shoulders
  [0.40, 0.50, 0x2f4faa], // spine
  [0.50, 0.53, 0xe8bf33], // thin accent stripe
  [0.53, 0.84, 0xf2f2f0], // upper deck
  [0.84, 1.01, 0x3a3f4a], // engine block
];
const WING = 0xd8392c;    // outer wing panels, red like the nose
const WING_FROM = 0.5;    // fraction of the half-span where the wing colour takes over
const BELLY_MIX = 0.55;   // how far a downward face is darkened, rather than blacked out
const _c = new THREE.Color();

function bandColor(t) {
  for (const [a, b, hex] of BANDS) if (t >= a && t < b) return hex;
  return BANDS.at(-1)[2];
}

// Writes a COLOR attribute onto the geometry. `axis` is the local axis running nose to tail, and
// `flip` is true when the nose sits at the positive end of it.
export function paintLivery(geometry, axis = 'x', flip = true, span = 'z') {
  const pos = geometry.attributes.position;
  const nrm = geometry.attributes.normal;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const lo = box.min[axis], hi = box.max[axis];
  const halfSpan = Math.max(Math.abs(box.min[span]), Math.abs(box.max[span])) || 1;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const a = pos.getComponent(i, 'xyz'.indexOf(axis));
    let t = (a - lo) / (hi - lo || 1);
    if (flip) t = 1 - t; // nose at the positive end: measure from there
    const out = Math.abs(pos.getComponent(i, 'xyz'.indexOf(span))) / halfSpan;
    _c.setHex(out > WING_FROM ? WING : bandColor(t));
    // Undersides are the same livery in shadow, not a black smear.
    if (nrm && nrm.getY(i) < -0.55) _c.multiplyScalar(1 - BELLY_MIX);
    _c.convertSRGBToLinear();
    col.set([_c.r, _c.g, _c.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
