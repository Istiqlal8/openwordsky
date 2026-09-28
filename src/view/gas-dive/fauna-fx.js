// Per-frame glow buffers for gas fauna: instanced glow billboards and additive line strands.
// Species write into them every frame (begin -> add... -> end); one draw call each.
import * as THREE from 'three';
import { glowTexture } from '../../assets/textures.js';

const TAIL = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

const GLOW_VERT = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iCol; // rgb (may exceed 1), size
uniform float uDensity;
varying vec2 vUv;
varying vec3 vCol;
void main() {
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  float d = -mv.z;
  mv.xy += position.xy * iCol.w;
  vUv = uv;
  float fog = exp(-pow(uDensity * d * 0.55, 2.0));
  vCol = iCol.rgb * fog * smoothstep(iCol.w * 0.2, iCol.w * 0.9, d);
  gl_Position = projectionMatrix * mv;
}`;

const GLOW_FRAG = /* glsl */ `
uniform sampler2D uMap;
varying vec2 vUv;
varying vec3 vCol;
void main() {
  vec4 t = texture2D(uMap, vUv);
  gl_FragColor = vec4(vCol * t.rgb * t.a, 1.0);
  ${TAIL}
}`;

const LINE_VERT = /* glsl */ `
attribute vec3 color;
uniform float uDensity;
varying vec3 vCol;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vCol = color * exp(-pow(uDensity * -mv.z * 0.7, 2.0));
  gl_Position = projectionMatrix * mv;
}`;

const LINE_FRAG = /* glsl */ `
varying vec3 vCol;
void main() {
  gl_FragColor = vec4(vCol, 1.0);
  ${TAIL}
}`;

function additive(vertexShader, fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending });
}

function dynamicAttr(geo, name, size, cap, Attr = THREE.BufferAttribute) {
  const a = new Attr(new Float32Array(cap * size), size).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute(name, a);
  return a;
}

// Camera-facing glow sprites; add(pos, size, color, k) with k = brightness.
export class GlowField {
  constructor(parent, cap, density) {
    const geo = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    geo.index = quad.index;
    geo.setAttribute('position', quad.getAttribute('position'));
    geo.setAttribute('uv', quad.getAttribute('uv'));
    quad.dispose();
    this.pos = dynamicAttr(geo, 'iPos', 3, cap, THREE.InstancedBufferAttribute);
    this.col = dynamicAttr(geo, 'iCol', 4, cap, THREE.InstancedBufferAttribute);
    this.mesh = new THREE.Mesh(geo, additive(GLOW_VERT, GLOW_FRAG, { uMap: { value: glowTexture(0xffffff) }, uDensity: density }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
    parent.add(this.mesh);
    this.cap = cap;
    this.n = 0;
  }

  begin() { this.n = 0; }

  add(p, size, c, k = 1) {
    if (this.n >= this.cap || k <= 0.002) return;
    const i = this.n++;
    this.pos.setXYZ(i, p.x, p.y, p.z);
    this.col.setXYZW(i, c.r * k, c.g * k, c.b * k, size);
  }

  end() {
    this.mesh.geometry.instanceCount = this.n;
    this.pos.needsUpdate = this.col.needsUpdate = true;
    this.pos.addUpdateRange(0, this.n * 3);
    this.col.addUpdateRange(0, this.n * 4);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.removeFromParent();
  }
}

// Additive line segments (filaments, tails, electric arcs); add(a, b, color, k).
export class StrandField {
  constructor(parent, cap, density) {
    const geo = new THREE.BufferGeometry();
    this.pos = dynamicAttr(geo, 'position', 3, cap * 2);
    this.col = dynamicAttr(geo, 'color', 3, cap * 2);
    this.mesh = new THREE.LineSegments(geo, additive(LINE_VERT, LINE_FRAG, { uDensity: density }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
    parent.add(this.mesh);
    this.cap = cap;
    this.n = 0;
  }

  begin() { this.n = 0; }

  add(a, b, c, k = 1) {
    if (this.n >= this.cap || k <= 0.002) return;
    const i = this.n++ * 2;
    this.pos.setXYZ(i, a.x, a.y, a.z);
    this.pos.setXYZ(i + 1, b.x, b.y, b.z);
    this.col.setXYZ(i, c.r * k, c.g * k, c.b * k);
    this.col.setXYZ(i + 1, c.r * k * 0.6, c.g * k * 0.6, c.b * k * 0.6);
  }

  end() {
    this.mesh.geometry.setDrawRange(0, this.n * 2);
    this.pos.needsUpdate = this.col.needsUpdate = true;
    this.pos.addUpdateRange(0, this.n * 6);
    this.col.addUpdateRange(0, this.n * 6);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.removeFromParent();
  }
}
