// =============================================================================
// JETSTREAM TYPE SCHEMA ADDITIONS - PHASE 5 + 6
// =============================================================================
// Add these to /types/index.ts (keep existing types)
// These additions support: identity diversity, player profile, pets, resorts

// -----------------------------------------------------------------------------
// IDENTITY (used across player + personas)
// -----------------------------------------------------------------------------

export interface PartnerEntry {
  name: string;
  relationship: string;        // "wife of 12 years", "casual 8 months", etc.
  status: string;              // "stable", "winding down", "passionate", etc.
  publicly_known?: boolean;    // is this relationship public?
  location?: string;           // city
  occupation?: string;
  note?: string;
}

export interface IdentityFields {
  gender: string;              // "man", "woman", "non-binary", custom
  pronouns: string;            // "he/him", "she/her", "they/them", custom
  publicOrientation: string;   // shown publicly: "gay", "straight", "bi", "lesbian", etc.
  privateOrientation?: string; // optional - revealed at relationship depth threshold (e.g., Marcus closeted)
  publicRelationshipStatus?: string;  // "married", "single", "in something casual", etc.
  orientationFlexibility: string;     // free-text: "settled", "openly fluid", "publicly closed privately curious"
  relationshipStyle: string;          // "monogamous", "openly polyamorous", "discreetly open", etc.
  currentPartners: PartnerEntry[];    // can be empty array
}

// -----------------------------------------------------------------------------
// PERSONA - extended schema
// -----------------------------------------------------------------------------

export interface PersonaTastes {
  drinks?: string;
  wears?: string;
  drives?: string;
  aesthetic?: string;
  music?: string;
  [key: string]: string | undefined;
}

export interface PersonaFleetEntry {
  tailNumber: string;
  model: string;
  status: 'primary' | 'secondary' | 'joy/personal' | string;
}

export interface Persona extends IdentityFields {
  id: string;
  displayName: string;
  age: number;                 // must be >= 25
  region: string;              // "Brazilian (São Paulo)", etc.
  background: string;          // long-form bio
  residences: string[];        // freeform list
  voiceStyle: string;          // critical for Claude prompt differentiation
  interests: string[];
  tastes: PersonaTastes;
  fleet: PersonaFleetEntry[];  // can be empty array
  preferredResorts: string[];  // resort IDs
  playerDynamic: string;       // how they engage with player (informs Claude prompt)
  drama: string;               // their current life drama
  rivalries: string[];         // persona IDs they rival
  wealthTier: 1 | 2 | 3 | 4 | 5;
  netWorth: number;
  imageUrl: string | null;     // null = use monogram fallback
  monogramColors: [string, string]; // [color1, color2] for gradient fallback
}

// -----------------------------------------------------------------------------
// PLAYER PROFILE - canonical Tama
// -----------------------------------------------------------------------------

export interface Player extends IdentityFields {
  id: 'player';
  displayName: string;
  alternateName?: string;     // optional alt (Tama / Brian)
  age: number;
  region: string;
  homeBase: string;            // ICAO
  homeCity: string;
  occupation: string;
  wealthTier: 1 | 2 | 3 | 4 | 5;
  netWorth: number;
  publicReputation: string;
  voiceStyle: string;          // informs Claude on how player "sounds"
  personality: string[];
  tastes: PersonaTastes;
  imageUrl: string | null;
  monogramColors: [string, string];
  interests: string[];
}

// -----------------------------------------------------------------------------
// PETS
// -----------------------------------------------------------------------------

export interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat' | 'bird' | 'horse' | string;
  breed: string;
  age: number;
  ownerId: string;             // 'player' or persona ID
  ownerType: 'player' | 'persona';
  currentLocationICAO: string;
  personality: string;         // short description
  imageUrl: string | null;
  addedAt: ISODateString;
}

// -----------------------------------------------------------------------------
// RESORTS
// -----------------------------------------------------------------------------

export interface SignatureExperience {
  id: string;
  name: string;
  price: number;
  description: string;
}

export type ResortCategory =
  | 'desert'
  | 'private-island'
  | 'urban-historic'
  | 'urban-modern'
  | 'urban-design'
  | 'urban-iconic'
  | 'urban-resort'
  | 'garden-retreat'
  | 'coastal-historic'
  | 'coastal-classic'
  | 'coastal-cliff'
  | 'coastal-mediterranean'
  | 'coastal-tropical'
  | 'coastal-design'
  | 'coastal-urban'
  | 'coastal-remote'
  | 'countryside'
  | 'countryside-historic'
  | 'countryside-american'
  | 'wellness-mountain'
  | 'wellness-island'
  | 'safari'
  | 'remote-wilderness'
  | 'lake-historic'
  | 'riad-historic'
  | 'coastal-regional'
  | 'mountain-classic';

export interface Resort {
  id: string;
  name: string;
  brand: string;
  locationICAO: string;
  nearestAirport: string;
  city: string;
  country: string;
  region: string;
  category: ResortCategory;
  tier: 1 | 2 | 3 | 4 | 5;
  nightlyRate: number;
  currency: string;            // "USD"
  lat: number;
  lng: number;
  description: string;         // long-form
  shortDescription: string;    // single-line summary
  amenities: string[];
  dressCode: string;
  imageUrl: string | null;
  signatureExperiences: SignatureExperience[];
  preferredBy: string[];       // persona IDs who'd naturally stay here
}

// -----------------------------------------------------------------------------
// RESORT BOOKING (Phase 5)
// -----------------------------------------------------------------------------

export interface ResortBooking {
  id: string;
  resortId: string;
  playerId: 'player';
  checkInAt: ISODateString;    // sim time of arrival
  checkOutAt: ISODateString | null;  // null = currently checked in
  defaultNights: number;       // 3 by default
  extendedNights: number;      // additional nights via concierge
  totalCharged: number;        // running total in USD
  experiencesPurchased: string[]; // signature experience IDs
}

// -----------------------------------------------------------------------------
// API USAGE (already exists, just confirming schema)
// -----------------------------------------------------------------------------

export interface ApiUsageRecord {
  id: string;
  timestamp: ISODateString;
  model: string;               // 'claude-haiku-4-5-20251001' etc.
  endpoint: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  personaId?: string;
  threadId?: string;
  providerId?: string;         // for future pluggable LLM phase
}

// -----------------------------------------------------------------------------
// DEXIE SCHEMA UPDATES (for /lib/db.ts)
// -----------------------------------------------------------------------------
//
// Add these new tables to your Dexie schema:
//
// db.version(N).stores({
//   ...existing,
//   resorts: 'id, locationICAO, region, tier, brand',
//   resortBookings: 'id, resortId, playerId, checkInAt, checkOutAt',
//   pets: 'id, ownerId, currentLocationICAO',
//   player: 'id',  // single record
// });

export type ISODateString = string;
