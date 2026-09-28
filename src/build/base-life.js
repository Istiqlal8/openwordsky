// Living parts of a base: planter crops and penned animals. Everything is manual: T plants a
// seed, crops grow only while you are on the planet, T harvests; T lures an animal into a pen
// and later collects its product (cooldown while you stay).
import { FLORA_MATERIALS, gatherProduct } from '../quest/materials.js';
import { affordable, pay } from '../craft/recipes.js';
import { buildCreatureTemplate } from '../view/life/creature-builder.js';
import { PEN_BAIT } from './pieces.js';
import { cropMesh } from './crop-mesh.js';

export const GROW_STAGE = 60;   // seconds of play per growth stage
const STAGES = 3;
const PEN_COOLDOWN = 90;      // seconds between pen collections
const LURE_RANGE = 14;

export const cropStage = (d) => (d?.seed ? Math.min(STAGES, 1 + Math.floor(d.g / GROW_STAGE)) : 0);
export const ripe = (d) => Boolean(d?.seed) && d.g >= GROW_STAGE * STAGES;

export class BaseLife {
  constructor(ctx, palette) {
    this.ctx = ctx;
    this.scene = ctx.surface.scene;
    this.palette = palette;
    this.views = new Map(); // piece -> { obj, stage, mats? }
    this.penReady = new Map(); // piece -> session time when the pen gives again
    this.t = 0;
  }

  // Match the visuals to the current piece list.
  sync(pieces) {
    const live = new Set(pieces.filter((p) => p.type === 'kebun' || p.type === 'kandang'));
    for (const [p, v] of this.views) if (!live.has(p)) { this.drop(v); this.views.delete(p); }
    for (const p of live) this.refresh(p);
  }

  refresh(p) {
    const v = this.views.get(p);
    const key = p.type === 'kebun' ? `${p.data?.seed}:${cropStage(p.data)}` : p.data?.animal?.name ?? '';
    if (v?.key === key) return;
    if (v) this.drop(v);
    const obj = p.type === 'kebun' ? cropMesh(cropStage(p.data), ripe(p.data), this.palette) : this.animal(p);
    if (obj) { obj.position.set(p.x, p.y + (p.type === 'kebun' ? 0.5 : 0), p.z); this.scene.add(obj); }
    this.views.set(p, { key, obj, mats: obj?.userData.mats });
  }

  animal(p) {
    const rec = p.data?.animal;
    if (!rec?.genes) return null;
    const tpl = buildCreatureTemplate({ genes: rec.genes });
    tpl.root.scale.setScalar(Math.min(1.2, rec.scale ?? 1));
    tpl.root.userData.mats = tpl.materials;
    return tpl.root;
  }

  drop(v) {
    if (!v.obj) return;
    v.obj.parent?.remove(v.obj);
    v.obj.traverse((o) => o.geometry?.dispose());
    v.mats?.forEach((m) => m.dispose());
  }

  // Crops grow in play time; penned animals idle around.
  update(dt, pieces) {
    this.t += dt;
    for (const p of pieces) {
      if (p.type === 'kebun' && p.data?.seed && !ripe(p.data)) { p.data.g += dt; this.refresh(p); }
      const obj = p.type === 'kandang' && this.views.get(p)?.obj;
      if (obj) obj.rotation.y = Math.sin(this.t * 0.3 + p.x) * 1.5;
    }
  }

  // T at a planter or pen -> notice text.
  act(p, player) {
    return p.type === 'kebun' ? this.farm(p, player) : this.pen(p, player);
  }

  farm(p, player) {
    const d = (p.data ??= { seed: null, g: 0 });
    if (ripe(d)) {
      const n = 2 + Math.floor(Math.random() * 2);
      player.addItem(d.seed, n);
      player.addItem('Karbon', 2);
      player.emit('act', { type: 'harvestFarm', item: d.seed });
      const text = `Panen kebun: ${n} ${d.seed} + 2 Karbon`;
      Object.assign(d, { seed: null, g: 0 });
      this.refresh(p);
      return text;
    }
    if (d.seed) return `${d.seed} tumbuh ${Math.floor((100 * d.g) / (GROW_STAGE * STAGES))}%`;
    const seed = [...FLORA_MATERIALS].sort((a, b) => player.count(b) - player.count(a))[0];
    if (!player.count(seed)) return 'Butuh bahan flora sebagai bibit (panen tumbuhan)';
    player.removeItem(seed, 1);
    Object.assign(d, { seed, g: 0 });
    this.refresh(p);
    return `Menanam ${seed} · panen dalam ${(GROW_STAGE * STAGES) / 60} menit di planet ini`;
  }

  pen(p, player) {
    const d = (p.data ??= {});
    if (d.animal) return this.collect(p, d.animal, player);
    if (!affordable(player, PEN_BAIT)) return 'Butuh 1 Protein Fauna untuk memancing hewan';
    const rec = this.lure(p) ?? petCopy(player.pet);
    if (!rec) return 'Tidak ada hewan jinak di dekat kandang';
    pay(player, PEN_BAIT);
    d.animal = rec;
    this.refresh(p);
    return `${rec.name} kini tinggal di kandang`;
  }

  collect(p, rec, player) {
    const wait = (this.penReady.get(p) ?? 0) - this.t;
    if (wait > 0) return `${rec.name} perlu istirahat (${Math.ceil(wait)} dtk)`;
    this.penReady.set(p, this.t + PEN_COOLDOWN);
    const item = gatherProduct({ genes: rec.genes }, rec.name);
    player.addItem(item, 2);
    player.emit('act', { type: 'gather', item, n: 1 });
    return `${rec.name} memberi 2 ${item}`;
  }

  // Nearest calm, ground-bound wild animal near the pen joins it.
  lure(p) {
    const herd = this.ctx.creatures?.groups?.[0];
    let best = null, bestD = LURE_RANGE;
    for (const a of herd?.animals ?? []) {
      if (a.hostile || a.chase || !a.sp?.genes || a.sp.genes.move === 'terbang') continue;
      const d = Math.hypot(a.pos.x - p.x, a.pos.z - p.z);
      if (d < bestD) { best = a; bestD = d; }
    }
    if (!best) return null;
    herd.kill(best);
    return { name: best.sp.name, genes: best.sp.genes, scale: best.root?.scale.x ?? 1 };
  }

  dispose() {
    for (const v of this.views.values()) this.drop(v);
    this.views.clear();
  }
}

// A young one of the player's pet species.
function petCopy(pet) {
  return pet?.genes ? { name: `Anak ${pet.speciesName}`, genes: pet.genes, scale: (pet.scale ?? 1) * 0.7 } : null;
}
