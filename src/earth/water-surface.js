// Animated water for planet surfaces: rolling swell from a few directional waves, whitecaps
// on the crests, foam where the water meets the shore (depth from the terrain patch), a
// fresnel sky tint and the sun's glint. Lava worlds get a slow glowing flow instead.
// Wave heights are mirrored on the CPU (heightAt) so a swimmer can bob with the swell.
import * as THREE from 'three';

const GRID = 256, REACH = 9000; // vertices per side; half-size in metres (dense near the center)
const DEPTH_SCALE = 10;         // depth texture: byte = metres * 10 (0..25.5 m)
// [dirX, dirZ, wavenumber, angular speed, relative amplitude]
const WAVES = [[0.8, 0.6, 0.165, 1.27, 0.5], [-0.4, 0.92, 0.3, 1.71, 0.3], [0.95, -0.3, 0.57, 2.37, 0.15], [0.2, 0.98, 0.97, 3.08, 0.08]];
const GLSL_WAVES = WAVES.map(([x, z, k, w, a]) => `wave(p, vec2(${x}, ${z}), ${k}, ${w}, ${a}, t, h);`).join('\n');

const COMMON = `uniform float uTime; uniform float uAmp; uniform sampler2D uDepth; uniform vec4 uDepthRect;
varying float vWave; varying float vDepth; varying vec2 vXZ;
void wave(vec2 p, vec2 d, float k, float w, float a, float t, inout vec3 h) {
  float ph = dot(normalize(d), p) * k - t * w;
  h.x += sin(ph) * a; h.yz += normalize(d) * cos(ph) * a * k;
}
vec3 waves(vec2 p, float t) { vec3 h = vec3(0.0);\n${GLSL_WAVES}\n return h; }
float waterDepth(vec2 p) {
  vec2 uv = (p - uDepthRect.xy) / uDepthRect.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 25.0;
  return texture2D(uDepth, uv).r * 25.5;
}`;

const VERTEX = `vec2 wxz = (modelMatrix * vec4(position, 1.0)).xz;
float wDepth = waterDepth(wxz);
float wFar = 1.0 - smoothstep(120.0, 500.0, distance(wxz, cameraPosition.xz)); // coarse far grid: flatten
float wAmp = uAmp * (0.2 + 0.8 * smoothstep(0.0, 6.0, wDepth)) * wFar;
vec3 wh = waves(wxz, uTime) * wAmp;
vec3 objectNormal = normalize(vec3(-wh.y, 1.0, -wh.z));
vWave = wh.x / max(uAmp, 0.001); vDepth = wDepth; vXZ = wxz;`;

const FOAM = `#include <color_fragment>
float fn = sin(vXZ.x * 1.7 + sin(vXZ.y * 1.3) * 2.0) * sin(vXZ.y * 1.9 + uTime * 0.6);
float shore = (1.0 - smoothstep(0.0, 0.7, vDepth)) * (0.55 + 0.45 * sin(vDepth * 14.0 - uTime * 2.2));
float crest = smoothstep(0.62, 0.95, vWave) * step(0.25, uAmp);
float foam = clamp(max(shore, crest) * (0.75 + 0.35 * fn), 0.0, 1.0);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.96, 0.97), foam);
diffuseColor.a = mix(diffuseColor.a, 0.97, foam);`;

const FRESNEL = `#include <emissivemap_fragment>
float fres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 4.0);
totalEmissiveRadiance += uSky * fres * 0.55;`;

const LAVA = `#include <emissivemap_fragment>
float flow = sin(vXZ.x * 0.13 + uTime * 0.25) * sin(vXZ.y * 0.11 - uTime * 0.18) + sin((vXZ.x + vXZ.y) * 0.31 + uTime * 0.4) * 0.5;
totalEmissiveRadiance *= 0.7 + 0.45 * flow;`;

// Plane whose vertex spacing grows with distance: fine ripples nearby, kilometres of sea.
function waterGeometry() {
  const geo = new THREE.PlaneGeometry(2, 2, GRID, GRID).rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const warp = (v) => v * 120 + Math.sign(v) * Math.pow(Math.abs(v), 2.6) * (REACH - 120);
  for (let i = 0; i < p.count; i++) p.setXYZ(i, warp(p.getX(i)), 0, warp(p.getZ(i)));
  geo.computeBoundingSphere();
  return geo;
}

