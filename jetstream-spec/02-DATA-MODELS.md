# JETSTREAM — Data Models

All tables stored in IndexedDB via Dexie.js. Types shared between client and API routes via `/types/index.ts`.

## Core Types

```typescript
// /types/index.ts

export type ISODateString = string;   // "2026-04-12T18:30:00.000Z"
export type ICAOCode = string;        // "PHNL", "KJFK"
export type TailNumber = string;      // "N100JS"
export type PersonaID = string;       // "sasha-volkov"
export type EventID = string;
export type ResortID = string;
export type FlightID = string;
export type AircraftModelID = string; // "embraer-phenom-300"

export type Coordinates = {
  lat: number;
  lng: number;
};
```

## Tables

### `player` (singleton)
The user's profile. Only one row ever.

```typescript
type Player = {
  id: "player";                       // constant
  displayName: string;                // "Tama"
  netWorth: number;                   // USD
  prestigeScore: number;              // 0-1000
  createdAt: ISODateString;
  homeBaseICAO: ICAOCode;            // "PHNL"
  currentLocationICAO: ICAOCode;     // wherever the player physically "is"
  currentResortBookingID?: string;   // if checked in somewhere
  settings: {
    simSpeed: 1 | 10 | 30 | 60;
    mapMode: "satellite" | "dark" | "roads" | "flightaware";
    showFriendsOnMap: boolean;
  };
};
```

### `aircraft` (player's fleet)
```typescript
type Aircraft = {
  tailNumber: TailNumber;            // PK
  modelId: AircraftModelID;
  modelName: string;                 // "Embraer Phenom 300" (denormalized for display)
  acquiredAt: ISODateString;
  purchasePrice: number;
  currentLocationICAO: ICAOCode;     // where it sits when not flying
  status: "parked" | "in_transit" | "maintenance";
  currentFlightID?: FlightID;        // set when status = "in_transit"
  modules: AircraftModule[];         // upgrades
  livery?: string;                   // future: paint scheme
  nickname?: string;                 // player-assigned name
  hoursFlown: number;                // lifetime
  hoursSinceLastMaintenance: number;
};

type AircraftModule = {
  id: string;
  name: string;                      // "Satellite Comms", "Extended Range Tank"
  installedAt: ISODateString;
  effect: Partial<{
    rangeBonus: number;              // nm
    speedBonus: number;              // kts
    capacityBonus: number;           // slots
    prestigeBonus: number;
    monthlyCost: number;
  }>;
};
```

### `flights`
Every flight ever. Active flights have `arrivedAt = null`.

```typescript
type Flight = {
  id: FlightID;                      // PK, uuid
  tailNumber: TailNumber;
  originICAO: ICAOCode;
  destinationICAO: ICAOCode;
  departedAt: ISODateString;         // wall-clock time of departure
  estimatedArrivalAt: ISODateString; // computed at departure
  arrivedAt: ISODateString | null;   // null while in flight
  distanceNM: number;
  cruiseSpeedKTS: number;
  burnGPH: number;
  costUSD: number;                   // computed at departure, locked in
  waypoints: Coordinates[];          // great-circle polyline
  passengers: PersonaID[];           // friends who flew with you
  purpose?: {
    type: "event" | "resort" | "leisure";
    targetId: EventID | ResortID;
  };
};
```

### `personas` (AI friends)
15 rows, seeded once on first load. Never created dynamically.

