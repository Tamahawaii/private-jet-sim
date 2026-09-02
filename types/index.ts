export type ISODateString = string;
export type ICAOCode = string;
export type TailNumber = string;
export type PersonaID = string;
export type EventID = string;
export type ResortID = string;
export type FlightID = string;
export type AircraftModelID = string;

export type Coordinates = {
  lat: number;
  lng: number;
};

export interface PartnerEntry {
  name: string;
  relationship: string;
  status: string;
  publicly_known?: boolean;
  location?: string;
  occupation?: string;
  note?: string;
}

export interface IdentityFields {
  gender: string;
  pronouns: string;
  publicOrientation: string;
  privateOrientation?: string;
  publicRelationshipStatus?: string;
  orientationFlexibility: string;
  relationshipStyle: string;
  currentPartners: PartnerEntry[];
}

export interface PersonaTastes {
  drinks?: string;
  wears?: string;
  drives?: string;
  aesthetic?: string;
  music?: string;
  [key: string]: string | undefined;
}

export interface Player extends IdentityFields {
  id: "player";
  displayName: string;
  alternateName?: string;
  age: number;
  region: string;
  homeBase: string;
  homeCity: string;
  occupation: string;
  wealthTier: 1 | 2 | 3 | 4 | 5;
  netWorth: number;
  publicReputation: string;
  voiceStyle: string;
  personality: string[];
  tastes: PersonaTastes;
  imageUrl: string | null;
  monogramColors: [string, string];
  interests: string[];
  
  // Dynamic Sim Data (Preserved)
  prestigeScore: number;
  createdAt: ISODateString;
  homeBaseICAO: ICAOCode;
  currentLocationICAO: ICAOCode;
  settings: {
    simSpeed: 1 | 10 | 30 | 60 | 100;
    mapMode: "satellite" | "dark" | "roads" | "flightaware";
    showFriendsOnMap: boolean;
  };
  relationshipPreferences?: Record<string, any>;
}

export type Aircraft = {
  tailNumber: TailNumber;
  modelId: AircraftModelID;
  modelName: string;
  acquiredAt: ISODateString;
  purchasePrice: number;
  currentLocationICAO: ICAOCode;
  status: "parked" | "in_transit" | "maintenance";
  currentFlightID: FlightID | null;
  modules: AircraftModule[];
  livery?: string;
  nickname?: string;
  hoursFlown: number;
  hoursSinceLastMaintenance: number;
  
  // Required MVP Core Specs
  costPerNM: number;
  speedKnots: number;
  fuelBurnGPH: number;
  rangeNM: number;
  
  // Legacy MVP state (Phase 0 -> Phase 2 compat)
  id: string;
  model: string;
  flightPhase: 'Hangar' | 'Pre-flight' | 'Taxi' | 'Takeoff' | 'Cruise' | 'Landing';
  currentLocation: { lat: number, lng: number, name: string } | null;
  destination: { lat: number, lng: number, name: string } | null;
  lockedUntil: number | null;
  launchedAt: number | null;
  layoutImage: string | null;
  cabinConfig: any[];
  scheduledRoutes: any[];
};

export type AircraftModule = {
  id: string;
  name: string;
  installedAt: ISODateString;
  effect: Partial<{
    rangeBonus: number;
    speedBonus: number;
    capacityBonus: number;
    prestigeBonus: number;
    monthlyCost: number;
  }>;
};

export type FlightPurpose = {
  type: "event" | "resort" | "leisure" | "delivery";
  targetId?: EventID | ResortID;
  label?: string;
};

export interface FlightRecap {
  prestigeGained: number;
  breakdown: { label: string; points: number }[];
  newCountry: boolean;
  countryName: string;
  firstVisit: boolean;
  flightNumber: number;
  companions: PersonaID[];
  purposeLabel?: string;
  purposeLink?: string;
  arrivedLocalTime: string;
  hoursAloft: number;
  reactionPersonaId?: PersonaID;
}

export type Flight = {
  id: FlightID;
  tailNumber: TailNumber;
  originICAO: ICAOCode;
  destinationICAO: ICAOCode;
  departedAt: number;
  estimatedArrivalAt: number;
  arrivedAt: number | null;
  distanceNM: number;
  cruiseSpeedKTS: number;
  burnGPH: number;
  costUSD: number;
  waypoints: Coordinates[];
  passengers: PersonaID[];
  purpose: FlightPurpose | null;
  /** Ids of in-flight moments whose side effects already ran (idempotency). */
  momentsFired?: string[];
  /** Computed once on arrival. */
  recap?: FlightRecap;
};

