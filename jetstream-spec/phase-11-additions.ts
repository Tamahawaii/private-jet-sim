// =============================================================================
// JETSTREAM TYPE SCHEMA ADDITIONS - PHASE 11
// =============================================================================
// Add these to /types/index.ts
//
// Yachts (similar to aircraft but maritime) + Real Estate (residences).

import type { ISODateString } from './index';

// -----------------------------------------------------------------------------
// YACHTS
// -----------------------------------------------------------------------------

export type YachtClass = 
  | 'sailing'           // sailing yacht (sloop, ketch, schooner)
  | 'motor'             // motor yacht (most common)
  | 'mega'              // 80m+
  | 'explorer'          // expedition / ice-class
  | 'catamaran';        // sail or power cat

export interface Yacht {
  id: string;
  name: string;
  class: YachtClass;
  builder: string;       // e.g., "Lürssen", "Feadship", "Wally"
  yearBuilt: number;
  lengthMeters: number;
  guests: number;        // sleeping capacity
  crewSize: number;
  cruisingSpeedKnots: number;
  rangeNm: number;
  
  // Identifiers
  imo?: string;          // IMO number (for real-yacht inspiration)
  flag: string;          // flag state, e.g., "Cayman Islands", "Marshall Islands"
  hailingPort: string;
  
  // Economics
  acquisitionPrice: number;
  annualOperatingCost: number;   // ~10% of acquisition typically
  charterRatePerWeek: number;     // when rented out
  fuelCostPerNm: number;
  
  // Current state
  currentLocationLat: number;
  currentLocationLng: number;
  currentLocationName: string;     // e.g., "Monaco", "St Barts", "Phuket"
  status: 'docked' | 'cruising' | 'in-charter' | 'in-maintenance' | 'in-transit';
  nextScheduledMovement?: ISODateString;
  
  // Aesthetic
  exteriorPhotoUrl?: string;
  interiorDesigner?: string;
  signatureFeatures: string[];     // e.g., "helipad", "spa", "submarine garage", "cinema"
  
  // Persona associations
  preferredBy: string[];           // persona IDs who'd love being aboard
}

export interface YachtCharter {
  id: string;
  yachtId: string;
  charterPartyType: 'self' | 'guest-personas' | 'charter-out';
  guestPersonaIds: string[];
  startDate: ISODateString;
  endDate: ISODateString;
  itinerary: { date: ISODateString; locationName: string; activity?: string }[];
  
  // Costs/revenue
  costToPlayer: number;            // 0 if chartering out (revenue mode)
  revenueToPlayer: number;         // 0 if self-use
  
  // Generated content
  logEntries: { at: ISODateString; entry: string }[];
}

// -----------------------------------------------------------------------------
// REAL ESTATE
// -----------------------------------------------------------------------------

export type ResidenceType = 
  | 'penthouse'
  | 'townhouse'
  | 'estate'           // country estate, ranch
  | 'villa'            // typically warm-climate
  | 'chalet'           // typically alpine
  | 'island'           // private island
  | 'pied-a-terre'    // small city base
  | 'compound';        // multi-building

export interface Residence {
  id: string;
  name: string;                    // user-given or default
  type: ResidenceType;
  city: string;
  country: string;
  neighborhood?: string;
  
  coordinates: { lat: number; lng: number };
  nearestAirportICAO: string;
  
  // Economics
  acquisitionPrice: number;
  currentValuation: number;
  annualPropertyTax: number;
  annualMaintenanceCost: number;   // staff, utilities, upkeep
  annualInsurance: number;
  
  // Specs
  squareMeters: number;
  bedrooms: number;
  bathrooms: number;
  features: string[];              // e.g., "infinity pool", "art gallery", "wine cellar", "gym", "panic room"
  
  // Staff
  hasFullTimeStaff: boolean;
  staffSize: number;
  caretakerName?: string;          // generated or named
  
  // State
  isPrimary: boolean;              // primary residence
  currentlyOccupied: boolean;
  lastVisitedAt?: ISODateString;
  
  // Aesthetic
  exteriorPhotoUrl?: string;
  interiorDesigner?: string;
  
  // Hosting capability
  canHostEvents: boolean;
  maxEventGuests: number;
}

export interface PropertyEvent {
  id: string;
  residenceId: string;
  type: 'dinner-party' | 'weekend-house-party' | 'gala-fundraiser' | 'private-concert' | 'art-opening' | 'wedding-host' | 'wake' | 'meeting';
  startDate: ISODateString;
  endDate: ISODateString;
  guestPersonaIds: string[];
  cost: number;
  notes?: string;
  generatedRecap?: string;          // post-event recap
}

// -----------------------------------------------------------------------------
// RECURRING COSTS LEDGER
// -----------------------------------------------------------------------------

export interface RecurringCostLine {
  id: string;
  source: 'aircraft' | 'yacht' | 'residence';
  sourceId: string;
  category: 'tax' | 'maintenance' | 'staff' | 'insurance' | 'fuel' | 'docking' | 'other';
  amountUsd: number;
  appliedAt: ISODateString;
  description: string;
}

// -----------------------------------------------------------------------------
// DEXIE SCHEMA UPDATES
// -----------------------------------------------------------------------------
//
// db.version(N).stores({
//   ...existing,
//   yachts: 'id, status, currentLocationName',
//   yachtCharters: 'id, yachtId, startDate, endDate',
//   residences: 'id, type, city, country, isPrimary',
//   propertyEvents: 'id, residenceId, startDate',
//   recurringCosts: 'id, source, sourceId, appliedAt',
// });
