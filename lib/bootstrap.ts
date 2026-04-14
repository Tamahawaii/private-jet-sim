import { db } from './db';
import { Player } from '../types';
import { STARTER_FLEET } from '../app/lib/mockData';
import { useStore } from '../app/lib/store';
import eventsData from '../data/events.json';
import personasData from '../data/personas.json';
import airportsData from '../data/airports.json';
import resortsData from '../data/resorts.json';
import playerData from '../data/player.json';
import petsData from '../data/pets.json';
import giftsData from '../data/gifts.json';
import relationshipsData from '../data/persona-relationships.json';
import { seedPlayerRelationship } from './relationships/helpers';

export async function bootstrapWorld() {
  // 1. Init Player if not exists or merge canonical updates
  const player = await db.player.get('player');
  const canonicalPlayer = playerData as any;
  const now = new Date().toISOString();

  if (!player) {
    const newPlayer = {
       ...canonicalPlayer,
       prestigeScore: 200,
       createdAt: now,
       homeBaseICAO: canonicalPlayer.homeBase,
       currentLocationICAO: canonicalPlayer.homeBase,
       settings: { simSpeed: 1, mapMode: 'dark', showFriendsOnMap: true }
    };
    await db.player.add(newPlayer);
  } else {
    // Phase 6 Commit A: Idempotent migration mapping 
    const updatedPlayer = {
       ...player, // spread old first to retain any unknown runtime keys temporarily if strictly needed, though we overwrite manually below
       ...canonicalPlayer,
       // PRESERVE specifically:
       netWorth: player.netWorth,
       prestigeScore: player.prestigeScore || 200,
       createdAt: player.createdAt || now,
       currentLocationICAO: player.currentLocationICAO === 'KATL' ? 'PHNL' : player.currentLocationICAO,
       homeBaseICAO: 'PHNL', 
       settings: player.settings || { simSpeed: 1, mapMode: 'dark', showFriendsOnMap: true },
       relationshipPreferences: player.relationshipPreferences
    };
    
    // Clean phantom legacy field explicitly
    if ('currentResortBookingID' in updatedPlayer) {
       delete (updatedPlayer as any).currentResortBookingID;
    }
    await db.player.put(updatedPlayer);
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

  // 2.5 Init Events if missing
  const eventCount = await db.events.count();
  if (eventCount === 0) {
     try {
       if (eventsData && eventsData.length > 0) {
         await db.events.bulkPut(eventsData as any);
       }
     } catch (e) {
       console.error("Failed to seed events.json:", e);
     }
  } else if (eventsData && eventCount < eventsData.length) {
     // Top up missing events
     const existingIds = new Set((await db.events.toArray()).map(e => e.id));
     const missing = (eventsData as any[]).filter(e => !existingIds.has(e.id));
     if (missing.length > 0) {
         console.log(`[BOOTSTRAP] Topping up ${missing.length} missing events.`);
         await db.events.bulkPut(missing);
     }
  }

  // 3. Patch any existing aircraft with corrupted currentLocation
  const existingFleet = await db.aircraft.toArray();
  for (const ac of existingFleet) {
     const coords = ac.currentLocation as any;
     const isBad = !coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number' || isNaN(coords.lat) || isNaN(coords.lng) || !isFinite(coords.lat) || !isFinite(coords.lng);
     
     if (isBad && ac.currentLocationICAO) {
         const apt = airportsData.find((a: any) => a.icao === ac.currentLocationICAO);
         if (apt && typeof apt.lat === 'number' && typeof apt.lng === 'number' && !isNaN(apt.lat) && !isNaN(apt.lng)) {
             await db.aircraft.update(ac.id, { currentLocation: { lat: apt.lat, lng: apt.lng, name: apt.name }});
         } else {
             // Best effort default for PHNL
             if (ac.currentLocationICAO === 'PHNL') await db.aircraft.update(ac.id, { currentLocation: { lat: 21.328, lng: -157.922, name: "PHNL - Honolulu" } });
         }
     }
  }

  // 4. Resolve any offline flight arrivals that occurred while the app was closed
  const { resolveArrivals } = require('./simulation');
  await resolveArrivals();
  
  // 5. Detect offline event occurrences
  const { detectEventAttendance } = require('../app/lib/events');
  await detectEventAttendance();

  // 6. Sync Canonical Persona Definitions & Init State
  if (personasData && personasData.length > 0) {
     try {
       // Deeply replace canonical definitions unconditionally
       await db.personas.bulkPut(personasData as any);
       
       // Only build state containers for missing personas
       const existingStates = new Set((await db.personaState.toArray()).map(s => s.personaId));
       const missingPersonas = personasData.filter((p: any) => !existingStates.has(p.id));

       if (missingPersonas.length > 0) {
           const states = missingPersonas.map((p: any) => {
               let spawnIcao = 'PHNL';
               if (Math.random() < 0.3) {
                   const preferred = (resortsData as any[]).filter(r => r.preferredBy && r.preferredBy.includes(p.id));
                   if (preferred.length > 0) {
                       spawnIcao = preferred[0].locationICAO;
                   }
               }

               const hq = airportsData.find((a: any) => a.icao === spawnIcao) || airportsData.find((a: any) => a.icao === 'PHNL');
               const coords = hq && typeof hq.lat === 'number' && !isNaN(hq.lat) && typeof hq.lng === 'number' && !isNaN(hq.lng) 
                 ? { lat: hq.lat, lng: hq.lng, name: hq.name } 
                 : undefined;
                 
               return {
                   personaId: p.id,
                   currentLocationICAO: hq ? hq.icao : 'PHNL',
                   currentCoords: coords,
                   currentFlightState: null,
                   nextPlannedFlight: null,
                   friendshipWithPlayer: 0,
                   relationshipDepth: 0,
                   lastInteractionAt: null,
                   mood: "neutral",
                   rivalryTargets: []
               };
           });
           await db.personaState.bulkPut(states as any);
       }
     } catch (e) {
       console.error("Failed to seed personas:", e);
     }
  }

  // 7. Init Resorts (Phase 5)
  const resortCount = await db.resorts.count();
  if (resortCount === 0) {
     try {
       if (resortsData && resortsData.length > 0) {
         await db.resorts.bulkAdd(resortsData as any[]);
       }
     } catch (e) {
       console.error("Failed to seed resorts:", e);
     }
  } else if (resortsData && resortCount < resortsData.length) {
     // Safe top-up using bulkAdd explicitly avoiding overwrites
     const existingIds = new Set((await db.resorts.toArray()).map(r => r.id));
     const missing = (resortsData as any[]).filter(r => !existingIds.has(r.id));
     if (missing.length > 0) {
         console.log(`[BOOTSTRAP] Topping up ${missing.length} missing resorts via bulkAdd.`);
         await db.resorts.bulkAdd(missing);
     }
  }

  // 8. Init Pets (Phase 6C)
  try {
     const existingPetIds = new Set((await db.pets.toArray()).map(p => p.id));
     const missingPets = (petsData as any[]).filter((p: any) => !existingPetIds.has(p.id));
     if (missingPets.length > 0) {
         console.log(`[BOOTSTRAP] Seeding ${missingPets.length} missing pets.`);
         await db.pets.bulkAdd(missingPets);
     }
  } catch (e) {
     console.error("Failed to seed pets:", e);
  }

  // 9. Init Gifts and Relationships (Phase 8)
  try {
     const giftCount = await db.giftItems.count();
     if (giftCount === 0 && giftsData && giftsData.length > 0) {
        console.log(`[BOOTSTRAP] Seeding ${giftsData.length} gift items.`);
        await db.giftItems.bulkAdd(giftsData as any[]);
     }
     
     const relCount = await db.relationships.count();
     if (relCount === 0 && relationshipsData && relationshipsData.length > 0) {
        console.log(`[BOOTSTRAP] Seeding canonical relationships.`);
        await db.relationships.bulkAdd(relationshipsData as any[]);
     }

     // Ensure all personas have player relationships
     const allPersonas = await db.personas.toArray();
     for (const p of allPersonas) {
        await seedPlayerRelationship(p.id);
     }
  } catch (e) {
     console.error("Failed to seed relationships/gifts:", e);
  }
}
