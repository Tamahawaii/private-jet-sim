// =============================================================================
// JETSTREAM TYPE SCHEMA ADDITIONS - PHASE 7 + 8
// =============================================================================
// Add these to /types/index.ts

import type { Persona } from './index';  // existing Persona from Phase 6

// -----------------------------------------------------------------------------
// CUSTOM PERSONAS (Phase 7)
// -----------------------------------------------------------------------------

export interface CustomPersona extends Persona {
  isCustom: true;
  createdBy: 'player';
  createdAt: ISODateString;
  updatedAt: ISODateString;
  
  // Custom personas can have a "lite" creation flow:
  // - Required: id, displayName, age, gender, pronouns, publicOrientation, region
  // - Auto-filled: voiceStyle (LLM-generated), background (LLM-generated)
  // - Optional but encouraged: interests, tastes, drama
}

export interface CustomPersonaSeed {
  // Minimal fields the player provides; rest auto-generated via LLM
  displayName: string;
  age: number;
  gender: string;
  pronouns: string;
  publicOrientation: string;
  region: string;
  homeBase: string;              // ICAO
  wealthTier: 1 | 2 | 3 | 4 | 5;
  shortDescription: string;       // 1-2 sentence player input
  relationshipToPlayer?: string;  // "friend from college", "ex-fling", etc.
}

// -----------------------------------------------------------------------------
// RELATIONSHIP STATE (Phase 8)
// -----------------------------------------------------------------------------

/**
 * Five-axis relationship metric (Sims-style radar chart).
 * Values 0-100. Initialized at 0 unless seeded.
 */
export interface RelationshipMetrics {
  affection: number;        // baseline warmth, friendship-coded
  trust: number;            // willingness to be vulnerable, share secrets
  heat: number;             // current intensity of recent interactions (decays without contact)
  romanticTension: number;  // sexual/romantic charge specifically
  rivalry: number;          // competitive, antagonistic energy (can coexist with affection)
}

export type RelationshipStatus = 
  | 'strangers'           // never met or barely
  | 'acquaintances'       // know each other casually
  | 'friends'             // genuine friendship
  | 'close-friends'       // confidantes
  | 'flirting'            // romantic tension acknowledged
  | 'romantic-interest'   // mutual interest declared
  | 'dating'              // exclusive or semi-exclusive romantic
  | 'situationship'       // ambiguous romantic-but-not-defined
  | 'intimate-occasional' // occasional intimacy without commitment
  | 'partners'            // committed romantic partners
  | 'married'             // formally married
  | 'estranged'           // history that ended badly
  | 'rivals'              // active rivalry, cool or hot
  | 'enemies';            // openly hostile

export interface Relationship {
  id: string;                    // composite: 'persona1Id__persona2Id' (sorted alphabetically)
  participantA: string;          // persona ID (lower in alphabetical order)
  participantB: string;          // persona ID
  metrics: RelationshipMetrics;
  status: RelationshipStatus;
  isPubliclyKnown: boolean;
  history: RelationshipEvent[];  // chronological log
  startedAt: ISODateString;
  lastInteractionAt: ISODateString;
  notes?: string;                // "met at Davos 2024", etc.
}

export type RelationshipEventType =
  | 'first-meeting'
  | 'shared-flight'
  | 'shared-event'
  | 'shared-resort-stay'
  | 'gift-sent'
  | 'gift-received'
  | 'dm-exchanged'
  | 'flirtation'
  | 'first-kiss'
  | 'first-intimacy'
  | 'argument'
  | 'reconciliation'
  | 'public-appearance-together'
  | 'breakup'
  | 'relationship-defined'
  | 'rivalry-declared'
  | 'gossip-spread'
  | 'jealousy-incident';

export interface RelationshipEvent {
  id: string;
  type: RelationshipEventType;
  at: ISODateString;
  description: string;            // "Met at Monaco GP, danced together"
  metricsDelta?: Partial<RelationshipMetrics>;
  contextRefs?: {
    eventId?: string;
    flightId?: string;
    resortBookingId?: string;
    giftId?: string;
    dmThreadId?: string;
  };
}

// -----------------------------------------------------------------------------
// GIFTS (Phase 8)
// -----------------------------------------------------------------------------

export type GiftCategory =
  | 'jewelry'
  | 'art'
  | 'wine-spirits'
  | 'fashion'
  | 'experience'
  | 'travel'
  | 'flowers'
  | 'literature'
  | 'tech'
  | 'commission'         // commissioned piece (custom art, etc.)
  | 'symbolic';          // small but meaningful

export interface GiftItem {
  id: string;
  name: string;
  category: GiftCategory;
  basePrice: number;       // USD
  description: string;
  affinityImpact: {        // how much this gift typically moves metrics
    affection?: number;    // typical: +3 to +15
    heat?: number;         // typical: +5 to +20
    romanticTension?: number;
    trust?: number;
  };
  preferredBy?: string[];  // persona IDs who'd especially appreciate (bonus impact)
  imageUrl: string | null;
}

export interface GiftSent {
  id: string;
  giftItemId: string;
  fromId: string;          // persona ID or 'player'
  toId: string;            // persona ID or 'player'
  occasion?: string;       // "birthday", "after our weekend", etc.
  personalNote?: string;
  sentAt: ISODateString;
  receivedAt: ISODateString | null;
  reactionDM?: string;     // recipient's response (LLM-generated)
  metricsApplied: Partial<RelationshipMetrics>;
}

// -----------------------------------------------------------------------------
// DEXIE SCHEMA UPDATES
// -----------------------------------------------------------------------------
// 
// Add to /lib/db.ts:
//
// db.version(N).stores({
//   ...existing,
//   relationships: 'id, participantA, participantB, status, lastInteractionAt',
//   relationshipEvents: 'id, relationshipId, type, at',
//   giftItems: 'id, category, basePrice',
//   giftsSent: 'id, fromId, toId, sentAt',
// });
//
// Note: customPersonas use existing 'personas' table with isCustom: true flag

export type ISODateString = string;
