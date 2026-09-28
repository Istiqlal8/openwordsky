// Progressive onboarding checklist. Each step shows only in its mode ('space' | 'surface' | 'any')
// and is done by an act/record type (acts) or by pressing its key (keys, logical codes).
// key: logical code for the key cap (shown with the player's binding) or plain text.
export const STEPS = [
  { id: 'land', mode: 'space', key: 'Space', title: 'Mendarat', text: 'Pulse drive ke planet, terbang masuk atmosfer, lalu E di dekat tanah.', acts: ['land'] },
  { id: 'scan', mode: 'surface', key: 'KeyF', title: 'Pindai', text: 'Pindai planet dan hewan di dekatmu.', acts: ['scan', 'scanFauna'] },
  { id: 'mine', mode: 'surface', key: 'Klik kiri', title: 'Tambang & panen', text: 'Arahkan sinar ke batu atau tumbuhan.', acts: ['mine', 'harvest'] },
  { id: 'recharge', mode: 'surface', key: 'KeyG', title: 'Isi suit', text: 'Pakai sumber daya untuk mengisi pelindung.', keys: ['KeyG'] },
  { id: 'gather', mode: 'surface', key: 'KeyQ', title: 'Hasil hewan', text: 'Dekati hewan jinak dan ambil hasilnya.', acts: ['gather'] },
  { id: 'journal', mode: 'any', key: 'KeyJ', title: 'Jurnal misi', text: 'Cerita, kontrak dan koleksi planet.', keys: ['KeyJ'] },
  { id: 'bag', mode: 'any', key: 'Tab', title: 'Inventori', text: 'Lihat dan pakai barangmu.', keys: ['Tab', 'KeyI'] },
  { id: 'craft', mode: 'any', key: 'KeyU', title: 'Racik & pasar', text: 'Tingkatkan suit, jual hasil panen.', keys: ['KeyU'] },
  { id: 'book', mode: 'any', key: 'KeyL', title: 'Buku koleksi', text: 'Spesies, planet tuntas dan tab Trofi.', keys: ['KeyL'] },
  { id: 'cargo', mode: 'surface', key: 'KeyO', title: 'Papan kargo', text: 'Ambil muatan untuk diantar ke planet lain.', keys: ['KeyO'] },
  { id: 'build', mode: 'surface', key: 'KeyY', title: 'Mode bangun', text: 'Bangun markas di planet mana saja.', keys: ['KeyY'] },
  { id: 'photo', mode: 'surface', key: 'KeyP', title: 'Mode foto', text: 'Bekukan kamera lalu potret pemandangan.', acts: ['photo'], needs: 'LegendMeta' },
  { id: 'fish', mode: 'surface', key: 'KeyX', title: 'Memancing', text: 'Di tepi air: X melempar kail, X lagi saat menggigit.', acts: ['fish'], needs: 'FishingAddon' },
  { id: 'map', mode: 'space', key: 'KeyM', title: 'Peta galaksi', text: 'Pilih bintang tujuan berikutnya.', keys: ['KeyM'] },
  { id: 'warp', mode: 'space', key: 'KeyM', title: 'Warp', text: 'Klik bintang di peta untuk melompat (30 energi).', acts: ['warp'] },
  { id: 'fleet', mode: 'space', key: 'KeyY', title: 'Armada', text: 'Kirim fregat berekspedisi.', keys: ['KeyY'], needs: 'FleetAddon' },
  { id: 'settings', mode: 'any', key: 'Backquote', title: 'Pengaturan', text: 'Grafis, suara, sensitivitas, tombol.', keys: ['Backquote'] },
];

// A step is skipped automatically after this many seconds on screen.
export const STEP_TIMEOUT = 120;