function inject(mat, uniforms, lava) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = COMMON + '\n' + shader.vertexShader
      .replace('#include <beginnormal_vertex>', VERTEX)
      .replace('#include <begin_vertex>', lava ? 'vec3 transformed = vec3(position);' : 'vec3 transformed = vec3(position.x, position.y + wh.x, position.z);');
    shader.fragmentShader = COMMON + '\nuniform vec3 uSky;\n' + shader.fragmentShader
      .replace('#include <color_fragment>', lava ? '#include <color_fragment>' : FOAM)
      .replace('#include <emissivemap_fragment>', lava ? LAVA : FRESNEL);
  };
  mat.customProgramCacheKey = () => (lava ? 'lava-surface' : 'water-surface');
}

export class WaterSurface {
  constructor(scene, planet) {
    const t = planet.terrain, color = planet.palette.water;
    this.scene = scene;
    this.y = t.waterY;
    this.lava = planet.biome.id === 'volcanic';
    this.amp = this.lava ? 0 : (planet.style === 'earth' ? 0.55 : 0.25) * (/Badai/.test(planet.weather ?? '') ? 2.2 : 1);
    this.depthData = new Uint8Array(128 * 128).fill(255);
    this.depthTex = new THREE.DataTexture(this.depthData, 128, 128, THREE.RedFormat);
    this.depthTex.magFilter = this.depthTex.minFilter = THREE.LinearFilter;
    this.uniforms = { uTime: { value: 0 }, uAmp: { value: this.amp }, uDepth: { value: this.depthTex },
      uDepthRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uSky: { value: new THREE.Color(planet.palette.sky) } };
    this.material = new THREE.MeshStandardMaterial({ color, roughness: this.lava ? 0.9 : 0.12, metalness: this.lava ? 0 : 0.1,
      transparent: !this.lava, opacity: this.lava ? 1 : 0.84, emissive: this.lava ? color : 0x000000,
      emissiveIntensity: this.lava ? 1.3 : 0, side: this.lava ? THREE.FrontSide : THREE.DoubleSide });
    inject(this.material, this.uniforms, this.lava);
    this.mesh = new THREE.Mesh(waterGeometry(), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.position.y = this.y;
    scene.add(this.mesh);
  }

  // Water depth around the terrain patch (heights on a regular grid), for shore foam and calm shallows.
  setDepth(patch) {
    const { center, size } = patch, d = this.depthData;
    for (let j = 0; j < 128; j++) {
      for (let i = 0; i < 128; i++) {
        const x = center.x - size / 2 + (i + 0.5) / 128 * size, z = center.z - size / 2 + (j + 0.5) / 128 * size;
        d[j * 128 + i] = Math.max(0, Math.min(255, (this.y - patch.heightAt(x, z)) * DEPTH_SCALE));
      }
    }
    this.depthTex.needsUpdate = true;
    this.uniforms.uDepthRect.value.set(center.x - size / 2, center.z - size / 2, size, size);
  }

  // Surface height at x/z right now (seaDepth: water depth there, calms the swell in shallows).
  heightAt(x, z, seaDepth = 25) {
    if (!this.amp) return this.y;
    const t = this.uniforms.uTime.value, calm = Math.min(1, Math.max(0, seaDepth / 6));
    let h = 0;
    for (const [dx, dz, k, w, a] of WAVES) {
      const n = Math.hypot(dx, dz);
      h += Math.sin(((dx * x + dz * z) / n) * k - t * w) * a;
    }
    return this.y + h * this.amp * (0.2 + 0.8 * calm * calm * (3 - 2 * calm));
  }

  // Follows the player in 2 m steps so the dense center stays under the camera.
  update(dt, px, pz, sky) {
    this.uniforms.uTime.value += dt;
    this.mesh.position.set(Math.round(px / 2) * 2, this.y, Math.round(pz / 2) * 2);
    if (sky) this.uniforms.uSky.value.copy(sky);
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.depthTex.dispose();
  }
}
