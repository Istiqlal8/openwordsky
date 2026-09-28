// Journal card + tracker row for boss raids, built from the same pieces as the rest of the
// journal (src/ui/quest-panel.js) so an addon section looks native.
import { el } from './dom.js';
import { bar } from './quest-panel.js';
import { RAIDS, RAID_IDS, lairSystem } from '../raid/raid-data.js';
import { raidState, beatenCount, activeContract, contractLeft } from '../raid/raid-store.js';

const KIND = { space: 'Angkasa', surface: 'Permukaan' };
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Right-hand tracker: only while a fight is live or a contract is ticking.
export function raidTrack(status) {
  const c = activeContract();
  if (!status && !c) return null;
  const row = el('div', 'q-track is-raid');
  if (status) {
    row.append(el('div', 'q-title', status.name));
    const line = el('div', 'q-line');
    line.append(el('span', 'q-goal', status.label), el('span', 'q-num', `${Math.max(0, Math.round(status.now))}`));
    row.append(line, bar(status.now, status.max));
    return row;
  }
  const def = RAIDS[c.id];
  row.append(el('div', 'q-title', `Kontrak: ${def.name}`));
  const line = el('div', 'q-line');
  line.append(el('span', 'q-goal', KIND[def.kind]), el('span', 'q-num', clock(contractLeft())));
  row.append(line);
  return row;
}

function contractCard(galaxySeed) {
  const c = activeContract();
  if (!c) return null;
  const def = RAIDS[c.id];
  const card = el('div', 'q-card is-raid');
  card.append(el('div', 'q-tag', `Kontrak Raid · ${clock(contractLeft())} tersisa`), el('div', 'q-title', def.name));
  card.append(el('div', 'q-text', def.lore));
  card.append(el('div', 'q-text', whereText(def, galaxySeed)));
  card.append(el('div', 'q-reward', `Bonus: ${c.reward.nanit} Nanit · ${c.reward.xp} XP · Backspace: batalkan`));
  return card;
}

export function whereText(def, galaxySeed) {
  if (def.kind === 'surface') {
    return def.id === 'titan-penjaga'
      ? 'Ditemukan di planet berpenjaga — atau dipanggil sendiri saat tingkat buronan penuh (5).'
      : 'Tidur di planet dengan reruntuhan kuno. Jelajahi permukaan untuk menemukannya.';
  }
  return `Bersarang di sistem #${lairSystem(galaxySeed, def.id)}. Warp ke sana dan ikuti penanda merah.`;
}

export function raidCard(galaxySeed, status) {
  const st = raidState();
  const card = el('div', 'q-card is-raid');
  card.append(el('div', 'q-tag', `Raid Bos · ${beatenCount()}/${RAID_IDS.length} ditaklukkan`));
  card.append(bar(beatenCount(), RAID_IDS.length));
  for (const id of RAID_IDS) {
    const def = RAIDS[id], done = st.defeated[id];
    const line = done ? `✓ ${def.name} · ${def.reward.items[0][0]}`
      : st.found[id] ? `${def.name} · terlihat di ${st.found[id]}`
        : `${def.name} · ${KIND[def.kind]} · belum ditemukan`;
    card.append(el('div', `q-text${done ? ' is-done' : ''}`, line));
  }
  if (status) card.append(el('div', 'q-reward', `Bertarung: ${status.name} — ${status.label}`));
  else card.append(el('div', 'q-reward', hint(galaxySeed)));
  return card;
}

function hint(galaxySeed) {
  const open = RAID_IDS.filter((id) => !raidState().defeated[id]);
  if (!open.length) return 'Semua bos raid telah ditaklukkan.';
  const def = RAIDS[open[0]];
  return `Berikutnya: ${def.name}. ${whereText(def, galaxySeed)}`;
}

export function raidJournal(galaxySeed, status) {
  const box = el('div', 'raid-group');
  const c = contractCard(galaxySeed);
  if (c) box.append(c);
  box.append(raidCard(galaxySeed, status));
  return box;
}
