// Q near a calm animal: collect its product (wool, milk, eggs, scales...) without hurting it.
import { gatherProduct } from '../quest/materials.js';

const REACH = 5;
const COOLDOWN = 45; // seconds before the same animal gives again
const MILKY = ['lonjong', 'tong'];

// Rare (golden) variants from src/gameplay/rare-wildlife.js give a special product.
function rareProduct(species) {
  return MILKY.includes(species?.genes?.body) ? 'Susu Bintang' : 'Bulu Emas';
}

// -> notice text for the HUD.
export function gatherFromAnimal(wildlife, feet, player, now = performance.now() / 1000) {
  const best = nearestAnimal(wildlife, feet);
  if (!best) return 'Dekati hewan untuk mengambil hasilnya';
  const name = best.sp?.name ?? best.name ?? 'Hewan';
  if (best.hostile || best.chase) return `${name} terlalu agresif`;
  if (now - (best.gatheredAt ?? -1e9) < COOLDOWN) return `${name} perlu istirahat`;
  best.gatheredAt = now;
  const item = best.rare ? rareProduct(best.sp) : gatherProduct(best.sp, best.name);
  let n = best.rare ? 1 : 1 + Math.floor(Math.random() * 2);
  if (best.migrating) { n += 2; best.migrating.helped = true; } // planet event bonus (src/events/migration.js)
  player.addItem(item, n);
  player.emit('act', { type: 'gather', item, n: 1 });
  return `${name} memberi ${n} ${item}`;
}

// Procedural herds keep `animals` with `pos`; model groups keep `list` with `root`.
function nearestAnimal(wildlife, feet) {
  let best = null, bestD = REACH;
  for (const group of wildlife?.groups ?? []) {
    for (const a of group.animals ?? group.list ?? []) {
      const p = a.pos ?? a.root?.position;
      if (!p || a.root?.visible === false) continue;
      const d = Math.hypot(p.x - feet.x, p.z - feet.z);
      if (d < bestD) { best = a; bestD = d; }
    }
  }
  return best;
}