export type PersonaArchetype =
  | "old_money_heir" | "tech_founder" | "hedge_fund_titan" | "crypto_whale"
  | "hollywood_mogul" | "fashion_dynasty" | "oil_scion" | "real_estate_baron"
  | "pharma_heiress" | "media_empire" | "sports_team_owner" | "shipping_magnate"
  | "art_collector" | "f1_team_principal" | "hotel_dynasty";

export interface PersonaFleetEntry {
  tailNumber: string;
  model: string;
  status: 'primary' | 'secondary' | 'joy/personal' | string;
}

export interface Persona extends IdentityFields {
  id: PersonaID;
  isCustom?: boolean;
  createdBy?: string;
  displayName: string;
  archetype: PersonaArchetype;
  age: number;
  region: string;
  background: string;
  nationality: string;
  bio: string;
  residences: string[];
  voiceStyle: string;
  interests: string[];
  tastes: PersonaTastes;
  fleet: PersonaFleetEntry[];
  preferredResorts: string[];
  playerDynamic: string;
  drama: string;
  rivalries: string[];
  wealthTier: 1 | 2 | 3 | 4 | 5;
  netWorth: number;
  imageUrl: string | null;
  monogramColors: [string, string];
  personality: {
    warmth: number;
    ambition: number;
    flashiness: number;
    loyalty: number;
    humor: number;
  };
  homeBaseICAO: ICAOCode;
  portraitUrl?: string; // backwards compatibility
  rivals: PersonaID[]; // backwards compatibility
  closeFriends: PersonaID[]; // backwards compatibility
}

export type PersonaState = {
  personaId: PersonaID;
  currentLocationICAO: ICAOCode;
  currentCoords?: { lat: number; lng: number; name?: string };
  currentFlightState: {
    originICAO: ICAOCode;
    destinationICAO: ICAOCode;
    departedAt: ISODateString;
    estimatedArrivalAt: ISODateString;
    waypoints: Coordinates[];
  } | null;
  nextPlannedFlight: {
    originICAO: ICAOCode;
    destinationICAO: ICAOCode;
    plannedDepartureAt: ISODateString;
    reason: string;
  } | null;
  friendshipWithPlayer: number;
  relationshipDepth: number; // 0-100 simple scalar for Milestone A
  lastInteractionAt: ISODateString | null;
  lastDmSentAt?: ISODateString;
  mood: "happy" | "neutral" | "annoyed" | "envious" | "thrilled" | "casual" | "formal" | "elated" | "concerned";
  rivalryTargets: string[]; // Added for 4.5
  lastFlightWithPlayer?: {
     originICAO: string;
     destinationICAO: string;
     arrivedAt: ISODateString;
  };
};

export type DMMessage = {
  id: string;
  from: "player" | PersonaID;
  content: string;
  sentAt: ISODateString;
  context?: {
    trigger: "flight_arrival" | "event_invite" | "rivalry" | "reaction" | "player_initiated";
    relatedId?: string;
  };
  attachments?: {
    type: "event" | "resort" | "location_ping";
    id: string;
  }[];
};

export type DMThread = {
  id: string;
  personaId: PersonaID;
  messages: DMMessage[];
  lastMessageAt: ISODateString;
  unreadCount: number;
};

export type GroupChat = {
  id: string;
  name: string;
  memberPersonaIds: PersonaID[];
  messages: DMMessage[];
};

export type EventCategory =
  | "music_festival" | "art_fair" | "motorsport" | "fashion"
  | "film_festival" | "awards" | "conference" | "yacht_regatta"
  | "polo" | "horse_racing" | "tennis" | "golf" | "auction"
  | "gala" | "summit";

export type BillionaireEvent = {
  id: EventID;
  name: string;
  category: EventCategory;
  locationICAO: ICAOCode;
  locationCity: string;
  locationCountry: string;
  startDate: ISODateString;
  endDate: ISODateString;
  prestigeTier: 1 | 2 | 3 | 4 | 5;
  prestigeRequired: number;
  ticketPrice: number;
  dressCode: string;
  description: string;
  imageUrl: string;
  confirmedAttendees: PersonaID[];
};

