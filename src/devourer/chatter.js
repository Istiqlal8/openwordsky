// Fleet radio chatter during the battle. Lines are picked by phase so they track the fight.
const CAPTAINS = ['Kapten Aruna', 'Komandan Vy’keen', 'Navigator Korvax', 'Kapten Sela',
  'Laksamana Bhre', 'Kapten Dimas', 'Pilot Nayaka'];

const LINES = {
  shield: ['perisainya menahan semua tembakan — hantam simpulnya!', 'enam simpul perisai, fokus satu per satu!',
    'jangan dekati mulutnya, itu menyedot apa saja.'],
  open: ['perisai runtuh, semua senjata ke inti!', 'tembakan kita tembus — terus tekan!',
    'planet itu masih bisa diselamatkan, jangan mundur!'],
  enraged: ['sinarnya menyapu sayap kanan, hindar!', 'kita kehilangan banyak pesawat, tapi terus maju!',
    'ia mengamuk — pertanda kita hampir menang!'],
  collapse: ['intinya retak! menjauh sekarang!', 'ia runtuh! semua kapal, mundur!'],
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function chatter(phase, secondsLeft, capitalsAlive) {
  const who = pick(CAPTAINS);
  if (secondsLeft < 45 && phase !== 'collapse') return `${who}: waktu hampir habis, ${Math.round(secondsLeft)} detik lagi!`;
  if (capitalsAlive <= 2 && phase === 'enraged') return `${who}: kapal induk kita tinggal ${capitalsAlive}. Bertahan!`;
  return `${who}: ${pick(LINES[phase] ?? LINES.open)}`;
}