```typescript
type Persona = {
  id: PersonaID;                     // "sasha-volkov"
  displayName: string;               // "Sasha Volkov"
  archetype: PersonaArchetype;
  age: number;
  nationality: string;               // "Russian-Monégasque"
  bio: string;                       // 2-3 sentences, shown on profile
  netWorth: number;                  // USD
  personality: {
    warmth: number;                  // 0-100
    ambition: number;
    flashiness: number;
    loyalty: number;
    humor: number;
  };
  interests: string[];               // ["art", "F1", "contemporary jazz"]
  homeBaseICAO: ICAOCode;
  fleet: {                           // their planes (not interactive, just lore)
    modelId: AircraftModelID;
    tailNumber: TailNumber;
  }[];
  portraitUrl: string;               // stock image
  voiceStyle: string;                // prompt fragment for Claude
  rivals: PersonaID[];               // they don't like these people
  closeFriends: PersonaID[];         // they DM these people often
};

type PersonaArchetype =
  | "old_money_heir"
  | "tech_founder"
  | "hedge_fund_titan"
  | "crypto_whale"
  | "hollywood_mogul"
  | "fashion_dynasty"
  | "oil_scion"
  | "real_estate_baron"
  | "pharma_heiress"
  | "media_empire"
  | "sports_team_owner"
  | "shipping_magnate"
  | "art_collector"
  | "f1_team_principal"
  | "hotel_dynasty";
```

### `personaState` (AI friends' live status)
Separate from `personas` so static lore stays immutable.

```typescript
type PersonaState = {
  personaId: PersonaID;              // PK
  currentLocationICAO: ICAOCode;     // where they are right now
  currentFlightState?: {
    originICAO: ICAOCode;
    destinationICAO: ICAOCode;
    departedAt: ISODateString;
    estimatedArrivalAt: ISODateString;
    waypoints: Coordinates[];
  };
  nextPlannedFlight?: {
    originICAO: ICAOCode;
    destinationICAO: ICAOCode;
    plannedDepartureAt: ISODateString;
    reason: string;                  // "Attending Coachella Weekend 1"
  };
  friendshipWithPlayer: number;      // -100 to 100
  lastInteractionAt?: ISODateString;
  mood: "happy" | "neutral" | "annoyed" | "envious" | "thrilled";
};
```

### `dmThreads` (1:1 message threads)
```typescript
type DMThread = {
  id: string;                        // "player-sasha-volkov"
  personaId: PersonaID;
  messages: DMMessage[];
  lastMessageAt: ISODateString;
  unreadCount: number;
};

type DMMessage = {
  id: string;
  from: "player" | PersonaID;
  content: string;
  sentAt: ISODateString;
  context?: {                        // what triggered this message
    trigger: "flight_arrival" | "event_invite" | "rivalry" | "reaction" | "player_initiated";
    relatedId?: string;
  };
  attachments?: {
    type: "event" | "resort" | "location_ping";
    id: string;
  }[];
};
```

### `groupChats` (optional v1 feature)
```typescript
type GroupChat = {
  id: string;
  name: string;                      // "Monaco Boys", "The Basel Crew"
  memberPersonaIds: PersonaID[];
  messages: DMMessage[];
};
```

### `events` (real-world billionaire events)
Seeded from `/data/events.json`. Updates yearly (dates shift).

```typescript
type BillionaireEvent = {
  id: EventID;
  name: string;                      // "Monaco Grand Prix"
  category: EventCategory;
  locationICAO: ICAOCode;
  locationCity: string;
  locationCountry: string;
  startDate: ISODateString;
  endDate: ISODateString;
  prestigeTier: 1 | 2 | 3 | 4 | 5;   // 5 = Met Gala tier
  prestigeRequired: number;          // gate for invite-only events
  ticketPrice: number;               // USD, per person
  dressCode: string;
  description: string;               // 2-3 sentences
  imageUrl: string;
  confirmedAttendees: PersonaID[];   // friends going
};

type EventCategory =
  | "music_festival" | "art_fair" | "motorsport" | "fashion"
  | "film_festival" | "awards" | "conference" | "yacht_regatta"
  | "polo" | "horse_racing" | "tennis" | "golf" | "auction"
  | "gala" | "summit";
```