export type EventAttendance = {
  id: string;
  eventId: EventID;
  attendedAt: ISODateString;
  companionPersonaIds?: PersonaID[];
  prestigeGained: number | null;
  recapText?: string;
  paparazziPhotoUrl?: string;
  aircraftTailNumber?: string;
  leftAt?: ISODateString | null;
};

export type TransactionType =
  | "aircraft_purchase" | "aircraft_sale"
  | "flight_cost" | "fuel" | "crew_salary" | "hangar_fee"
  | "maintenance" | "module_install"
  | "resort_booking" | "resort_experience"
  | "event_ticket"
  | "charter_income" | "investment_yield" | "appearance_fee"
  | "monthly_burn" | "gift";

export type Transaction = {
  id: string;
  occurredAt: ISODateString;
  type: TransactionType;
  amount: number;
  description: string;
  relatedEntityId?: string;
};

export type Notification = {
  id: string;
  type: "dm" | "flight_arrival" | "event_reminder" | "friend_action" | "system";
  title: string;
  body: string;
  createdAt: ISODateString;
  readAt: ISODateString | null;
  linkTo?: string;
};

export interface ApiUsageRecord {
  id: string;              // uuid
  timestamp: ISODateString;
  model: string;
  endpoint: string;        // '/api/ai/haiku' etc
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  personaId?: string;      // which persona (if DM-related)
  threadId?: string;       // which DM thread (if applicable)
  providerId?: string;     // for pluggable LLM phase
}

// -----------------------------------------------------------------------------
// RESORTS (Phase 5)
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
  currency: string;
  lat: number;
  lng: number;
  description: string;
  shortDescription: string;
  amenities: string[];
  dressCode: string;
  imageUrl: string | null;
  signatureExperiences: SignatureExperience[];
  preferredBy: string[];
}

export interface ResortBooking {
  id: string;
  resortId: string;
  checkInAt: ISODateString;
  checkOutAt: ISODateString | null;
  defaultNights: number;
  extendedNights: number;
  totalCharged: number;
  experiencesPurchased: string[];
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  ownerId: string;
  ownerType: 'player' | 'persona';
  currentLocationICAO: string;
  personality: string;
  imageUrl: string | null;
  addedAt: ISODateString;
}

export interface CustomPersona extends Persona {
  isCustom: true;
  createdBy: 'player';
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CustomPersonaSeed {
  displayName: string;
  age: number;
  region: string;
  archetypeHint: string;
}

// -----------------------------------------------------------------------------
// RELATIONSHIP STATE (Phase 8)
// -----------------------------------------------------------------------------

export interface RelationshipMetrics {
  affection: number;        // baseline warmth, friendship-coded
  trust: number;            // willingness to be vulnerable, share secrets
  heat: number;             // current intensity of recent interactions
  romanticTension: number;  // sexual/romantic charge specifically
  rivalry: number;          // competitive, antagonistic energy
}

export type RelationshipStatus = 
  | 'strangers'
  | 'acquaintances'
  | 'friends'
  | 'close-friends'
  | 'flirting'
  | 'romantic-interest'
  | 'dating'
  | 'situationship'
  | 'intimate-occasional'
  | 'partners'
  | 'married'
  | 'estranged'
  | 'rivals'
  | 'enemies';

export interface Relationship {
  id: string;                    // composite: 'persona1Id__persona2Id' (sorted)
  participantA: string;
  participantB: string;
  metrics: RelationshipMetrics;
  status: RelationshipStatus;
  isPubliclyKnown: boolean;
  history: RelationshipEvent[];
  startedAt: ISODateString;
  lastInteractionAt: ISODateString;
  notes?: string;
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
  description: string;
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
  | 'commission'
  | 'symbolic';

export interface GiftItem {
  id: string;
  name: string;
  category: GiftCategory;
  basePrice: number;
  description: string;
  affinityImpact: {
    affection?: number;
    heat?: number;
    romanticTension?: number;
    trust?: number;
  };
  preferredBy?: string[];
  imageUrl: string | null;
}

export interface GiftSent {
  id: string;
  giftItemId: string;
  fromId: string;
  toId: string;
  occasion?: string;
  personalNote?: string;
  sentAt: ISODateString;
  receivedAt: ISODateString | null;
  reactionDM?: string;
  metricsApplied: Partial<RelationshipMetrics>;
}
