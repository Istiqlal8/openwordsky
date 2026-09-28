// Side panel of the galaxy map: details of one system + Warp button.
import { el, clear, hexCss } from './dom.js';
import { isEventSystem } from '../devourer/live.js';

export function lightYears(a, b) {
  const d = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y, a.pos.z - b.pos.z);
  return d * 0.1;
}

export class GalaxyPanel {
  constructor(parent, { onWarp, onClose, onHome }) {
    this.root = el('aside', 'gmap-panel panel');
    const top = el('div', 'gmap-top');
    const close = el('button', 'btn btn-icon', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Tutup');
    close.addEventListener('click', onClose);
    top.append(el('div', 'panel-label', 'Peta galaksi'), close);
    this.body = el('div', 'gmap-body');
    this.warpBtn = el('button', 'btn btn-primary gmap-warp', 'Warp');
    this.warpBtn.type = 'button';
    this.warpBtn.addEventListener('click', onWarp);
    this.homeBtn = el('button', 'btn gmap-home', 'Pulang [P]');
    this.homeBtn.type = 'button';
    this.homeBtn.addEventListener('click', onHome);
    this.root.append(top, this.body, this.warpBtn, this.homeBtn, this.legend());
    parent.append(this.root);
  }

  legend() {
    const box = el('div', 'gmap-legend');
    const items = [['lg-current', 'Posisi'], ['lg-visited', 'Dikunjungi'], ['lg-selected', 'Dipilih'], ['lg-bh', 'Lubang hitam']];
    for (const [cls, label] of items) {
      const row = el('span', 'lg');
      row.append(el('i', cls), el('span', null, label));
      box.append(row);
    }
    return box;
  }

  // view = { system, planets, current, isSelected, visited }
  render(view) {
    clear(this.body);
    const { system, planets, current } = view;
    const isHere = system.index === current.index;
    this.body.append(el('div', 'sys-name', system.name));
    if (isEventSystem(system.index)) this.body.append(el('div', 'dv-flag', 'PEMAKAN PLANET'));
    const star = el('div', 'sys-star');
    const dot = el('span', 'dot');
    dot.style.setProperty('--c', hexCss(system.star.color));
    star.append(dot, el('span', null, (system.star.blackHole || system.star.label === "Matahari" ? system.star.label : `Bintang ${system.star.label}`)));
    this.body.append(star, this.facts(system, current, isHere, view.visited));
    this.body.append(this.planetList(planets));
    this.warpBtn.disabled = isHere || !view.isSelected;
    this.warpBtn.textContent = isHere ? 'Di sini' : 'Warp';
    this.homeBtn.disabled = current.index === 0;
  }

  facts(system, current, isHere, visited) {
    const box = el('div', 'gmap-facts');
    const dist = isHere ? '—' : `${lightYears(system, current).toFixed(1)} ly`;
    const pairs = [['Planet', String(system.planetCount)], ['Jarak', dist]];
    if (visited) pairs.push(['Status', 'Dikunjungi']);
    for (const [k, v] of pairs) {
      const row = el('div', 'scan-row');
      row.append(el('span', 'scan-key', k), el('span', 'scan-val', v));
      box.append(row);
    }
    return box;
  }

  planetList(planets) {
    const list = el('ol', 'sys-list');
    for (const p of planets) {
      const li = el('li');
      li.append(el('span', 'sys-planet', p.name), el('span', 'sys-biome', p.biome.label));
      list.append(li);
    }
    return list;
  }
}
