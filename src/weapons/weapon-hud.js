// Weapon HUD (surface only): equipped weapon name, heat/charge bar and owned-slot strip.
import { el, clear } from '../ui/dom.js';
import { weaponById } from './catalog.js';

export class WeaponHud {
  constructor(parent) {
    this.root = el('div', 'wpn-hud panel only-surface');
    this.name = el('div', 'wpn-name');
    this.state = el('div', 'wpn-state');
    const head = el('div', 'wpn-head');
    head.append(this.name, this.state);
    const track = el('div', 'wpn-track');
    this.fill = el('div', 'wpn-fill');
    track.append(this.fill);
    this.slots = el('div', 'wpn-slots');
    this.root.append(head, track, this.slots);
    parent?.append(this.root);
    this.key = '';
    this.last = { pct: -1, mode: '', label: '' };
  }

  // owned: ids; equipped: id; heat/charge 0..1; locked: overheated.
  update({ owned, equipped, heat, charge, locked, hidden }) {
    this.root.classList.toggle('is-hidden', Boolean(hidden));
    if (hidden) return;
    const key = `${owned.join(',')}|${equipped}`;
    if (key !== this.key) this.rebuild(owned, equipped, key);
    const charging = charge > 0;
    const mode = locked ? 'hot' : charging ? 'charge' : 'heat';
    const pct = Math.round(Math.min(1, charging ? charge : heat) * 100);
    const label = locked ? 'Panas!' : charging ? 'Mengisi' : equipped === 'multitool' ? '' : pct > 0 ? `${pct}%` : 'Siap';
    if (pct !== this.last.pct) this.fill.style.width = `${pct}%`;
    if (mode !== this.last.mode) this.fill.dataset.mode = mode;
    if (label !== this.last.label) this.state.textContent = label;
    this.last = { pct, mode, label };
  }

  rebuild(owned, equipped, key) {
    this.key = key;
    this.name.textContent = weaponById(equipped)?.name ?? '';
    clear(this.slots);
    owned.forEach((id, i) => {
      const slot = el('span', `wpn-slot${id === equipped ? ' is-on' : ''}`);
      slot.append(el('b', null, i + 1), el('span', null, weaponById(id).short));
      this.slots.append(slot);
    });
  }

  dispose() {
    this.root.remove();
  }
}
