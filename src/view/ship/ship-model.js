// Assemble a 3D ship from a design. Faces local -Z, ~6-10 units long (1 unit = 1 m).
import * as THREE from 'three';
import { shipMaterials } from './ship-materials.js';
import { buildBody, buildCanopy, buildFins, buildAntenna, buildCargo, buildExotic } from './ship-hull.js';
import { buildWings, buildGuns } from './ship-wings.js';
import { buildEngines, buildLegs, setFlames } from './ship-engines.js';
import { buildBooms, buildSpineStripe } from './ship-booms.js';
import { attachGlbHull } from './ship-glb.js';

function addExtras(group, p, mats) {
  for (const fin of buildFins(p, mats)) group.add(fin);
  if (p.antenna) group.add(buildAntenna(p, mats));
  if (p.cargo) group.add(buildCargo(p, mats));
  if (p.body === 'pod' || p.ring) group.add(buildExotic(p, mats));
  if (p.booms) group.add(buildBooms(p, mats));
  if (p.decal === 'stripe') group.add(buildSpineStripe(p, mats));
}

function disposeGroup(group) {
  const mats = new Set();
  group.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) mats.add(o.material);
  });
  for (const m of mats) m.dispose(); // the glow texture is cached in textures.js, kept alive
}

// Returns { group, engines, muzzles, legs, groundOffset, setThrust(t), setLegs(down), dispose() }.
export function buildShip(design) {
  const p = design.parts;
  const mats = shipMaterials(design.palette, design.cls);
  const group = new THREE.Group();
  group.name = `ship:${design.name}`;
  group.add(buildBody(p, mats), buildCanopy(p, mats), ...buildWings(p, mats));
  addExtras(group, p, mats);
  const guns = buildGuns(p, mats);
  group.add(...guns.meshes);
  const eng = buildEngines(p, mats);
  const legs = buildLegs(p, mats);
  group.add(eng.group, legs.group);
  setFlames(eng.flames, 0, mats);
  const model = {
    group, engines: eng.flames, muzzles: guns.muzzles, legs: legs.group, groundOffset: legs.groundOffset,
    length: p.length + 0.6, disposed: false,
    setThrust: (t) => setFlames(eng.flames, THREE.MathUtils.clamp(t, 0, 1), mats),
    setLegs: (down) => { legs.group.visible = down; },
    dispose: () => { model.disposed = true; disposeGroup(group); },
  };
  if (design.glb) attachGlbHull(model, design, mats, [eng.group, legs.group]);
  return model;
}
