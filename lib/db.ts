import Dexie, { Table } from 'dexie';
import {
  Player, Aircraft, Flight, Persona, PersonaState, DMThread, GroupChat,
  BillionaireEvent, EventAttendance, Resort, ResortBooking, Transaction, Notification,
  ApiUsageRecord
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

  // Stubbed (Phase 5.5, 7, etc.)
  yachts!: Table<any, string>;
  yachtVoyages!: Table<any, string>;
  marinas!: Table<any, string>;
  charterBookings!: Table<any, string>;
  neighborhoods!: Table<any, string>;
  properties!: Table<any, string>;
  narrativeArcs!: Table<any, string>;
  gossipIssues!: Table<any, string>;
  collectionItems!: Table<any, string>;

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
  }
}

export const db = new JetstreamDB();
