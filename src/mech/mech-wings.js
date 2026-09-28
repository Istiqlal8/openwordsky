// Wings off the backpack. Each one is four hinged panels stacked on a common root: folded they lie
// flat along the back, at speed they sweep back and close up, and in a hard bank or a brake they
// fan open like a hand of cards, with a little overshoot so the hinges read as machinery.
//
// The planform is cut from the ship's own wings when it has any, so the mech keeps carrying the
// pilot's silhouette. Driven from mech-pose.js through mech.setWings(); allocates nothing.
import * as THREE from 'three';
import { part } from '../view/ship/ship-materials.js';
import { block, blade, rod } from './mech-geo.js';

const PANELS = 4;
const FAN = 0.34;                // radians between panels when fully open
const REST = 0.24;               // ...and the fraction of that they keep while folded
const OPEN = 1.02;               // how far the whole wing lifts away from the back
const SWEEP = 0.66;              // ...and how far it rakes back at speed
const RATE = 7;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// One feather: a swept plate with a bright leading edge, hinged at its root.
function panel(m, mats, glow, i, span, chord) {
  const hinge = new THREE.Group();
  const k = 1 - i * 0.16;
  const geo = blade(span * k, chord * (1 - i * 0.2), chord * 0.3, chord * 0.42, chord * 0.1);
  const tilt = 1.0;                     // canted, so the plate reads from behind and from the side
  const plate = part(geo, mats.hull, 0, 0, 0);
  plate.rotation.set(tilt, 0, 0);
  const rib = part(block(span * k * 0.9, chord * 0.12, chord * 0.2, 0.9), mats.trim, span * k * 0.45, 0, 0);
  rib.rotation.set(tilt, 0, 0);
  const edge = part(blade(span * k * 0.96, chord * 0.09, chord * 0.05, chord * 0.42, chord * 0.09), glow, 0, 0, 0);
  edge.rotation.set(tilt, 0, 0);
  edge.position.set(0, Math.cos(tilt) * chord * 0.42, -Math.sin(tilt) * chord * 0.42);
  hinge.add(plate, rib, edge);
  return hinge;
}

function buildWing(m, mats, glow, side, flames, nozzle) {
  const d = m.d, b = m.binder;
  const span = clamp(b ? b.span : 0.4 * d.H, 0.38 * d.H, 0.56 * d.H);
  const chord = clamp(b ? b.chord : 0.13 * d.H, 0.11 * d.H, 0.18 * d.H);
  const root = new THREE.Group();
  const w = d.chestW * 1.5, h = d.chestH * 0.72, dep = d.chestD * 1.15;
  root.position.set(side * w * 0.72, h * 0.8, dep * 1.75);
  const sweepPivot = new THREE.Group();
  const spreadPivot = new THREE.Group();
  root.add(sweepPivot);
  sweepPivot.add(spreadPivot);
  spreadPivot.add(part(block(chord * 0.5, chord * 0.7, chord * 0.9, 0.8, 6), mats.dark, 0, 0, 0));
  const panels = [];
  for (let i = 0; i < PANELS; i++) {
    const p = panel(m, mats, glow, i, span, chord);
    p.position.set(0, -i * chord * 0.05, i * chord * 0.2);
    spreadPivot.add(p);
    panels.push(p);
  }
  const n = nozzle(m.thrust.r * 0.5, d.shinL * 0.24, mats);
  n.group.position.set(0, -chord * 0.22, chord * 0.5);
  n.group.rotation.x = -0.1;
  spreadPivot.add(n.group);
  flames.push(n.flame);
  const tip = part(rod(chord * 0.09, chord * 0.5, 6).rotateZ(Math.PI / 2), glow, side * span * 0.94, 0, chord * 0.1);
  spreadPivot.add(tip);
  spreadPivot.scale.x = side;      // one geometry, mirrored
  return { root, sweepPivot, spreadPivot, panels, tip, side, span };
}

// -> { group per side, setWings(dt, spread, speed, boost), fold(t) }
export function buildWings(m, mats, nozzle, flames) {
  const glow = new THREE.MeshBasicMaterial({ color: mats.glow.color, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  return wingApi([-1, 1].map((side) => buildWing(m, mats, glow, side, flames, nozzle)), glow);
}

function wingApi(wings, glow) {
  const st = { open: 0, sweep: 0, v: 0, flare: 0 };
  const api = {
    wings, glow,
    // spread 0..1 fans the panels, speed 0..1 rakes them back, boost brightens the edges.
    update(dt, spread, speed, boost) {
      const want = clamp(Math.max(spread, st.flare), 0, 1);
      st.v += (-(st.open - want) * 150 - st.v * 15) * dt;   // under-damped: the hinges overshoot
      st.open = clamp(st.open + st.v * dt, -0.1, 1.25);
      st.sweep += (clamp(speed, 0, 1) * (1 - want * 0.7) - st.sweep) * (1 - Math.exp(-RATE * dt));
      api.apply(boost);
    },
    apply(boost = 0) {
      const o = st.open, s = st.sweep;
      glow.opacity = 0.2 + o * 0.32 + boost * 0.25;
      for (const w of wings) {
        w.sweepPivot.rotation.y = w.side * (-0.34 + s * SWEEP - o * 0.3);
        w.spreadPivot.rotation.z = -w.side * (0.34 + o * OPEN);
        w.spreadPivot.rotation.x = -0.18 + o * 0.3 - s * 0.24;
        w.panels.forEach((p, i) => {
          const f = REST + (1 - REST) * o;
          p.rotation.z = -w.side * i * FAN * f;        // tips fan upward like feathers
          p.rotation.y = -w.side * i * 0.2 * f;        // ...and rake progressively back
        });
        w.tip.scale.setScalar(0.6 + o * 0.5 + boost * 0.6);
      }
    },
    // The transformation throws them wide open as the frame stands up.
    fold(t) {
      st.flare = Math.sin(Math.PI * clamp((t - 0.38) / 0.62, 0, 1)) * 0.9;
      api.update(0.05, 0, 0, 0);
    },
    dispose() { glow.dispose(); },
  };
  api.apply(0);
  return api;
}
