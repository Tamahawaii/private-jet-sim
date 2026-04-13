import { db } from '../db';
import { Aircraft } from '../../types';

export const aircraftRepo = {
  async getAll(): Promise<Aircraft[]> {
    return db.aircraft.toArray();
  },
  
  async getByTailNumber(tailNumber: string): Promise<Aircraft | undefined> {
    return db.aircraft.get(tailNumber);
  },

  async getActive(): Promise<Aircraft[]> {
    return db.aircraft.where('status').equals('in_transit').toArray();
  },

  async getParked(): Promise<Aircraft[]> {
    return db.aircraft.where('status').equals('parked').toArray();
  },

  async create(aircraft: Aircraft): Promise<void> {
    await db.aircraft.add(aircraft);
  },

  async update(tailNumber: string, changes: Partial<Aircraft>): Promise<void> {
    await db.aircraft.update(tailNumber, changes);
  },
  
  async bulkPut(fleet: Aircraft[]): Promise<void> {
     await db.aircraft.bulkPut(fleet);
  }
};
