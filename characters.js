// characters.js
// Updated roster of 10 LEGO Ninjago characters with higher HP (1000-1400)
// and a per-character special charge requirement (attacks needed before special).
// Each character has:
// - id, name, short (for avatar text), colorClass (for CSS avatar), maxHP, attackMin, attackMax, specialMultiplier, specialRequired

const CHARACTERS = [
  { id: 'lloyd', name: 'Lloyd (Green Ninja)', short: 'LL', colorClass: 'color-lloyd', maxHP: 1400, attackMin: 90, attackMax: 150, specialMultiplier: 2.5, specialRequired: 6 },
  { id: 'kai', name: 'Kai (Fire Ninja)', short: 'KA', colorClass: 'color-kai', maxHP: 1300, attackMin: 95, attackMax: 160, specialMultiplier: 2.2, specialRequired: 5 },
  { id: 'jay', name: 'Jay (Lightning Ninja)', short: 'JA', colorClass: 'color-jay', maxHP: 1250, attackMin: 90, attackMax: 155, specialMultiplier: 2.3, specialRequired: 4 },
  { id: 'cole', name: 'Cole (Earth Ninja)', short: 'CO', colorClass: 'color-cole', maxHP: 1400, attackMin: 85, attackMax: 145, specialMultiplier: 2.6, specialRequired: 7 },
  { id: 'zane', name: 'Zane (Ice / Tech Ninja)', short: 'ZA', colorClass: 'color-zane', maxHP: 1200, attackMin: 100, attackMax: 170, specialMultiplier: 2.0, specialRequired: 5 },
  { id: 'nya', name: 'Nya (Water Ninja)', short: 'NY', colorClass: 'color-nya', maxHP: 1150, attackMin: 90, attackMax: 150, specialMultiplier: 2.4, specialRequired: 4 },
  { id: 'wu', name: 'Sensei Wu', short: 'WU', colorClass: 'color-wu', maxHP: 1350, attackMin: 80, attackMax: 140, specialMultiplier: 2.5, specialRequired: 6 },
  { id: 'garmadon', name: 'Lord Garmadon', short: 'GA', colorClass: 'color-garmadon', maxHP: 1400, attackMin: 110, attackMax: 180, specialMultiplier: 1.8, specialRequired: 9 },
  { id: 'pythor', name: 'Pythor (Serpentine)', short: 'PY', colorClass: 'color-pythor', maxHP: 1000, attackMin: 120, attackMax: 200, specialMultiplier: 1.6, specialRequired: 8 },
  { id: 'morro', name: 'Morro (Ghost)', short: 'MO', colorClass: 'color-morro', maxHP: 1100, attackMin: 100, attackMax: 170, specialMultiplier: 2.1, specialRequired: 5 }
];
