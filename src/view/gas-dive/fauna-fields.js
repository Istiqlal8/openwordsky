// Instanced body-part pools shared by every gas creature: solid flesh blobs, tubes (tentacles,
// stalks), translucent rim-lit gas sacs, and flapping manta wings. One draw call per pool.
import * as THREE from 'three';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _d = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

const RIM_VERT = /* glsl */ `
uniform float uDensity;
varying vec3 vN;
varying vec3 vV;
varying vec3 vCol;
void main() {
  mat4 m = modelMatrix * instanceMatrix;
  vec4 mv = viewMatrix * m * vec4(position, 1.0);
  vN = normalize(mat3(viewMatrix) * mat3(m) * normal);
  vV = normalize(-mv.xyz);
  vCol = instanceColor * exp(-pow(uDensity * -mv.z * 0.7, 2.0));
  gl_Position = projectionMatrix * mv;
}`;

const RIM_FRAG = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vCol;
void main() {
  float rim = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  gl_FragColor = vec4(vCol * (0.12 + pow(rim, 2.2) * 1.1), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// One InstancedMesh refilled every frame; instanceColor carries tint (x brightness).
export class PartField {
  constructor(parent, geo, mat, cap) {
    const mesh = new THREE.InstancedMesh(geo, mat, cap);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
    parent.add(mesh);
    Object.assign(this, { mesh, cap, n: 0 });
  }

  begin() { this.n = 0; }

  push(matrix, c, k = 1) {
    if (this.n >= this.cap) return;
    this.mesh.setMatrixAt(this.n, matrix);
    this.mesh.instanceColor.setXYZ(this.n++, c.r * k, c.g * k, c.b * k);
  }

  end() {
    const m = this.mesh;
    m.count = this.n;
    m.instanceMatrix.needsUpdate = m.instanceColor.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.removeFromParent();
  }
}

// Tube from a to b with radius r (cylinder pool, base at a).
export function tube(field, a, b, r, c, k = 1) {
  _d.subVectors(b, a);
  const len = _d.length();
  if (len < 1e-3) return;
  _q.setFromUnitVectors(UP, _d.divideScalar(len));
  _m.compose(a, _q, _s.set(r, len, r));
  field.push(_m, c, k);
}

// A creature's body frame: parts are placed in body units (forward = -Z) then scaled by size.
export class Frame {
  constructor() { this.m = new THREE.Matrix4(); }

  set(pos, quat, size) {
    this.m.compose(pos, quat, _s.setScalar(size));
    return this;
  }

  // Part at local (x, y, z), local euler (rx, ry, rz), local scale (sx, sy, sz).
  part(field, x, y, z, rx, ry, rz, sx, sy, sz, c, k = 1) {
    _q.setFromEuler(_e.set(rx, ry, rz));
    _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)).premultiply(this.m);
    field.push(_m, c, k);
  }

  point(out, x, y, z) { return out.set(x, y, z).applyMatrix4(this.m); }
}

function fleshMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0 });
}

function rimMaterial(density) {
  return new THREE.ShaderMaterial({ vertexShader: RIM_VERT, fragmentShader: RIM_FRAG, uniforms: { uDensity: density },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
}

// Flat manta outline (nose at -Z, wingtips on +/-X); the vertex shader flaps the wings.
function mantaGeometry() {
  const right = [[0.18, -0.42], [0.55, -0.18], [1, 0.08], [0.55, 0.12], [0.22, 0.3], [0.06, 0.42]];
  const s = new THREE.Shape();
  s.moveTo(0, -0.55);
  for (const [x, z] of right) s.lineTo(x, z);
  s.lineTo(0, 0.5);
  for (const [x, z] of right.slice().reverse()) s.lineTo(-x, z);
  return new THREE.ShapeGeometry(s).rotateX(Math.PI / 2);
}

function mantaMaterial(time) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = instanceMatrix[3].x * 0.071 + instanceMatrix[3].z * 0.053;
      transformed.y += sin(uTime * 2.4 + ph - abs(position.x) * 1.2) * pow(abs(position.x), 1.5) * 0.42;
      transformed.y -= position.z * position.z * 0.12;`);
  };
  return mat;
}

// All part pools in one bundle; begin/end wraps a frame of drawing.
export function buildFields(parent, density, time) {
  const cyl = new THREE.CylinderGeometry(0.55, 1, 1, 7, 1, true).translate(0, 0.5, 0);
  return {
    flesh: new PartField(parent, new THREE.SphereGeometry(1, 18, 12), fleshMaterial(), 1200),
    tube: new PartField(parent, cyl, fleshMaterial(), 2600),
    rim: new PartField(parent, new THREE.SphereGeometry(1, 20, 14), rimMaterial(density), 260),
    manta: new PartField(parent, mantaGeometry(), mantaMaterial(time), 64),
  };
}
