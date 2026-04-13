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

export type Player = {
  id: "player";
  displayName: string;
  netWorth: number;
  prestigeScore: number;
  createdAt: ISODateString;
  homeBaseICAO: ICAOCode;
  currentLocationICAO: ICAOCode;
  currentResortBookingID: string | null;
  settings: {
    simSpeed: 1 | 10 | 30 | 60 | 100;
    mapMode: "satellite" | "dark" | "roads" | "flightaware";
    showFriendsOnMap: boolean;
  };
};

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

export type Flight = {
  id: FlightID;
  tailNumber: TailNumber;
  originICAO: ICAOCode;
  destinationICAO: ICAOCode;
  departedAt: ISODateString;
  estimatedArrivalAt: ISODateString;
  arrivedAt: ISODateString | null;
  distanceNM: number;
  cruiseSpeedKTS: number;
  burnGPH: number;
  costUSD: number;
  waypoints: Coordinates[];
  passengers: PersonaID[];
  purpose: {
    type: "event" | "resort" | "leisure" | "delivery";
    targetId?: EventID | ResortID;
  } | null;
};

export type PersonaArchetype =
  | "old_money_heir" | "tech_founder" | "hedge_fund_titan" | "crypto_whale"
  | "hollywood_mogul" | "fashion_dynasty" | "oil_scion" | "real_estate_baron"
  | "pharma_heiress" | "media_empire" | "sports_team_owner" | "shipping_magnate"
  | "art_collector" | "f1_team_principal" | "hotel_dynasty";

export type Persona = {
  id: PersonaID;
  displayName: string;
  archetype: PersonaArchetype;
  age: number;
  nationality: string;
  bio: string;
  netWorth: number;
  personality: {
    warmth: number;
    ambition: number;
    flashiness: number;
    loyalty: number;
    humor: number;
  };
  interests: string[];
  homeBaseICAO: ICAOCode;
  fleet: {
    modelId: AircraftModelID;
    tailNumber: TailNumber;
  }[];
  portraitUrl: string;
  voiceStyle: string;
  rivals: PersonaID[];
  closeFriends: PersonaID[];
};

export type PersonaState = {
  personaId: PersonaID;
  currentLocationICAO: ICAOCode;
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
  lastInteractionAt: ISODateString | null;
  mood: "happy" | "neutral" | "annoyed" | "envious" | "thrilled";
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
  companionPersonaIds: PersonaID[];
  prestigeGained: number;
  recapText: string;
  paparazziPhotoUrl?: string;
};

export type Resort = {
  id: ResortID;
  name: string;
  brand: string;
  locationICAO: ICAOCode;
  locationCity: string;
  locationCountry: string;
  nightlyRateUSD: number;
  suiteOptions: {
    name: string;
    rateMultiplier: number;
  }[];
  amenities: string[];
  signatureExperiences: {
    name: string;
    priceUSD: number;
    description: string;
  }[];
  prestigeTier: 1 | 2 | 3 | 4 | 5;
  description: string;
  imageUrl: string;
};

export type ResortBooking = {
  id: string;
  resortId: ResortID;
  suiteOption: string;
  checkInDate: ISODateString;
  checkOutDate: ISODateString;
  nightsBooked: number;
  experiencesBooked: {
    name: string;
    priceUSD: number;
  }[];
  totalCostUSD: number;
  status: "upcoming" | "active" | "completed" | "cancelled";
};

export type TransactionType =
  | "aircraft_purchase" | "aircraft_sale"
  | "flight_cost" | "fuel" | "crew_salary" | "hangar_fee"
  | "maintenance" | "module_install"
  | "resort_booking" | "resort_experience"
  | "event_ticket"
  | "charter_income" | "investment_yield" | "appearance_fee"
  | "monthly_burn";

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
