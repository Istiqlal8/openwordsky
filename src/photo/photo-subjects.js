// What is in the picture: animals in the camera frustum (golden rares, legends, pets, species),
// night / aurora skies and running planet events. -> list of subject strings.
import * as THREE from 'three';

export const SUBJECT = {
  legend: 'Legendaris', rare: 'Hewan Langka', night: 'Malam', aurora: 'Aurora',
  event: 'Peristiwa', animal: 'Hewan', pet: 'Peliharaan', ride: 'Tunggangan',
};
const FAR = 90;          // ordinary animals must be this close to count
const LEGEND_FAR = 260;
const frustum = new THREE.Frustum();
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();

function inView(root, cam, far) {
  root.getWorldPosition(_p);
  _p.y += 0.5;
  return _p.distanceTo(cam.position) < far && frustum.containsPoint(_p);
}

function animals(ctx, cam, out) {
  const herds = ctx.creatures?.groups ?? [];
  for (const g of herds) {
    for (const a of g.animals ?? []) {
      if (a.dead || !inView(a.root, cam, FAR)) continue;
      out.add(SUBJECT.animal);
      if (a.sp?.name) out.add(`Spesies: ${a.sp.name}`);
      if (a.rare) out.add(SUBJECT.rare);
    }
  }
}

function sky(ctx, out) {
  const s = ctx.surface.sky;
  if (!s || s.nightFactor < 0.6) return;
  out.add(SUBJECT.night);
  if (s.aurora) out.add(SUBJECT.aurora);
}

// hunt: LegendHunt or null; riding: true while mounted.
export function photoSubjects(ctx, hunt, riding) {
  const cam = ctx.surface.camera, out = new Set();
  cam.updateMatrixWorld();
  frustum.setFromProjectionMatrix(_m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  animals(ctx, cam, out);
  const beast = hunt?.beast;
  if (beast?.alive && beast.root && inView(beast.root, cam, LEGEND_FAR)) out.add(SUBJECT.legend);
  const pet = ctx.pets?.body;
  if (pet && inView(pet.root, cam, FAR)) out.add(SUBJECT.pet);
  if (riding) out.add(SUBJECT.ride);
  sky(ctx, out);
  const ev = ctx.gameplay?.addons?.find((a) => a.events)?.events?.current;
  if (ev) out.add(SUBJECT.event);
  return [...out];
}
