import { db } from './db';
import { Player } from '../types';
import { STARTER_FLEET } from '../app/lib/mockData';
import { useStore } from '../app/lib/store';

const defaultPlayer: Player = {
  id: 'player',
  displayName: 'Founder',
  netWorth: 79700000000, // 79.7B
  prestigeScore: 200,
  createdAt: new Date().toISOString(),
  homeBaseICAO: 'KATL',
  currentLocationICAO: 'KATL',
  currentResortBookingID: null,
  settings: {
    simSpeed: 1,
    mapMode: 'dark',
    showFriendsOnMap: true,
  }
};

export async function bootstrapWorld() {
  // 1. Init Player if not exists
  const player = await db.player.get('player');
  if (!player) {
    await db.player.add(defaultPlayer);
  }

  // 2. Init Starter Fleet if world is completely empty
  const aircraftCount = await db.aircraft.count();
  if (aircraftCount === 0) {
     const mappedFleet = STARTER_FLEET.map((item) => {
         return {
            id: crypto.randomUUID(),
            tailNumber: 'N' + Math.floor(100 + Math.random() * 900) + 'JS',
            modelId: item.model.toLowerCase().replace(/\s+/g, '-'),
            modelName: item.model,
            model: item.model,
            costPerNM: item.costPerNM,
            acquiredAt: new Date().toISOString(),
            purchasePrice: item.price,
            currentLocationICAO: 'KATL',
            status: 'parked',
            modules: [],
            hoursFlown: 0,
            hoursSinceLastMaintenance: 0,
            flightPhase: 'Hangar',
            currentFlightID: null,
            speedKnots: item.speedKnots,
            rangeNM: item.rangeNM,
            fuelBurnGPH: item.fuelBurnGPH,
            currentLocation: { lat: 33.64, lng: -84.42, name: 'KATL - Atlanta' },
            destination: null,
            lockedUntil: null,
            launchedAt: null,
            layoutImage: item.layoutImage || null,
            cabinConfig: Array(item.cabinSlots).fill('Empty'),
            scheduledRoutes: []
         };
     });
     if (mappedFleet.length > 0) {
         await db.aircraft.bulkPut(mappedFleet as any);
         useStore.getState().setSelectedAircraftId(mappedFleet[0].id);
     }
  }
}
