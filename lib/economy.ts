import { db } from './db';
import { playerRepo } from './repositories/player';
import { transactionRepo } from './repositories/transactions';
import { Aircraft, Flight } from '../types';
import { getAirport } from './flight/airports';
import { useStore } from '../app/lib/store';
import { calculateDistanceNM, computeGreatCirclePoints } from '../app/lib/math';

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
    if (!player) return false;
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
       if (!player) throw new Error("Environment not initialized");

       // 1. Deduct Net Worth
       await playerRepo.update({ netWorth: player.netWorth - totalCost });

       // 2. Transaction Log
       await transactionRepo.create({
          type: 'aircraft_purchase',
          amount: -totalCost,
          description: `Purchased ${catalogItem.model} (incl. 1% closing costs)`
       });

       // 3. Create Aircraft in "in_transit" — ferried from the factory (Boeing Field) to the player's home base
       const factory = { lat: 47.528, lng: -122.301 };
       const homeAirport = getAirport(player.homeBaseICAO) || getAirport('PHNL');
       const home = homeAirport ? { lat: homeAirport.lat, lng: homeAirport.lng } : { lat: 21.328, lng: -157.922 };
       const ferryNM = calculateDistanceNM(factory.lat, factory.lng, home.lat, home.lng);
       const ferryWaypoints = computeGreatCirclePoints(factory.lat, factory.lng, home.lat, home.lng, 64).map(p => ({ lng: p[0], lat: p[1] }));
       // Ferry flight takes its real duration, plus 48h of factory prep — you can watch it come in on the map.
       const deliveryMs = 48 * 60 * 60 * 1000 + (ferryNM / Math.max(150, catalogItem.speedKnots)) * 3600 * 1000;
       const simNow = useStore.getState().getNow();
       const arrivalMs = simNow + deliveryMs;

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
          currentLocation: { lat: factory.lat, lng: factory.lng, name: 'KBFI - Factory' }, // Boeing Field mapping
          destination: { lat: home.lat, lng: home.lng, name: player.homeBaseICAO }, // Home Base 
          launchedAt: simNow,
          lockedUntil: arrivalMs,
          currentFlightID: crypto.randomUUID(),
          layoutImage: catalogItem.layoutImage || null
       };

       await db.aircraft.add(newCraft);

       // 4. Create Delivery Flight Tracking
       const deliveryFlight: Flight = {
          id: newCraft.currentFlightID!,
          tailNumber,
          originICAO: 'KBFI',
          destinationICAO: player.homeBaseICAO,
          departedAt: simNow,
          estimatedArrivalAt: arrivalMs,
          arrivedAt: null,
          distanceNM: ferryNM,
          cruiseSpeedKTS: newCraft.speedKnots,
          burnGPH: newCraft.fuelBurnGPH,
          costUSD: 0,
          waypoints: ferryWaypoints,
          passengers: [],
          purpose: { type: 'delivery', label: 'Factory delivery' }
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
        if (!player) throw new Error("Environment not initialized");

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
