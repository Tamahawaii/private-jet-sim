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
     const startingSetup = [
        { id: "embraer-phenom-300", tail: "N100JS", icao: "PHNL", lat: 21.328, lng: -157.922, name: "PHNL - Honolulu" },
        { id: "cessna-citation-x", tail: "N125JS", icao: "PHNL", lat: 21.328, lng: -157.922, name: "PHNL - Honolulu" },
        { id: "dassault-falcon-900", tail: "N150JS", icao: "KJAC", lat: 43.607, lng: -110.737, name: "KJAC - Jackson Hole" },
        { id: "bombardier-global-8000", tail: "N302XP", icao: "KDAL", lat: 32.847, lng: -96.851, name: "KDAL - Dallas Love" },
        { id: "boeing-bbj-787", tail: "N807XP", icao: "SULS", lat: -34.853, lng: -55.094, name: "SULS - Punta del Este" }
     ];

     const fullCatalog = require('../app/lib/mockData').SHOP_CATALOG;
     const mappedFleet = startingSetup.map((setup) => {
         const item = fullCatalog.find((c: any) => c.id === setup.id);
         if (!item) return null;
         return {
            id: crypto.randomUUID(),
            tailNumber: setup.tail,
            modelId: item.id,
            modelName: item.model,
            model: item.model,
            costPerNM: item.costPerNM,
            acquiredAt: new Date().toISOString(),
            purchasePrice: item.price,
            currentLocationICAO: setup.icao,
            status: 'parked',
            modules: [],
            hoursFlown: 0,
            hoursSinceLastMaintenance: 0,
            flightPhase: 'Hangar',
            currentFlightID: null,
            speedKnots: item.speedKnots,
            rangeNM: item.rangeNM,
            fuelBurnGPH: item.fuelBurnGPH,
            currentLocation: { lat: setup.lat, lng: setup.lng, name: setup.name },
            destination: null,
            lockedUntil: null,
            launchedAt: null,
            layoutImage: item.layoutImage || null,
            cabinConfig: Array(item.cabinSlots).fill('Empty'),
            scheduledRoutes: []
         };
     }).filter(Boolean);

     if (mappedFleet.length > 0) {
         await db.aircraft.bulkPut(mappedFleet as any);
         useStore.getState().setSelectedAircraftId((mappedFleet[0] as any).id);
     }
  }
}
