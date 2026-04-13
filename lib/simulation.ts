import { db } from './db';
import { useStore } from '../app/lib/store';
import { calculateDistanceNM, computeGreatCirclePoints } from '../app/lib/math';
import { detectEventAttendance } from '../app/lib/events';
import { FLIGHT_COSTS } from './constants';
import { Aircraft } from '../types';

export function calculateFlightBriefing(aircraft: Aircraft, origin: { lat: number, lng: number }, destination: { lat: number, lng: number }) {
    const distanceNM = calculateDistanceNM(origin.lat, origin.lng, destination.lat, destination.lng);
    const durationHours = distanceNM / aircraft.speedKnots;
    
    // Cost breakdown
    const fuelCost = durationHours * aircraft.fuelBurnGPH * FLIGHT_COSTS.FUEL_PRICE_PER_GALLON;
    const crewCost = durationHours * FLIGHT_COSTS.CREW_HOURLY;
    const wearTear = durationHours * FLIGHT_COSTS.WEAR_AND_TEAR_HOURLY;
    const totalCost = fuelCost + crewCost + wearTear + FLIGHT_COSTS.NAV_FEES_FLAT + FLIGHT_COSTS.FBO_FEES_FLAT;

    // 64-point great circle
    const arc = computeGreatCirclePoints(origin.lat, origin.lng, destination.lat, destination.lng, 64);
    const waypoints = arc.map(pt => ({ lng: pt[0], lat: pt[1] }));

    return {
        distanceNM,
        durationHours,
        totalCost,
        waypoints,
        breakdown: { fuelCost, crewCost, wearTear }
    };
}

export async function launchFlight(params: {
   aircraftId: string,
   originICAO: string,
   destinationICAO: string,
   distanceNM: number,
   durationHours: number,
   cost: number,
   waypoints: { lat: number, lng: number }[],
   passengers: string[],
   purpose: any
}) {
   const now = useStore.getState().getNow();
   const durationMs = params.durationHours * 60 * 60 * 1000;
   const estimatedArrivalAt = now + durationMs;
   
   let newFlightId = '';

   await db.transaction('rw', [db.aircraft, db.flights, db.player, db.transactions], async () => {
       const flightId = crypto.randomUUID();
       newFlightId = flightId;
       
       const aircraft = await db.aircraft.get(params.aircraftId);
       const player = await db.player.get('player');
       
       if (!aircraft) throw new Error(`Missing aircraft asset (${params.aircraftId})`);
       if (!player) throw new Error("Player data not found");
       if (player.netWorth < params.cost) throw new Error("Insufficient funds for dispatch");
       
       await db.flights.add({
           id: flightId,
           tailNumber: aircraft.tailNumber,
           originICAO: params.originICAO,
           destinationICAO: params.destinationICAO,
           departedAt: now,
           estimatedArrivalAt,
           arrivedAt: null,
           distanceNM: params.distanceNM,
           cruiseSpeedKTS: aircraft.speedKnots,
           burnGPH: aircraft.fuelBurnGPH,
           costUSD: params.cost,
           waypoints: params.waypoints,
           passengers: [],
           purpose: params.purpose
       });
       
       await db.aircraft.update(params.aircraftId, {
           status: 'in_transit',
           currentFlightID: flightId
       });
       
       await db.player.update('player', {
           netWorth: player.netWorth - params.cost
       });
       
       await db.transactions.add({
           id: crypto.randomUUID(),
           occurredAt: new Date(now).toISOString(),
           type: 'flight_cost',
           amount: params.cost,
           description: `Flight ${aircraft.tailNumber} to ${params.destinationICAO}`
       });
   });

   return newFlightId;
}

export async function resolveArrivals() {
    const now = useStore.getState().getNow();
    
    // Find flights where arrivedAt is null AND estimatedArrivalAt <= now
    const pendingFlights = await db.flights
         .filter(f => f.arrivedAt === null && f.estimatedArrivalAt <= now)
         .toArray();
         
    for (const f of pendingFlights) {
         await db.transaction('rw', [db.aircraft, db.flights, db.player, db.notifications, db.personaState], async () => {
             // Mark flight arrived chronologically at its precise arrival time
             await db.flights.update(f.id, { arrivedAt: f.estimatedArrivalAt });
             
             // Mark aircraft parked
             const aircraft = await db.aircraft.where('tailNumber').equals(f.tailNumber).first();
             if (aircraft) {
                 const lastPoint = f.waypoints[f.waypoints.length - 1];
                 await db.aircraft.update(aircraft.tailNumber, {
                     status: 'parked',
                     currentFlightID: null,
                     currentLocationICAO: f.destinationICAO,
                     currentLocation: lastPoint ? { lat: lastPoint.lat, lng: lastPoint.lng, name: f.destinationICAO } : aircraft.currentLocation
                 });
             }
             
             await db.notifications.add({
                 id: crypto.randomUUID(),
                 createdAt: new Date(now).toISOString(),
                 readAt: null,
                 title: 'Flight Arrived',
                 body: `${f.tailNumber} has arrived at ${f.destinationICAO}.`,
                 type: 'system',
                 linkTo: `/fleet/${f.tailNumber}`
             });

             // Teleport companions automatically upon successful arrival 
             if (f.passengers && f.passengers.length > 0) {
                 for (const pid of f.passengers) {
                     if (pid === 'player') continue;
                     
                     // Upsert state implicitly creating the persona footprint if absent
                     const st = await db.personaState.where('personaId').equals(pid).first();
                     if (st) {
                         await db.personaState.update(pid, {
                             currentLocationICAO: f.destinationICAO,
                             lastFlightWithPlayer: {
                                 originICAO: f.originICAO,
                                 destinationICAO: f.destinationICAO,
                                 arrivedAt: new Date(f.estimatedArrivalAt).toISOString()
                             }
                         });
                     } else {
                         await db.personaState.add({
                             personaId: pid as any,
                             currentLocationICAO: f.destinationICAO,
                             currentFlightState: null,
                             nextPlannedFlight: null,
                             friendshipWithPlayer: 0,
                             relationshipDepth: 0,
                             lastInteractionAt: null,
                             mood: 'neutral',
                             rivalryTargets: [],
                             lastFlightWithPlayer: {
                                 originICAO: f.originICAO,
                                 destinationICAO: f.destinationICAO,
                                 arrivedAt: new Date(f.estimatedArrivalAt).toISOString()
                             }
                         });
                     }
                 }
             }
         });
    }
    if (pendingFlights.length > 0) {
        await detectEventAttendance();
    }
    
    return pendingFlights;
}
