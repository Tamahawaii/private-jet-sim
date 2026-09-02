import Dexie, { Table } from 'dexie';
import {
  Player, Aircraft, Flight, Persona, PersonaState, DMThread, GroupChat,
  BillionaireEvent, EventAttendance, Resort, ResortBooking, Transaction, Notification,
  ApiUsageRecord, Pet, Yacht, Voyage, Marina, Residence, HostedGathering
} from '../types';

export class JetstreamDB extends Dexie {
  player!: Table<Player, string>;
  aircraft!: Table<Aircraft, string>;
  flights!: Table<Flight, string>;
  personas!: Table<Persona, string>;
  personaState!: Table<PersonaState, string>;
  dmThreads!: Table<DMThread, string>;
  groupChats!: Table<GroupChat, string>;
  events!: Table<BillionaireEvent, string>;
  eventAttendance!: Table<EventAttendance, string>;
  resorts!: Table<Resort, string>;
  resortBookings!: Table<ResortBooking, string>;
  transactions!: Table<Transaction, string>;
  notifications!: Table<Notification, string>;
  apiUsage!: Table<ApiUsageRecord, string>;
  pets!: Table<Pet, string>;

  // Phase 11 (v2.1)
  yachts!: Table<Yacht, string>;
  yachtVoyages!: Table<Voyage, string>;
  marinas!: Table<Marina, string>;
  residences!: Table<Residence, string>;
  gatherings!: Table<HostedGathering, string>;
  charterBookings!: Table<any, string>;
  neighborhoods!: Table<any, string>;
  properties!: Table<any, string>;
  narrativeArcs!: Table<any, string>;
  gossipIssues!: Table<any, string>;
  collectionItems!: Table<any, string>;

  // Phase 8
  relationships!: Table<any, string>;
  relationshipEvents!: Table<any, string>;
  giftItems!: Table<any, string>;
  giftsSent!: Table<any, string>;

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

    this.version(2).stores({
      yachts: 'hullId, status, charterAvailable',
      yachtVoyages: 'id, hullId, arrivedAt',
      marinas: 'id, prestigeTier',
      charterBookings: 'id, hullId, startDate',
      neighborhoods: 'id, prestigeTier, region',
      properties: 'id, neighborhoodId, ownerType, ownerId, askingPriceUSD',
      narrativeArcs: 'id, status',
      gossipIssues: 'id, personaId, expiresAt',
      collectionItems: 'id, category, acquiredAt'
    });

    this.version(3).stores({
      apiUsage: 'id, timestamp, endpoint'
    });

    this.version(4).stores({
      resorts: 'id, locationICAO, region, tier, brand',
      resortBookings: 'id, resortId, checkInAt, checkOutAt'
    });

    this.version(5).stores({
      player: 'id'
    });

    this.version(6).stores({
      personas: 'id'
    });

    this.version(7).stores({
      pets: 'id, ownerId'
    });

    this.version(8).stores({
      relationships: 'id, participantA, participantB, status, lastInteractionAt',
      relationshipEvents: 'id, relationshipId, type, at',
      giftItems: 'id, category, basePrice',
      giftsSent: 'id, fromId, toId, sentAt'
    });

    this.version(9).stores({
      yachts: 'id, status, owned, currentMarinaId',
      yachtVoyages: 'id, yachtId, arrivedAt, departedAt',
      marinas: 'id, basin, nearestAirportICAO',
      residences: 'id, type, city, owned, isPrimary',
      gatherings: 'id, residenceId, at'
    });
  }
}

export const db = new JetstreamDB();
