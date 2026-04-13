import Dexie, { Table } from 'dexie';
import {
  Player, Aircraft, Flight, Persona, PersonaState, DMThread, GroupChat,
  BillionaireEvent, EventAttendance, Resort, ResortBooking, Transaction, Notification
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
