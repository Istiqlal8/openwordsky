// Human head: skull, jaw, ears and the face features the creator can change.
// Everything is local to the head group, which sits at the top of the torso.
import { mesh, pivot, sphere, box, cyl, torus, shell } from './parts.js';

const EYE_SCALE = { bulat: [1, 1, 0.45], sipit: [1.25, 0.5, 0.45], lebar: [1.28, 1.05, 0.45], tajam: [1.2, 0.7, 0.45] };
const BROW_H = { tipis: 0.012, sedang: 0.02, tebal: 0.032 };
const NOSE = { kecil: [0.6, 0.6, 0.85], sedang: [0.8, 0.72, 1.1], besar: [1, 0.92, 1.4], bengkok: [0.78, 1.05, 1.3] };

function addEyes(head, look, mats) {
  const s = EYE_SCALE[look.face.eyes] ?? EYE_SCALE.bulat;
  for (const side of [-1, 1]) {
    const eye = mesh(sphere(0.037, 10), mats.eye, side * 0.072, 0.018, -0.163, s[0], s[1], s[2]);
    eye.add(mesh(sphere(0.021, 8), mats.iris, 0, 0, -0.035));
    head.add(eye);
  }
}

function addBrows(head, look, mats) {
  const h = BROW_H[look.face.brow] ?? BROW_H.sedang;
  const geo = box(0.085, h, 0.03);
  for (const side of [-1, 1]) {
    const brow = mesh(geo, mats.hair, side * 0.077, 0.068, -0.172);
    brow.rotation.z = look.face.eyes === 'tajam' ? side * 0.22 : side * 0.06;
    head.add(brow);
  }
}

function addNoseMouth(head, look, mats) {
  const n = NOSE[look.face.nose] ?? NOSE.sedang;
  const nose = mesh(sphere(0.05, 10), mats.skin, 0, -0.01, -0.185, n[0], n[1], n[2]);
  if (look.face.nose === 'bengkok') nose.rotation.z = 0.4;
  head.add(nose);
  const m = look.face.mouth;
  if (m === 'senyum') {
    const smile = mesh(torus(0.05, 0.009, Math.PI), mats.mouth, 0, -0.085, -0.178);
    smile.rotation.z = Math.PI;
    head.add(smile);
  } else {
    head.add(mesh(box(m === 'tegas' ? 0.095 : 0.075, m === 'tegas' ? 0.011 : 0.018, 0.02), mats.mouth, 0, -0.1, -0.178));
  }
}

function addBeard(head, look, mats) {
  const b = look.face.beard;
  if (b === 'tanpa') return;
  if (b === 'kumis' || b === 'penuh') head.add(mesh(box(0.07, 0.018, 0.026), mats.hair, 0, -0.072, -0.18));
  if (b === 'jambang' || b === 'penuh') {
    for (const side of [-1, 1]) head.add(mesh(box(0.024, 0.11, 0.07), mats.hair, side * 0.16, -0.03, -0.055));
  }
  if (b === 'penuh') head.add(mesh(shell(0.192, Math.PI * 0.56, Math.PI * 0.44, 12), mats.hair, 0, -0.02, -0.01, 1, 0.9, 1));
}

// Returns the head pivot; the caller positions it and adds hair, hats and the helmet.
export function buildHead(look, mats) {
  const head = pivot();
  head.add(mesh(sphere(0.2, 16), mats.skin, 0, 0, 0, 1, 1.06, 1));
  head.add(mesh(sphere(0.14, 12), mats.skin, 0, -0.1, -0.03, 1, 0.8, 1.05));
  for (const side of [-1, 1]) head.add(mesh(sphere(0.045, 8), mats.skin, side * 0.19, 0, 0.02, 0.6, 1, 0.8));
  head.add(mesh(cyl(0.07, 0.085, 0.14), mats.skin, 0, -0.21, 0));
  addEyes(head, look, mats);
  addBrows(head, look, mats);
  addNoseMouth(head, look, mats);
  addBeard(head, look, mats);
  return head;
}
