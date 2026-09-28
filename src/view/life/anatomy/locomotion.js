// Moves creatures: steering with turn limits, herd spacing, water avoidance, hopping, flight altitude.
const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// Keeps animals from overlapping (cheap pairwise pass against later animals).
function separate(h, a, i) {
  const list = h.animals, ra = a.scale * 0.6;
  for (let j = i + 1; j < list.length; j++) {
    const b = list[j];
    if (a.flying !== b.flying) continue;
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, min = ra + b.scale * 0.6, d2 = dx * dx + dz * dz;
    if (d2 >= min * min || d2 < 1e-6) continue;
    const d = Math.sqrt(d2), push = (min - d) * 0.5 / d;
    a.pos.x -= dx * push; a.pos.z -= dz * push;
    b.pos.x += dx * push; b.pos.z += dz * push;
  }
}

export function steer(h, a, dt, i) {
  const r = a.root.rotation, dx = a.dest.x - a.pos.x, dz = a.dest.z - a.pos.z, d = Math.hypot(dx, dz);
  let want = d < 0.8 ? 0 : a.want, err = 0;
  if (a.hopper) want = a.hop > 0 ? Math.max(want, a.want) * 1.6 : 0;
  if (d > 0.3 && a.want > 0) {
    err = wrap(Math.atan2(-dz, dx) - r.y);
    const max = (3 - Math.min(1.8, a.speed * 0.25)) * dt, turn = clamp(err, -max, max);
    r.y = wrap(r.y + turn);
    a.turn += (turn / Math.max(dt, 1e-4) - a.turn) * Math.min(1, dt * 8);
  } else a.turn *= Math.max(0, 1 - dt * 6);
  const target = want * Math.max(0.15, Math.cos(err));
  a.speed += clamp(target - a.speed, -8 * dt, 5 * dt);
  const nx = a.pos.x + Math.cos(r.y) * a.speed * dt, nz = a.pos.z - Math.sin(r.y) * a.speed * dt;
  if (a.flying || h.dry(nx, nz)) { a.pos.x = nx; a.pos.z = nz; } else { a.speed = 0; a.stateT = Math.min(a.stateT, 0); }
  separate(h, a, i);
}

// Hoppers: crouch -> launch -> stretch in the air -> squash on landing.
export function hopStep(h, a, dt) {
  const an = a.anim;
  an.squash += (0 - an.squash) * Math.min(1, dt * 6);
  if (!a.hopper) return;
  if (a.hop <= 0) {
    const go = a.want > 0.1 && Math.hypot(a.dest.x - a.pos.x, a.dest.z - a.pos.z) > 1;
    a.hopCharge = go ? (a.hopCharge ?? 0) + dt : 0;
    an.crouch += ((go ? 1 : 0) - an.crouch) * Math.min(1, dt * 10);
    if (a.hopCharge > 0.2) {
      a.vy = (3 + a.scale * 0.9) * (a.fleeing ? 1.2 : 1);
      a.hop = 0.001;
      a.hopCharge = 0;
      an.crouch = 0;
      an.squash = -0.3;
    }
    return;
  }
  a.vy -= 12 * dt;
  a.hop += a.vy * dt;
  if (a.hop <= 0) { a.hop = 0; a.vy = 0; an.squash = 0.4; an.crouch = 0.6; }
}

function altitude(a) {
  const m = a.sp.genes.move;
  if (m === 'melayang') return 1.4 + a.scale * 0.3 + Math.sin(a.t * 1.3) * 0.35;
  if (m === 'terbang') return 12 + Math.sin(a.t * 0.5) * 4 + (a.fleeing ? 8 : 0);
  return 0;
}

// Final root transform: terrain / flight height, banking and climb pitch.
export function place(h, a, dt) {
  a.t += dt;
  let ground = h.heightFn(a.pos.x, a.pos.z);
  if (a.flying) ground = Math.max(ground, h.waterY);
  const alt = altitude(a), prev = a.alt;
  a.alt += (alt - a.alt) * Math.min(1, dt * 1.5);
  a.climb = a.sp.genes.move === 'terbang' ? clamp((a.alt - prev) / Math.max(dt, 1e-4) * 0.08, -0.4, 0.4) : 0;
  const bank = a.flying ? clamp(-a.turn * 0.5, -0.6, 0.6) : clamp(-a.turn * a.speed * 0.03, -0.15, 0.15);
  a.bank += (bank - a.bank) * Math.min(1, dt * 4);
  a.root.position.set(a.pos.x, ground + a.alt + a.hop, a.pos.z);
}
