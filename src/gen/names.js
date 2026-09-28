// Procedural names built from syllable tables.
const HEAD = ['ar', 'be', 'cy', 'dra', 'el', 'fen', 'gor', 'hy', 'ix', 'jo', 'ka', 'lu', 'my', 'ne',
  'ol', 'pha', 'qui', 'ro', 'se', 'ta', 'ux', 'va', 'wo', 'xa', 'yl', 'ze', 'nu', 'vor', 'thi', 'glu',
  'sha', 'kre', 'oma', 'ish', 'tun', 'bra', 'eo', 'ska'];
const MID = ['ba', 'ce', 'do', 'fi', 'ga', 'he', 'ji', 'ko', 'la', 'me', 'ni', 'po', 'ra', 'si', 'to',
  'vi', 'za', 'nth', 'rax', 'mir', 'sol', 'dun', 'keth', 'wyn', 'zor', 'tal', 'phos', 'drex', 'lyr'];
const TAIL = ['a', 'us', 'os', 'ar', 'en', 'is', 'on', 'um', 'yx', 'ia', 'eth', 'or', 'ess', 'ax',
  'ir', 'ul', 'ea', 'ion'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const GREEK = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Sigma',
  'Omega', 'Kappa', 'Lambda', 'Tau', 'Rho'];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function word(rng) {
  let w = rng.pick(HEAD);
  const mids = rng.int(3);
  for (let i = 0; i < mids; i++) w += rng.pick(MID);
  if (rng.chance(0.7)) w += rng.pick(TAIL);
  return cap(w);
}

export function systemName(rng) {
  const base = word(rng);
  const roll = rng.next();
  if (roll < 0.25) return `${base} ${rng.pick(GREEK)}`;
  if (roll < 0.45) return `${base}-${10 + rng.int(990)}`;
  return base;
}

export function planetName(rng, sysName, index) {
  const roll = rng.next();
  if (roll < 0.3) return `${sysName.split(' ')[0]} ${ROMAN[index] ?? index + 1}`;
  if (roll < 0.45) return `${word(rng)} ${rng.pick(['Prime', 'Minor', 'Major', 'Nova'])}`;
  return word(rng);
}
