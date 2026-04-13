import { db } from '../db';
import { Flight } from '../../types';

export const flightRepo = {
  get: async (id: string): Promise<Flight | undefined> => {
    return await db.flights.get(id);
  },
  
  getAllActive: async (): Promise<Flight[]> => {
    return await db.flights.filter(f => f.arrivedAt === null).toArray();
  },

  getAllByTailNumber: async (tailNumber: string): Promise<Flight[]> => {
    return await db.flights
      .where('tailNumber')
      .equals(tailNumber)
      .reverse()
      .sortBy('departedAt');
  },

  getAll: async (): Promise<Flight[]> => {
    return await db.flights.toArray();
  }
};
