// Procedural deep-sea bodies (forward +X, ~1 unit long): anglerfish with a glowing lure,
// giant squid with shader-animated arms, and a stand-in whale until whale.glb has loaded.
import * as THREE from 'three';
import { mergeParts, patchMaterial } from './ocean-kit.js';
import { glowTexture } from '../assets/textures.js';

const eyes = (x, y, z, r, color = 0x080808) => [-1, 1].map((s) => ({ geo: new THREE.SphereGeometry(r, 8, 6).translate(x, y, s * z), color }));

function glowSprite(kit, color, scale) {
  const mat = kit.mat(`glow-${color}`, () => new THREE.SpriteMaterial({ map: glowTexture(color), color, blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false }));
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(scale);
  return s;
}

export function buildAngler(kit, pal) {
  const body = kit.geo('angler-body', () => {
    const teeth = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 8 - 0.5) * 2.2;
      teeth.push({ geo: new THREE.ConeGeometry(0.018, 0.09, 4).rotateZ(Math.PI).translate(0.4 + Math.cos(a) * 0.02, 0.02, Math.sin(a) * 0.2), color: 0xf0f0e0 });
      teeth.push({ geo: new THREE.ConeGeometry(0.02, 0.11, 4).translate(0.42, -0.1, Math.sin(a) * 0.22), color: 0xf0f0e0 });
    }
    return mergeParts([
      { geo: new THREE.SphereGeometry(0.4, 16, 12).scale(1, 0.85, 0.8), color: pal.angler },
      { geo: new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.1, 0.8, 1).translate(0.14, -0.08, 0), color: pal.angler },
      { geo: new THREE.ConeGeometry(0.16, 0.3, 4).rotateZ(-Math.PI / 2).scale(1, 1, 0.12).translate(-0.48, 0, 0), color: pal.angler },
      ...eyes(0.25, 0.14, 0.2, 0.045, 0xc8d8ff), ...teeth,
    ]);
  });
  const stalk = kit.geo('angler-stalk', () => mergeParts([{ geo: new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 0.4, 0), new THREE.Vector3(0.4, 0.35, 0)), 10, 0.012, 4), color: pal.angler }]));
  const glow = pal.glow[0];
  const bulbMat = kit.mat(`bulb-${glow}`, () => new THREE.MeshBasicMaterial({ color: glow }));
  const mat = kit.lit('angler', { roughness: 0.4, metalness: 0.2 });
  const group = new THREE.Group(), lure = new THREE.Group();
  lure.position.set(0.2, 0.28, 0);
  const bulb = new THREE.Mesh(kit.geo('bulb', () => new THREE.SphereGeometry(0.05, 8, 6)), bulbMat);
  bulb.position.set(0.4, 0.33, 0);
  const halo = glowSprite(kit, glow, 1.6);
  halo.position.copy(bulb.position);
  lure.add(new THREE.Mesh(stalk, mat), bulb, halo);
  group.add(new THREE.Mesh(body, mat), lure);
  return { group, anim: (t) => {
    lure.rotation.z = Math.sin(t * 1.3) * 0.18;
    halo.scale.setScalar(1.3 + Math.sin(t * 3.1) * 0.35);
  } };
}

// Arms trail behind (-X). aT = arm index + position along the arm (0 root .. 1 tip).
function squidArms(color) {
  const parts = [];
  for (let i = 0; i < 10; i++) {
    const long = i >= 8, len = long ? 1.5 : 0.7, a = (i / 10) * Math.PI * 2, r = 0.07;
    const geo = new THREE.CylinderGeometry(0.03, 0.008, len, 5, 12).translate(0, -len / 2, 0).rotateZ(-Math.PI / 2)
      .translate(-0.3, Math.cos(a) * r, Math.sin(a) * r);
    parts.push({ geo, color, t: (p, k) => i + Math.min(0.999, (-0.3 - p.getX(k)) / len) });
  }
  return mergeParts(parts);
}

export function buildSquid(kit, pal) {
  const body = kit.geo('squid-body', () => mergeParts([
    { geo: new THREE.ConeGeometry(0.16, 0.75, 14).rotateZ(-Math.PI / 2).translate(0.2, 0, 0), color: pal.squid },
    ...[1, -1].map((s) => ({ geo: new THREE.ConeGeometry(0.12, 0.2, 3).scale(1, 1, 0.1).translate(0, 0.1, 0).rotateX(s * Math.PI / 2).translate(0.48, 0, 0), color: pal.squid })),
    { geo: new THREE.SphereGeometry(0.12, 12, 8).scale(1.3, 1, 1).translate(-0.24, 0, 0), color: pal.squid },
    ...eyes(-0.22, 0.03, 0.11, 0.05, 0xf4f0e0), ...eyes(-0.2, 0.03, 0.15, 0.025),
  ]));
  const arms = kit.geo('squid-arms', () => squidArms(pal.squid));
  const armMat = kit.mat('squid-arms', () => patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), 'squid-arms', {
    vertex: `float sIdx = floor(aT); float sAl = fract(aT); float sPh = uTime * 1.8 + sIdx * 1.3 + modelMatrix[3].x * 0.1;
  transformed.y += sin(sPh + sAl * 5.0) * sAl * sAl * 0.18;
  transformed.z += cos(sPh * 0.8 + sAl * 4.0) * sAl * sAl * 0.14;
  transformed.yz *= 1.0 - sAl * 0.15 * (0.5 + 0.5 * sin(uTime * 1.2));`,
  }));
  const group = new THREE.Group();
  group.add(new THREE.Mesh(body, kit.lit('squid', { roughness: 0.45 })), new THREE.Mesh(arms, armMat));
  return { group, anim: (t) => { group.children[0].scale.set(1, 1 + Math.sin(t * 1.2) * 0.06, 1 + Math.sin(t * 1.2) * 0.06); } };
}

// Stand-in whale (length 1) shown until the rigged model is ready.
export function buildWhaleStandIn(kit, color) {
  const body = kit.geo(`whale-${color}`, () => mergeParts([
    { geo: new THREE.SphereGeometry(0.5, 16, 10).scale(1, 0.2, 0.22), color },
    { geo: new THREE.BoxGeometry(0.08, 0.015, 0.36).translate(-0.52, 0, 0), color },
    { geo: new THREE.BoxGeometry(0.12, 0.015, 0.5).rotateX(0.3).translate(0.15, -0.07, 0), color },
  ]));
  const group = new THREE.Group();
  group.add(new THREE.Mesh(body, kit.lit('whale-standin')));
  return { group, anim: () => {} };
}
