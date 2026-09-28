// Planet curvature: everything on a surface bends down with distance from the camera,
// drop = d² / (2R). Small planets show a tight, visibly curved horizon; big ones look vast.
export const curveUniform = { value: 0 };

const GLSL = `#include <project_vertex>
{
  float cd = length(mvPosition.xyz);
  mvPosition.xyz -= (viewMatrix * vec4(0.0, cd * cd * uCurve, 0.0, 0.0)).xyz;
  gl_Position = projectionMatrix * mvPosition;
}`;

// Apparent surface radius in metres for a planet (space radius 15..360 units).
export function surfaceRadius(planet) {
  if (planet.style === 'earth') return 60000; // home world: wide, almost flat horizon
  return Math.max(600, planet.radius * 70);
}

export function setCurvature(planet) {
  curveUniform.value = planet ? 1 / (2 * surfaceRadius(planet)) : 0;
}

// Adds the bend to one material (keeps any existing onBeforeCompile, e.g. flora sway).
function patchMaterial(mat) {
  if (mat.userData.curved || mat.isShaderMaterial || mat.isSpriteMaterial || mat.isPointsMaterial) return;
  mat.userData.curved = true;
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey();
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.call(mat, shader, renderer);
    shader.uniforms.uCurve = curveUniform;
    shader.vertexShader = 'uniform float uCurve;\n' + shader.vertexShader.replace('#include <project_vertex>', GLSL);
  };
  mat.customProgramCacheKey = () => `${prevKey}|curve`;
  mat.needsUpdate = true;
}

// Patch every material in the scene that isn't curved yet (call after spawning new things).
export function curveScene(scene) {
  scene.traverse((o) => {
    const m = o.material;
    if (!m) return;
    if (Array.isArray(m)) m.forEach(patchMaterial); else patchMaterial(m);
  });
}
