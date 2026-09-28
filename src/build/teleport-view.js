// Rows for the teleport pad: your other bases, what the jump costs and whether you can pay.
import { hub } from './hub.js';
import { TELEPORT_COST, pieceOf } from './pieces.js';
import { have } from '../craft/recipes.js';

const padIn = (b) => b.pieces.find((p) => p.type === 'teleport');

export function teleportView(planet, all, player) {
  const rows = [];
  for (const [key, b] of Object.entries(all)) {
    if (key === planet.key) continue;
    const pad = padIn(b);
    const cost = TELEPORT_COST.map((l) => `${l.n} ${l.label}`).join(' · ');
    rows.push({
      label: b.name,
      right: cost,
      sub: pad ? `${b.pieces.length} bagian · sistem ${b.sys}` : 'Belum ada pad teleport di sana',
      ok: Boolean(pad) && TELEPORT_COST.every((l) => have(player, l) >= l.n),
      travel: true,
      run: () => hub.travel?.(key) ?? 'Teleport belum siap',
    });
  }
  if (!rows.length) rows.push({ label: 'Belum ada markas lain', sub: `Bangun ${pieceOf('teleport').name} di markas lain`, ok: false, run: () => null });
  return rows;
}
