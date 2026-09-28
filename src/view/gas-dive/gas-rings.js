// The planet's rings seen from inside its atmosphere: a huge arch across the sky.
// The ring plane passes through a virtual planet centre far below the camera, tilted by
// the viewer's latitude, so only the part above the horizon shows.
import * as THREE from 'three';

const PLANET_R = 8000, INNER = 1.3, OUTER = 2.35;
const VERT = /* glsl */ `
uniform float uCamY;
varying vec2 vUv;
varying float vRel;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vRel = world.y - uCamY;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;
const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uVis;
varying vec2 vUv;
varying float vRel;
void main() {
  vec4 t = texture2D(uMap, vUv);
  float a = t.a * uVis * smoothstep(0.0, 2500.0, vRel);
  if (a < 0.01) discard;
  gl_FragColor = vec4(t.rgb * 1.15, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function ringGeometry() {
  const inner = PLANET_R * INNER, outer = PLANET_R * OUTER;
  const geo = new THREE.RingGeometry(inner, outer, 256, 1);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const d = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (d - inner) / (outer - inner), 0.5);
  }
  return geo;
}

export function buildRingArch(map, rng) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: map }, uVis: { value: 1 }, uCamY: { value: 0 } },
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(ringGeometry(), mat);
  mesh.position.set(0, -PLANET_R, 0);
  mesh.rotation.set(-rng.range(0.35, 0.55), rng.range(-0.4, 0.4), 0, 'YXZ');
  mesh.renderOrder = -8.5e5;
  mesh.frustumCulled = false;
  return {
    mesh,
    update(cam, vis) {
      mat.uniforms.uCamY.value = cam.y;
      mat.uniforms.uVis.value = vis;
      mesh.visible = vis > 0.01;
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
