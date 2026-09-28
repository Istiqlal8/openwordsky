// Editor layout: one tab per section, each field bound to a spec path. Labels in Indonesian.
const nums = (list) => list.map((n) => [n, String(n)]);

export const SECTIONS = [
  { id: 'cls', label: 'Kelas', fields: [
    { type: 'choice', key: 'cls', label: 'Kelas', options: [['fighter', 'Petarung'], ['explorer', 'Penjelajah'], ['hauler', 'Pengangkut'], ['exotic', 'Eksotis']] },
  ] },
  { id: 'body', label: 'Badan', fields: [
    { type: 'choice', key: 'body', label: 'Bentuk', options: [['wedge', 'Baji'], ['long', 'Ramping'], ['boxy', 'Kotak'], ['organic', 'Organik'], ['saucer', 'Piring']] },
    { type: 'range', key: 'length', label: 'Panjang', min: 5, max: 12, step: 0.1 },
    { type: 'range', key: 'width', label: 'Lebar', min: 1.2, max: 4, step: 0.05 },
    { type: 'range', key: 'height', label: 'Tinggi', min: 0.8, max: 2.6, step: 0.05 },
    { type: 'choice', key: 'cargo', label: 'Kargo', options: nums([0, 1, 2, 3, 4]) },
    { type: 'toggle', key: 'ring', label: 'Cincin' },
    { type: 'toggle', key: 'booms', label: 'Ekor ganda' },
  ] },
  { id: 'wings', label: 'Sayap', fields: [
    { type: 'choice', key: 'wings.shape', label: 'Bentuk', options: [['swept', 'Serong'], ['delta', 'Delta'], ['straight', 'Lurus'], ['forward', 'Maju'], ['none', 'Tanpa']] },
    { type: 'choice', key: 'wings.pairs', label: 'Pasang', options: nums([1, 2]) },
    { type: 'range', key: 'wings.span', label: 'Rentang', min: 0.8, max: 4, step: 0.05 },
    { type: 'range', key: 'wings.sweep', label: 'Sapuan', min: -1.5, max: 2.5, step: 0.05 },
    { type: 'range', key: 'wings.dihedral', label: 'Kemiringan', min: -0.4, max: 0.4, step: 0.01 },
  ] },
  { id: 'engines', label: 'Mesin', fields: [
    { type: 'choice', key: 'engines', label: 'Jumlah', options: nums([1, 2, 3, 4]) },
    { type: 'range', key: 'engineSize', label: 'Ukuran', min: 0.3, max: 0.7, step: 0.01 },
    { type: 'toggle', key: 'nacelles', label: 'Mesin samping' },
    { type: 'choice', key: 'fins', label: 'Sirip', options: nums([0, 1, 2, 3]) },
  ] },
  { id: 'cockpit', label: 'Kokpit', fields: [
    { type: 'choice', key: 'canopy', label: 'Kanopi', options: [['small', 'Kecil'], ['bubble', 'Gelembung'], ['long', 'Panjang']] },
    { type: 'toggle', key: 'antenna', label: 'Antena' },
    { type: 'toggle', key: 'dish', label: 'Parabola' },
  ] },
  { id: 'weapons', label: 'Senjata', fields: [
    { type: 'choice', key: 'guns', label: 'Meriam', options: nums([2, 4]) },
    { type: 'choice', key: 'legs', label: 'Kaki', options: nums([3, 4]) },
  ] },
  { id: 'colors', label: 'Warna', fields: [
    { type: 'color', key: 'colors.hull', label: 'Badan' },
    { type: 'color', key: 'colors.trim', label: 'Aksen' },
    { type: 'color', key: 'colors.glow', label: 'Nyala' },
    { type: 'choice', key: 'decal', label: 'Motif', options: [['none', 'Polos'], ['stripe', 'Garis'], ['chevron', 'Panah'], ['checker', 'Catur']] },
  ] },
  { id: 'name', label: 'Nama', fields: [
    { type: 'text', key: 'name', label: 'Nama', max: 24 },
  ] },
];

// Dot-path helpers ("wings.span").
export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
}
