// Builds minimap + screen-marker data from the live scenes each frame.
import * as THREE from 'three';
import { isTradeWorld, TRADE_LABEL, TRADE_COLOR } from '../trade/trade-worlds.js';

const fwd = new THREE.Vector3();
const MAX_HOSTILE_MARKERS = 8;

function headingOf(obj) {
  obj.getWorldDirection(fwd);
  // Cameras look down -Z but Object3D.getWorldDirection returns +Z for meshes.
  if (!obj.isCamera) fwd.negate();
  return Math.atan2(-fwd.x, -fwd.z);
}

const dist = (d) => `${Math.round(Math.max(0, d)).toLocaleString('id-ID')} u`;

export function spaceFeed(space, combat, target, npcs = []) {
  const ship = space.shipObject.position, star = space.system.star;
  const bodies = space.bodies.map((b) => ({ x: b.pos.x, z: b.pos.z, r: b.radius, color: b.planet.palette.ground1,
    name: b.planet.name, orbit: b.planet.orbit.radius, current: target?.planet === b.planet }));
  const pirates = combat.pirates ?? [];
  const markers = space.bodies.map((b, i) => {
    const trade = isTradeWorld(b.planet);
    return { id: `p${i}`, position: b.pos, label: b.planet.name,
      sub: `${trade ? `${TRADE_LABEL} · ` : ''}${dist(b.pos.distanceTo(ship) - b.radius)}`,
      color: trade ? TRADE_COLOR : b.planet.palette.ground1, kind: 'planet' };
  });
  for (const n of npcs.slice(0, 4)) {
    markers.push({ id: `n${n.id}`, position: n.position, label: n.name, sub: dist(n.position.distanceTo(ship)), color: 0x9fe8ff, kind: 'ship' });
  }
  for (const p of pirates.slice(0, MAX_HOSTILE_MARKERS)) {
    markers.push({ id: `h${pirates.indexOf(p)}`, position: p.group.position, kind: 'hostile' });
  }
  return {
    map: { ship: { x: ship.x, z: ship.z, heading: headingOf(space.shipObject) }, star: { r: star.size, color: star.color },
      bodies, hostiles: pirates.map((p) => ({ x: p.group.position.x, z: p.group.position.z })), pulse: space.pulsing },
    markers,
  };
}

function creaturesOf(wildlife) {
  const out = [];
  for (const g of wildlife?.groups ?? []) {
    for (const b of g.bodies?.() ?? []) out.push({ x: b.root.position.x, z: b.root.position.z, hostile: Boolean(b.ref.hostile) });
  }
  return out;
}

export function surfaceFeed(surface, wildlife, gameplay, visitors = [], places = []) {
  const p = surface.position, ship = surface.shipPosition;
  const drones = gameplay.sentinels?.drones ?? [];
  const markers = [];
  if (ship && !surface.flying) {
    markers.push({ id: 'ship', position: ship, label: 'Pesawat', sub: dist(ship.distanceTo(p)), color: 0xffb347, kind: 'ship' });
  }
  drones.forEach((d, i) => { if (d.hostile) markers.push({ id: `s${i}`, position: d.group.position, kind: 'hostile' }); });
  return {
    map: { player: { x: p.x, z: p.z, heading: headingOf(surface.camera) }, ship: ship ? { x: ship.x, z: ship.z } : null,
      creatures: creaturesOf(wildlife),
      visitors: visitors.map((v) => ({ x: v.position.x, z: v.position.z, kind: v.kind })), places,
      sentinels: drones.map((d) => ({ x: d.group.position.x, z: d.group.position.z, hostile: d.hostile })), range: 120 },
    markers: markers.slice(0, 20),
  };
}