### `eventAttendance` (player's history)
```typescript
type EventAttendance = {
  id: string;
  eventId: EventID;
  attendedAt: ISODateString;
  companionPersonaIds: PersonaID[];
  prestigeGained: number;
  recapText: string;                 // Claude-generated
  paparazziPhotoUrl?: string;
};
```

### `resorts` (luxury properties)
Seeded from `/data/resorts.json`.

```typescript
type Resort = {
  id: ResortID;
  name: string;                      // "Aman Tokyo"
  brand: string;                     // "Aman", "Four Seasons", "Cheval Blanc"
  locationICAO: ICAOCode;            // nearest airport
  locationCity: string;
  locationCountry: string;
  nightlyRateUSD: number;
  suiteOptions: {
    name: string;
    rateMultiplier: number;          // 1.0 for base, 3.0 for presidential
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
```

### `resortBookings`
```typescript
type ResortBooking = {
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
```

### `transactions` (ledger)
Every money event. Enables "net worth over time" chart later.

```typescript
type Transaction = {
  id: string;
  occurredAt: ISODateString;
  type: TransactionType;
  amount: number;                    // negative for outflow
  description: string;
  relatedEntityId?: string;
};

type TransactionType =
  | "aircraft_purchase" | "aircraft_sale"
  | "flight_cost" | "fuel" | "crew_salary" | "hangar_fee"
  | "maintenance" | "module_install"
  | "resort_booking" | "resort_experience"
  | "event_ticket"
  | "charter_income" | "investment_yield" | "appearance_fee"
  | "monthly_burn";
```

### `notifications`
```typescript
type Notification = {
  id: string;
  type: "dm" | "flight_arrival" | "event_reminder" | "friend_action" | "system";
  title: string;
  body: string;
  createdAt: ISODateString;
  readAt?: ISODateString;
  linkTo?: string;                   // route path
};
```

## Dexie Schema Definition

```typescript
// /lib/db.ts
import Dexie, { Table } from 'dexie';

class JetstreamDB extends Dexie {
  player!: Table<Player, string>;
  aircraft!: Table<Aircraft, TailNumber>;
  flights!: Table<Flight, FlightID>;
  personas!: Table<Persona, PersonaID>;
  personaState!: Table<PersonaState, PersonaID>;
  dmThreads!: Table<DMThread, string>;
  groupChats!: Table<GroupChat, string>;
  events!: Table<BillionaireEvent, EventID>;
  eventAttendance!: Table<EventAttendance, string>;
  resorts!: Table<Resort, ResortID>;
  resortBookings!: Table<ResortBooking, string>;
  transactions!: Table<Transaction, string>;
  notifications!: Table<Notification, string>;

  constructor() {
    super('jetstream');
    this.version(1).stores({
      player: 'id',
      aircraft: 'tailNumber, status, currentLocationICAO',
      flights: 'id, tailNumber, arrivedAt, departedAt',
      personas: 'id',
      personaState: 'personaId, currentLocationICAO',
      dmThreads: 'id, personaId, lastMessageAt',
      groupChats: 'id',
      events: 'id, startDate, prestigeTier',
      eventAttendance: 'id, eventId, attendedAt',
      resorts: 'id, prestigeTier',
      resortBookings: 'id, status, checkInDate',
      transactions: 'id, occurredAt, type',
      notifications: 'id, createdAt, readAt',
    });
  }
}

export const db = new JetstreamDB();
```

## Repository Pattern

All DB access goes through `/lib/repositories/*.ts`. Example:

```typescript
// /lib/repositories/flights.ts
export const flightRepo = {
  async getActive(): Promise<Flight[]> {
    return db.flights.where('arrivedAt').equals(null as any).toArray();
  },
  async create(flight: Flight): Promise<void> {
    await db.flights.add(flight);
  },
  async markArrived(id: FlightID, at: ISODateString): Promise<void> {
    await db.flights.update(id, { arrivedAt: at });
  },
  // ...
};
```

This keeps components unaware of storage and makes future Supabase migration a drop-in swap.
