// Shared building blocks for the ocean: one clock uniform, vertex-colored geometry merging,
// and small shader patches (plant sway, fish tail wiggle, jelly pulse) on stock materials.
import * as THREE from 'three';

export const oceanTime = { value: 0 };

// Merges { geo, color, t? } parts into one non-indexed geometry with a vertex color per part
// and an optional per-vertex float attribute 'aT' (e.g. position along a tentacle).
export function mergeParts(parts) {
  const flat = parts.map((p) => ({ ...p, g: p.geo.index ? p.geo.toNonIndexed() : p.geo }));
  const n = flat.reduce((s, p) => s + p.g.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), at = new Float32Array(n);
  const c = new THREE.Color();
  let o = 0;
  for (const p of flat) {
    const cnt = p.g.attributes.position.count;
    pos.set(p.g.attributes.position.array, o * 3);
    nor.set(p.g.attributes.normal.array, o * 3);
    c.set(p.color ?? 0xffffff);
    for (let i = 0; i < cnt; i++) {
      col.set([c.r, c.g, c.b], (o + i) * 3);
      at[o + i] = typeof p.t === 'function' ? p.t(p.g.attributes.position, i) : p.t ?? 0;
    }
    o += cnt;
    if (p.g !== p.geo) p.g.dispose();
    p.geo.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aT', new THREE.BufferAttribute(at, 1));
  geo.computeBoundingSphere();
  return geo;
}

// Injects GLSL into a stock material: head (both stages), vertex body after begin_vertex,
// fragment body after color_fragment. key keeps shader programs apart.
export function patchMaterial(mat, key, { head = '', vertex = '', fragment = '', extra = {} }) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = oceanTime;
    Object.assign(shader.uniforms, extra);
    const h = `uniform float uTime;\nattribute float aT;\nvarying float vPulse;\n${head}\n`;
    shader.vertexShader = h + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\nvPulse = 0.0;\n${vertex}`);
    shader.fragmentShader = `uniform float uTime;\nvarying float vPulse;\n${head.replace(/attribute[^;]*;/g, '')}\n` +
      shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${fragment}`);
  };
  mat.customProgramCacheKey = () => `ocean-${key}`;
  return mat;
}

const INST = `#ifdef USE_INSTANCING
  vec3 ip = vec3(instanceMatrix[3]); float iid = float(gl_InstanceID);
#else
  vec3 ip = vec3(0.0); float iid = 0.0;
#endif`;

// Plants: bend grows with height (geometry y in 0..1); phase from the instance position.
export function swayMaterial(key, opts, amount = 0.35, speed = 1.1) {
  return patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, ...opts }), key, {
    vertex: `${INST}
  float sk = max(position.y, 0.0); float sph = uTime * ${speed.toFixed(2)} + ip.x * 0.21 + ip.z * 0.17;
  transformed.x += sin(sph) * sk * sk * ${amount.toFixed(2)} + sin(sph * 2.3 + sk * 3.0) * sk * 0.05;
  transformed.z += cos(sph * 0.8) * sk * sk * ${(amount * 0.6).toFixed(2)};`,
  });
}

// Fish: forward +X, tail at -X wiggles sideways; each instance on its own phase.
export function fishMaterial(key, opts = {}, unlit = false) {
  const mat = unlit ? new THREE.MeshBasicMaterial({ vertexColors: true, ...opts })
    : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.25, ...opts });
  return patchMaterial(mat, key, {
    vertex: `${INST}
  float fk = smoothstep(0.2, -0.55, position.x);
  transformed.z += sin(uTime * 11.0 + iid * 1.37 - position.x * 5.0) * 0.16 * fk;
  vPulse = 0.5 + 0.5 * sin(uTime * 2.0 + iid * 2.1);`,
  });
}

// Glowing jellies (additive): the bell breathes, tentacles trail, brightness pulses.
export function jellyMaterial(key) {
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  return patchMaterial(mat, key, {
    vertex: `${INST}
  float pu = sin(uTime * 2.2 + iid * 0.9);
  float bell = step(0.0, position.y);
  transformed.xz *= 1.0 + pu * 0.14 * bell;
  transformed.y *= 1.0 - pu * 0.1 * bell;
  float dn = max(-position.y, 0.0);
  transformed.x += sin(uTime * 1.6 + dn * 1.8 + iid) * 0.12 * dn;
  vPulse = 0.5 + 0.5 * pu;`,
    fragment: 'diffuseColor.rgb *= 0.45 + 0.75 * vPulse;',
  });
}

// Canvas texture: soft vertical fade (1 at the top, 0 at the bottom) for light cones and rays.
export function fadeTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 64;
  const g = c.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
