// =============================================================================
// JETSTREAM TYPE SCHEMA ADDITIONS - PHASE 12
// =============================================================================
// Add to /types/index.ts
//
// Collecting (art, wine, cars, watches, books, jewelry) + Year-in-Review

import type { ISODateString } from './index';

// -----------------------------------------------------------------------------
// COLLECTIBLES
// -----------------------------------------------------------------------------

export type CollectibleCategory = 
  | 'art'
  | 'wine'
  | 'whiskey'
  | 'classic-car'
  | 'watch'
  | 'jewelry'
  | 'rare-book'
  | 'sculpture'
  | 'photography'
  | 'design-object';

export type CollectibleProvenance = 
  | 'auction'
  | 'gallery-direct'
  | 'private-sale'
  | 'gift-received'
  | 'inherited'
  | 'commissioned';

export interface Collectible {
  id: string;
  category: CollectibleCategory;
  title: string;
  artist?: string;
  yearCreated?: number;
  description: string;
  
  // Acquisition
  acquiredAt: ISODateString;
  acquiredVia: CollectibleProvenance;
  acquisitionPrice: number;
  acquiredFromPersonaId?: string;     // if gift or private sale from persona
  
  // Valuation
  currentValuation: number;
  lastValuedAt: ISODateString;
  
  // Storage / display
  currentLocationResidenceId?: string;  // which property houses it
  storageType: 'displayed' | 'vault' | 'cellar' | 'climate-controlled' | 'in-transit';
  insurancePerYear: number;
  
  // Aesthetic
  imageUrl?: string;
  
  // Provenance chain
  provenance: { owner: string; period: string }[];
}

export interface AuctionListing {
  id: string;
  collectibleId?: string;             // null for new acquisitions
  category: CollectibleCategory;
  title: string;
  artist?: string;
  description: string;
  
  // Auction details
  auctionHouse: 'Sotheby\'s' | 'Christie\'s' | 'Phillips' | 'Bonhams' | 'Heritage';
  saleDate: ISODateString;
  estimateLow: number;
  estimateHigh: number;
  reservePrice?: number;
  
  // State
  status: 'upcoming' | 'live' | 'sold' | 'unsold' | 'withdrawn';
  hammerPrice?: number;
  buyerId?: string;                   // 'player' or persona id or 'unknown'
}

// -----------------------------------------------------------------------------
// YEAR IN REVIEW
// -----------------------------------------------------------------------------

export interface YearInReview {
  id: string;
  year: number;
  generatedAt: ISODateString;
  
  // Headline stats
  netWorthStart: number;
  netWorthEnd: number;
  netWorthChange: number;
  
  // Travel
  flightCount: number;
  totalNauticalMiles: number;
  uniqueAirports: number;
  topDestinations: { name: string; count: number }[];
  
  // Yachts/residences
  yachtCharters: number;
  eventsHosted: number;
  
  // Social
  newRelationships: { personaId: string; status: string }[];
  endedRelationships: { personaId: string; status: string }[];
  marriagesAttended: number;
  divorcesWitnessed: number;
  
  // Drama
  dramaEventCount: number;
  notableDramaIds: string[];
  
  // Reputation
  reputationStart: { discretion: number; fidelity: number; generosity: number; dramaProne: number };
  reputationEnd: { discretion: number; fidelity: number; generosity: number; dramaProne: number };
  publicLabelsEnd: string[];
  
  // Collecting
  collectiblesAcquired: number;
  totalSpentOnArt: number;
  
  // Gossip
  gossipItemsAboutPlayer: number;
  correctionsIssued: number;
  
  // LLM-generated narrative
  yearNarrative: string;              // 3-5 paragraph essay
  highlights: string[];               // 5-10 bullet "moments of the year"
  oneSentenceSummary: string;         // for sharing
  
  // Awards (LLM-picked)
  awards: { title: string; recipient: string; reasoning: string }[];
}

// -----------------------------------------------------------------------------
// DEXIE SCHEMA UPDATES
// -----------------------------------------------------------------------------
//
// db.version(N).stores({
//   ...existing,
//   collectibles: 'id, category, currentLocationResidenceId, acquiredAt',
//   auctionListings: 'id, status, saleDate, category',
//   yearsInReview: 'id, year',
// });
