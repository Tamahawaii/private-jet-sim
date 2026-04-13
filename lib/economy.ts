import { db } from './db';
import { playerRepo } from './repositories/player';
import { transactionRepo } from './repositories/transactions';
import { Aircraft, Flight } from '../types';

export const Economy = {
  generateUniqueTailNumber: async (): Promise<string> => {
    let unique = false;
    let tailNumber = '';
    const fleet = await db.aircraft.toArray();
    const existingTails = new Set(fleet.map((a: Aircraft) => a.tailNumber));
    while (!unique) {
       const digits = Math.floor(100 + Math.random() * 900);
       tailNumber = `N${digits}${fleet.length < 500 ? 'JS' : 'XP'}`;
       if (!existingTails.has(tailNumber)) unique = true;
    }
    return tailNumber;
  },

  canAfford: async (amount: number): Promise<boolean> => {
    const player = await playerRepo.get();
    return player.netWorth >= amount;
  },

  purchaseAircraft: async (catalogItem: any): Promise<Aircraft | null> => {
    const cost = catalogItem.price;
    const closingCost = Math.round(cost * 0.01);
    const totalCost = cost + closingCost;

    if (!(await Economy.canAfford(totalCost))) return null;

    return await db.transaction('rw', [db.aircraft, db.transactions, db.player, db.flights], async () => {
       const tailNumber = await Economy.generateUniqueTailNumber();
       const player = await playerRepo.get();

       // 1. Deduct Net Worth
       await playerRepo.update({ netWorth: player.netWorth - totalCost });

       // 2. Transaction Log
       await transactionRepo.create({
          type: 'aircraft_purchase',
          amount: -totalCost,
          description: `Purchased ${catalogItem.model} (incl. 1% closing costs)`
       });

       // 3. Create Aircraft in "in_transit"
       const deliveryMs = 7 * 24 * 60 * 60 * 1000; // 7 days delivery 
       const arrivalMs = Date.now() + deliveryMs;

       const newCraft: Aircraft = {
          id: crypto.randomUUID(),
          modelId: catalogItem.model.toLowerCase().replace(/\s+/g, '-'),
          modelName: catalogItem.model,
          model: catalogItem.model,
          tailNumber,
          acquiredAt: new Date().toISOString(),
          purchasePrice: cost,
          costPerNM: catalogItem.costPerNM,
          speedKnots: catalogItem.speedKnots,
          fuelBurnGPH: catalogItem.fuelBurnGPH,
          rangeNM: catalogItem.rangeNM,
          status: 'in_transit',
          flightPhase: 'Cruise',
          currentLocationICAO: 'FACTORY',
          hoursFlown: 0,
          hoursSinceLastMaintenance: 0,
          modules: [],
          cabinConfig: Array(catalogItem.cabinSlots || 0).fill('Empty'),
          scheduledRoutes: [],
          // MapEngine compat traits
          currentLocation: { lat: 47.528, lng: -122.301, name: 'BFI - Factory' }, // Boeing Field mapping
          destination: { lat: 21.328, lng: -157.922, name: player.homeBaseICAO }, // Home Base 
          launchedAt: Date.now(),
          lockedUntil: arrivalMs,
          currentFlightID: crypto.randomUUID(),
          layoutImage: catalogItem.layoutImage || null
       };

       await db.aircraft.add(newCraft);

       // 4. Create Delivery Flight Tracking
       const deliveryFlight: Flight = {
          id: newCraft.currentFlightID!,
          tailNumber,
          originICAO: 'FACTORY',
          destinationICAO: player.homeBaseICAO,
          departedAt: new Date().toISOString(),
          estimatedArrivalAt: new Date(arrivalMs).toISOString(),
          arrivedAt: null,
          distanceNM: 0,
          cruiseSpeedKTS: newCraft.speedKnots,
          burnGPH: newCraft.fuelBurnGPH,
          costUSD: 0,
          waypoints: [],
          passengers: [],
          purpose: { type: 'delivery' }
       };

       await db.flights.add(deliveryFlight);

       return newCraft;
    });
  },

  sellAircraft: async (aircraftId: string): Promise<number | null> => {
     return await db.transaction('rw', [db.aircraft, db.transactions, db.player], async () => {
        const aircraft = await db.aircraft.get(aircraftId);
        if (!aircraft) return null;

        const sellPrice = Math.round(aircraft.purchasePrice * 0.80);
        const player = await playerRepo.get();

        // Appreciate Net Worth
        await playerRepo.update({ netWorth: player.netWorth + sellPrice });

        // Sell Trace
        await transactionRepo.create({
           type: 'aircraft_sale',
           amount: sellPrice,
           description: `Sold ${aircraft.model} ${aircraft.tailNumber}`
        });

        await db.aircraft.delete(aircraftId);
        return sellPrice;
     });
  }
};
