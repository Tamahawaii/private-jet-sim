// Pre-renders persona portraits to public/avatars/*.svg and stamps imageUrl
// into data/personas.json (+ the player). Run after editing personas.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createAvatar } from '@dicebear/core';
import * as lorelei from '@dicebear/lorelei';

const SKIN = ['f6e4d6', 'f2d3b1', 'e8c39e', 'd9a878', 'c68642', 'a0673f', '8d5524', '6b4226'];
const HAIR = ['0d0d0d', '1f1a17', '3b2a20', '5a3a22', '7a4b2a', 'a06b3a', 'c9a063', 'd9c3a5'];
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// Light art-direction per character (from their bios); everything else is seeded.
const OVERRIDES = {
  'marcus-chen': { skin: 'e8c39e', hair: '0d0d0d' },
  'naomi-tanaka': { skin: 'f2d3b1', hair: '1f1a17' },
  'elena-marchetti': { skin: 'f2d3b1', hair: '3b2a20' },
  'sasha-volkov': { skin: 'f6e4d6', hair: 'c9a063' },
  'khalid-al-rashid': { skin: 'd9a878', hair: '0d0d0d' },
  'charles-pemberton': { skin: 'f6e4d6', hair: 'b8b8b8' },
  'alessandro-rossi': { skin: 'e8c39e', hair: '1f1a17' },
  'isabella-park': { skin: 'f2d3b1', hair: '0d0d0d' },
  'viktor-petrov': { skin: 'f2d3b1', hair: '8a8a8a' },
  'amelie-laurent': { skin: 'f6e4d6', hair: '5a3a22' },
  'raj-mehta': { skin: 'a0673f', hair: '0d0d0d' },
  'yui-takahashi': { skin: 'f2d3b1', hair: '0d0d0d' },
  'theo-beaumont': { skin: 'e8c39e', hair: '3b2a20' },
  'rio-almeida': { skin: 'c68642', hair: '1f1a17' },
  'james-okonkwo-petersen': { skin: '6b4226', hair: '0d0d0d' },
  'damir-volkov-reyes': { skin: 'e8c39e', hair: '1f1a17' },
  'constance-pemberton-west': { skin: 'f6e4d6', hair: 'a06b3a' },
  'olivier-dubois': { skin: 'f2d3b1', hair: '7a4b2a' },
  'jules-laurent': { skin: 'd9a878', hair: '1f1a17' },
  'player': { skin: 'd9a878', hair: '0d0d0d' },
};

function options(seed, traits) {
  const h = hash(seed);
  const g = (traits.gender || '').toLowerCase();
  const isWoman = g.startsWith('w') || g === 'female';
  const isMan = g.startsWith('m') && !isWoman;
  const age = traits.age ?? 40;
  const skin = traits.skin || SKIN[h % SKIN.length];
  let hair = traits.hair || HAIR[(h >> 4) % HAIR.length];
  if (!traits.hair && age >= 60) hair = 'b8b8b8';
  return {
    seed, skinColor: [skin], hairColor: [hair],
    beardProbability: isMan ? 35 : isWoman ? 0 : 15,
    earringsProbability: isWoman ? 70 : 8,
    glassesProbability: age >= 45 ? 30 : 15,
    frecklesProbability: 12,
    hairAccessoriesProbability: isWoman ? 15 : 0,
    mouth: ['happy01','happy02','happy03','happy04','happy05','happy06','happy07','happy08','happy09','happy10','happy11','happy12','happy13','happy14','happy15','happy16','happy17','happy18'],
  };
}

mkdirSync('public/avatars', { recursive: true });
const personas = JSON.parse(readFileSync('data/personas.json', 'utf8'));
for (const p of personas) {
  const svg = createAvatar(lorelei, options(p.id, { gender: p.gender, age: p.age, ...(OVERRIDES[p.id] || {}) })).toString();
  writeFileSync(`public/avatars/${p.id}.svg`, svg);
  p.imageUrl = `/avatars/${p.id}.svg`;
}
writeFileSync('data/personas.json', JSON.stringify(personas, null, 2) + '\n');
const player = JSON.parse(readFileSync('data/player.json', 'utf8'));
writeFileSync('public/avatars/player.svg', createAvatar(lorelei, options('player-' + player.displayName, { gender: player.gender, age: player.age, ...OVERRIDES.player })).toString());
console.log('avatars:', personas.length + 1);
