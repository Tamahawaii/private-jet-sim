/**
 * Illustrated portraits for personas (DiceBear "lorelei", CC0) rendered as
 * transparent SVG line art — the UI paints each persona's gradient behind it.
 * Deterministic per seed so a character always looks the same.
 */
import { createAvatar } from '@dicebear/core';
import * as lorelei from '@dicebear/lorelei';

export interface PortraitTraits {
  gender?: string;
  age?: number;
  /** Optional explicit skin tone (hex without #). */
  skin?: string;
  /** Optional explicit hair colour (hex without #). */
  hair?: string;
}

const SKIN = ['f6e4d6', 'f2d3b1', 'e8c39e', 'd9a878', 'c68642', 'a0673f', '8d5524', '6b4226'];
const HAIR = ['0d0d0d', '1f1a17', '3b2a20', '5a3a22', '7a4b2a', 'a06b3a', 'c9a063', 'd9c3a5'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function portraitOptions(seed: string, traits: PortraitTraits = {}) {
  const h = hash(seed);
  const isWoman = (traits.gender || '').toLowerCase().startsWith('w') || (traits.gender || '').toLowerCase() === 'female';
  const isMan = (traits.gender || '').toLowerCase().startsWith('m') && !isWoman;
  const age = traits.age ?? 40;
  const skin = traits.skin || SKIN[h % SKIN.length];
  let hair = traits.hair || HAIR[(h >> 4) % HAIR.length];
  if (!traits.hair && age >= 60) hair = 'b8b8b8';
  else if (!traits.hair && age >= 52 && (h >> 8) % 2 === 0) hair = '8a8a8a';
  return {
    seed,
    skinColor: [skin],
    hairColor: [hair],
    beardProbability: isMan ? 35 : isWoman ? 0 : 15,
    earringsProbability: isWoman ? 70 : 8,
    glassesProbability: age >= 45 ? 30 : 15,
    frecklesProbability: 12,
    hairAccessoriesProbability: isWoman ? 15 : 0,
    mouth: ['happy01', 'happy02', 'happy03', 'happy04', 'happy05', 'happy06', 'happy07', 'happy08', 'happy09', 'happy10', 'happy11', 'happy12', 'happy13', 'happy14', 'happy15', 'happy16', 'happy17', 'happy18'],
  } as const;
}

export function portraitSvg(seed: string, traits: PortraitTraits = {}): string {
  return createAvatar(lorelei, portraitOptions(seed, traits) as never).toString();
}

export function portraitDataUri(seed: string, traits: PortraitTraits = {}): string {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(portraitSvg(seed, traits));
}
