// =============================================================================
// INTIMACY EMOJI CURATOR
// =============================================================================
// /lib/intimacy/emoji-curator.ts
//
// Picks 4-6 contextual emojis that bounce on the black screen during fade.
// Avoids overtly sexual emojis. Goes for: tension, mood, setting, sensuality.

import type { IntimacyDepth, Persona } from '@/types';

interface EmojiContext {
  depth: IntimacyDepth;
  location: string;
  persona: Persona;
}

// -----------------------------------------------------------------------------
// EMOJI POOLS
// -----------------------------------------------------------------------------

const MOOD_EMOJIS = {
  tender: ['🌙', '🕯️', '✨', '🪞', '🌿', '🍃', '🌹'],
  charged: ['🔥', '🌶️', '💋', '🥃', '🍷', '⚡', '🌪️'],
  romantic: ['🌹', '💋', '🌙', '🕯️', '✨', '💫', '🥀'],
  playful: ['🍑', '🍒', '🥃', '🍷', '🌶️', '✨', '💫'],
  intense: ['🔥', '⚡', '🌪️', '🥃', '💋', '🌶️', '🍑'],
  morning: ['☀️', '☕', '🥐', '🌿', '🪞', '🌸'],
};

const LOCATION_EMOJIS: Record<string, string[]> = {
  // Beach/tropical
  beach: ['🌴', '🌊', '🌅', '🐚'],
  tropical: ['🌴', '🌺', '🥥', '🌊'],
  hawaii: ['🌺', '🌴', '🌊', '🌋'],
  
  // City
  paris: ['🗼', '🥖', '🍷', '🌃'],
  london: ['🌧️', '🥃', '☂️', '🌃'],
  tokyo: ['🌸', '🍶', '🏮', '🌃'],
  newyork: ['🗽', '🍸', '🌃', '🎷'],
  
  // Mountain/wilderness
  mountain: ['⛰️', '🌲', '❄️', '🔥'],
  desert: ['🏜️', '🌵', '🌅', '⭐'],
  
  // Indoor luxury
  hotel: ['🛎️', '🥂', '🌙', '🕯️'],
  yacht: ['⛵', '🌊', '🥂', '🌅'],
  jet: ['✈️', '🥂', '🌙', '☁️'],
  villa: ['🏛️', '🌿', '🥂', '🕯️'],
  
  // Specific resort vibes
  amalfi: ['🍋', '🌊', '🌅', '🥃'],
  capri: ['🌊', '🍋', '⛵', '🌅'],
  marrakech: ['🌙', '🕯️', '🫖', '🌹'],
  bali: ['🌺', '🌴', '🌊', '🕯️'],
};

const PERSONA_FLAVOR: Record<string, string[]> = {
  // Add persona-specific flavor emojis (matched to their interests/aesthetic)
  'theo-beaumont': ['🪡', '🥃', '🌃', '🇫🇷'],
  'rio-almeida': ['🇧🇷', '🌴', '🥃', '🌅'],
  'naomi-tanaka': ['🌸', '🍶', '✨', '🌙'],
  'elena-marchetti': ['☕', '🌿', '🕯️', '🇮🇹'],
  'sasha-volkov': ['🎨', '🥃', '✨', '🌹'],
  'james-okonkwo-petersen': ['🚲', '🌿', '🥃', '🌃'],
  'damir-volkov-reyes': ['🌹', '📚', '🌿', '🍷'],
  'marcus-chen': ['⛵', '🥃', '🌅', '🌊'],
  'khalid-al-rashid': ['🦅', '🌙', '🐎', '🕌'],
  'amelie-laurent': ['📷', '🥖', '🌹', '🇫🇷'],
};

const DEPTH_INTENSITY: Record<IntimacyDepth, keyof typeof MOOD_EMOJIS> = {
  'kiss': 'tender',
  'makeout': 'charged',
  'first-night': 'romantic',
  'returning': 'playful',
  'morning-after': 'morning',
  'reunion': 'intense',
};

// -----------------------------------------------------------------------------
// SELECTOR
// -----------------------------------------------------------------------------

export function selectEmojisForContext(ctx: EmojiContext): string[] {
  const selected = new Set<string>();
  
  // 2-3 mood emojis based on depth
  const moodPool = MOOD_EMOJIS[DEPTH_INTENSITY[ctx.depth]];
  pickRandom(moodPool, 2 + Math.floor(Math.random() * 2)).forEach(e => selected.add(e));
  
  // 1-2 location emojis if location matches a known vibe
  const locKey = matchLocationKey(ctx.location);
  if (locKey && LOCATION_EMOJIS[locKey]) {
    pickRandom(LOCATION_EMOJIS[locKey], 1 + Math.floor(Math.random() * 2)).forEach(e => selected.add(e));
  }
  
  // 1 persona-specific flavor emoji if available
  if (PERSONA_FLAVOR[ctx.persona.id]) {
    pickRandom(PERSONA_FLAVOR[ctx.persona.id], 1).forEach(e => selected.add(e));
  }
  
  // Ensure we have 4-6 total
  const result = Array.from(selected);
  while (result.length < 4) {
    const fallback = MOOD_EMOJIS.romantic[Math.floor(Math.random() * MOOD_EMOJIS.romantic.length)];
    if (!result.includes(fallback)) result.push(fallback);
  }
  
  return result.slice(0, 6);
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function matchLocationKey(location: string): string | null {
  const loc = location.toLowerCase();
  for (const key of Object.keys(LOCATION_EMOJIS)) {
    if (loc.includes(key)) return key;
  }
  
  // Map common ICAOs/cities to keys
  if (/honolulu|hawaii|phnl/i.test(loc)) return 'hawaii';
  if (/paris|lfpb|lfpg/i.test(loc)) return 'paris';
  if (/london|egll|eglc/i.test(loc)) return 'london';
  if (/tokyo|rjtt|haneda/i.test(loc)) return 'tokyo';
  if (/new york|jfk|teb|kteb/i.test(loc)) return 'newyork';
  if (/aman|amangiri/i.test(loc)) return 'desert';
  if (/positano|capri|amalfi/i.test(loc)) return 'amalfi';
  if (/marrakech|tangier/i.test(loc)) return 'marrakech';
  if (/bali|seminyak|ubud/i.test(loc)) return 'bali';
  if (/yacht|sailing|boat/i.test(loc)) return 'yacht';
  if (/jet|flight|aircraft|cabin/i.test(loc)) return 'jet';
  if (/hotel|resort|suite|aman|four seasons|claridges/i.test(loc)) return 'hotel';
  if (/villa|estate|chateau/i.test(loc)) return 'villa';
  if (/beach|coast|shore/i.test(loc)) return 'beach';
  if (/mountain|alps|aspen|st moritz/i.test(loc)) return 'mountain';
  
  return null;
}
