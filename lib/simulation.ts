import { routes } from './routes';
import { db } from './db';
import { useStore } from '../app/lib/store';
import { calculateDistanceNM, computeGreatCirclePoints } from '../app/lib/math';
import { detectEventAttendance } from '../app/lib/events';
import { FLIGHT_COSTS } from './constants';
import { Aircraft, Flight, FlightPurpose, FlightRecap, Player } from '../types';
import { getAirport, countryName, shortCity, localTimeAt } from './flight/airports';
import { recordPlayerRelationshipEvent } from './relationships/helpers';
import { sendProactiveDM } from './social/proactiveDm';

export function calculateFlightBriefing(aircraft: Aircraft, origin: { lat: number, lng: number }, destination: { lat: number, lng: number }) {
    const distanceNM = calculateDistanceNM(origin.lat, origin.lng, destination.lat, destination.lng);
    const durationHours = distanceNM / aircraft.speedKnots;

    // Cost breakdown
    const fuelCost = durationHours * aircraft.fuelBurnGPH * FLIGHT_COSTS.FUEL_PRICE_PER_GALLON;
    const crewCost = durationHours * FLIGHT_COSTS.CREW_HOURLY;
    const wearTear = durationHours * FLIGHT_COSTS.WEAR_AND_TEAR_HOURLY;
    const totalCost = fuelCost + crewCost + wearTear + FLIGHT_COSTS.NAV_FEES_FLAT + FLIGHT_COSTS.FBO_FEES_FLAT;

    // 96-point great circle (smooth on the globe)
    const arc = computeGreatCirclePoints(origin.lat, origin.lng, destination.lat, destination.lng, 96);
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
   flightId?: string,
   aircraftId: string,
   originICAO: string,
   destinationICAO: string,
   distanceNM: number,
   durationHours: number,
   cost: number,
   waypoints: { lat: number, lng: number }[],
   passengers: string[],
   purpose: FlightPurpose | null
}) {
   const now = useStore.getState().getNow();
   const durationMs = params.durationHours * 60 * 60 * 1000;
   const estimatedArrivalAt = now + durationMs;

   let newFlightId = '';

   await db.transaction('rw', [db.aircraft, db.flights, db.player, db.transactions], async () => {
       const flightId = params.flightId || crypto.randomUUID();
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
           passengers: params.passengers,
           purpose: params.purpose,
           momentsFired: []
       });

       await db.aircraft.update(params.aircraftId, {
           status: 'in_transit',
           currentFlightID: flightId,
           flightPhase: 'Cruise'
       });

       await db.player.update('player', {
           netWorth: player.netWorth - params.cost
       });

       await db.transactions.add({
           id: crypto.randomUUID(),
           occurredAt: new Date(now).toISOString(),
           type: 'flight_cost',
           amount: params.cost,
           description: `Flight ${aircraft.tailNumber} to ${params.destinationICAO}`,
           relatedEntityId: flightId
       });
   });

   return newFlightId;
}

/** A flight with no manifest is treated as the player's own trip; deliveries never carry the player. */
export function isPlayerAboard(f: Pick<Flight, 'passengers' | 'purpose'>): boolean {
    if (f.purpose?.type === 'delivery') return false;
    return !f.passengers || f.passengers.length === 0 || f.passengers.includes('player');
}

/** Prestige + passport bookkeeping for a landed flight. Pure given its inputs. */
export async function buildArrivalRecap(f: Flight, player: Player | undefined, aircraft: Aircraft | undefined): Promise<FlightRecap> {
    const dest = getAirport(f.destinationICAO);
    const priorFlights = await db.flights.filter(x => x.id !== f.id && x.arrivedAt !== null && (x.arrivedAt as number) <= f.estimatedArrivalAt).toArray();
    const visitedIcaos = new Set<string>(priorFlights.map(x => x.destinationICAO));
    if (player?.homeBaseICAO) visitedIcaos.add(player.homeBaseICAO);
    const visitedCountries = new Set<string>();
    for (const icao of visitedIcaos) { const a = getAirport(icao); if (a) visitedCountries.add(a.country); }

    const breakdown: { label: string; points: number }[] = [];
    breakdown.push({ label: `${Math.round(f.distanceNM).toLocaleString()} NM flown`, points: 4 + Math.min(40, Math.round(f.distanceNM / 250)) });

    let purposeLabel: string | undefined;
    let purposeLink: string | undefined;
    if (f.purpose?.type === 'event' && f.purpose.targetId) {
        const ev = await db.events.get(f.purpose.targetId);
        if (ev) { purposeLabel = ev.name; purposeLink = routes.event(ev.id); breakdown.push({ label: `Arriving for ${ev.name}`, points: ev.prestigeTier * 12 }); }
    } else if (f.purpose?.type === 'resort' && f.purpose.targetId) {
        const r = await db.resorts.get(f.purpose.targetId);
        if (r) { purposeLabel = r.name; purposeLink = routes.resort(r.id); breakdown.push({ label: `Checking in at ${r.name}`, points: r.tier * 6 }); }
    }

    const companions = (f.passengers || []).filter(p => p !== 'player');
    if (companions.length > 0) breakdown.push({ label: `${companions.length} companion${companions.length > 1 ? 's' : ''} aboard`, points: Math.min(3, companions.length) * 6 });

    const newCountry = !!dest && !visitedCountries.has(dest.country);
    if (newCountry) breakdown.push({ label: `First time in ${countryName(dest!.country)}`, points: 25 });
    const firstVisit = !visitedIcaos.has(f.destinationICAO);
    if (firstVisit && !newCountry) breakdown.push({ label: `First landing at ${f.destinationICAO}`, points: 8 });

    const price = aircraft?.purchasePrice || 0;
    if (price >= 100_000_000) breakdown.push({ label: `Arriving in a ${aircraft?.model}`, points: 10 });
    else if (price >= 50_000_000) breakdown.push({ label: `Arriving in a ${aircraft?.model}`, points: 5 });
    const cabin = (aircraft?.modules || []).reduce((s, m) => s + (m.effect?.prestigeBonus || 0), 0);
    if (cabin > 0) breakdown.push({ label: 'Cabin appointments', points: cabin });

    const prestigeGained = breakdown.reduce((s, b) => s + b.points, 0);
    return {
        prestigeGained,
        breakdown,
        newCountry,
        countryName: dest ? countryName(dest.country) : 'Unknown',
        firstVisit,
        flightNumber: priorFlights.length + 1,
        companions,
        purposeLabel,
        purposeLink,
        arrivedLocalTime: dest ? localTimeAt(dest, f.estimatedArrivalAt) : '',
        hoursAloft: (f.estimatedArrivalAt - f.departedAt) / 3600000,
    };
}

export async function resolveArrivals() {
    const now = useStore.getState().getNow();

    // Find flights where arrivedAt is null AND estimatedArrivalAt <= now
    const pendingFlights = await db.flights
         .filter(f => f.arrivedAt === null && f.estimatedArrivalAt <= now)
         .toArray();

    for (const f of pendingFlights) {
         const aircraftForRecap = await db.aircraft.where('tailNumber').equals(f.tailNumber).first();
         const playerForRecap = await db.player.get('player');
         const recap = await buildArrivalRecap(f, playerForRecap, aircraftForRecap);
         const playerAboard = isPlayerAboard(f);

         await db.transaction('rw', [db.aircraft, db.flights, db.player, db.notifications, db.personaState], async () => {
             // Mark flight arrived chronologically at its precise arrival time
             await db.flights.update(f.id, { arrivedAt: f.estimatedArrivalAt, recap });

             // Mark aircraft parked
             const aircraft = await db.aircraft.where('tailNumber').equals(f.tailNumber).first();
             if (aircraft) {
                 const lastPoint = f.waypoints[f.waypoints.length - 1];
                 const destAirport = getAirport(f.destinationICAO);
                 await db.aircraft.update(aircraft.tailNumber, {
                     status: 'parked',
                     currentFlightID: null,
                     flightPhase: 'Hangar',
                     currentLocationICAO: f.destinationICAO,
                     hoursFlown: (aircraft.hoursFlown || 0) + recap.hoursAloft,
                     hoursSinceLastMaintenance: (aircraft.hoursSinceLastMaintenance || 0) + recap.hoursAloft,
                     currentLocation: lastPoint
                        ? { lat: lastPoint.lat, lng: lastPoint.lng, name: destAirport ? `${f.destinationICAO} - ${shortCity(destAirport)}` : f.destinationICAO }
                        : aircraft.currentLocation
                 });
             }

             const destAirport = getAirport(f.destinationICAO);
             await db.notifications.add({
                 id: crypto.randomUUID(),
                 createdAt: new Date(now).toISOString(),
                 readAt: null,
                 title: `Arrived in ${shortCity(destAirport, f.destinationICAO)}`,
                 body: `${f.tailNumber} is on the ground at ${f.destinationICAO}. +${recap.prestigeGained} prestige.`,
                 type: 'flight_arrival',
                 linkTo: routes.flight(f.id)
             });

             // Player location + prestige (a flight with no manifest is treated as the player's own trip)
             if (playerAboard) {
                 const player = await db.player.get('player');
                 if (player) {
                     await db.player.update('player', {
                         currentLocationICAO: f.destinationICAO,
                         prestigeScore: (player.prestigeScore || 0) + recap.prestigeGained
                     });
                 }
             }

             // Move companions to the destination
             for (const pid of recap.companions) {
                 const st = await db.personaState.where('personaId').equals(pid).first();
                 const coords = destAirport ? { lat: destAirport.lat, lng: destAirport.lng, name: destAirport.name } : undefined;
                 const lastFlightWithPlayer = { originICAO: f.originICAO, destinationICAO: f.destinationICAO, arrivedAt: new Date(f.estimatedArrivalAt).toISOString() };
                 if (st) {
                     await db.personaState.update(pid, { currentLocationICAO: f.destinationICAO, currentCoords: coords ?? st.currentCoords, lastFlightWithPlayer });
                 } else {
                     await db.personaState.add({
                         personaId: pid,
                         currentLocationICAO: f.destinationICAO,
                         currentCoords: coords,
                         currentFlightState: null,
                         nextPlannedFlight: null,
                         friendshipWithPlayer: 0,
                         relationshipDepth: 0,
                         lastInteractionAt: null,
                         mood: 'neutral',
                         rivalryTargets: [],
                         lastFlightWithPlayer
                     });
                 }
             }
         });

         // Relationship ripple for companions (outside the transaction; separate tables)
         for (const pid of recap.companions) {
             try {
                 await recordPlayerRelationshipEvent(pid, 'shared-flight', `Flew together ${f.originICAO} → ${f.destinationICAO}`, { flightId: f.id }, undefined, new Date(f.estimatedArrivalAt).toISOString());
             } catch (e) { console.warn('relationship event failed', e); }
         }
    }

    // Outside transaction explicitly: friends react to the arrival
    for (const f of pendingFlights) {
        if (!isPlayerAboard(f)) continue;
        const destAirport = getAirport(f.destinationICAO);
        const destCity = shortCity(destAirport, f.destinationICAO);
        const companions = (f.passengers || []).filter(p => p !== 'player');

        // 1) A companion who flew with you texts about the trip
        let reactor: string | undefined = companions.length > 0 ? companions[Math.floor(Math.random() * companions.length)] : undefined;
        let situation = '';
        if (reactor) {
            situation = `You just landed in ${destCity} (${f.destinationICAO}) on the player's private jet after a ${Math.round((f.estimatedArrivalAt - f.departedAt) / 3600000)}-hour flight from ${f.originICAO}. Text them about the trip or what to do first in ${destCity}.`;
        } else {
            // 2) Or someone already in that city bumps into you (25%)
            const collocated = await db.personaState.where('currentLocationICAO').equals(f.destinationICAO).toArray();
            const eligible = collocated.filter(p => !p.lastDmSentAt || (now - new Date(p.lastDmSentAt).getTime() > 24 * 60 * 60 * 1000));
            if (eligible.length > 0 && Math.random() < 0.35) {
                reactor = eligible[Math.floor(Math.random() * eligible.length)].personaId;
                situation = `You are in ${destCity} and just heard the player's jet (${f.tailNumber}) landed at ${f.destinationICAO}. Text them — surprised they're in town — and suggest meeting up somewhere specific in ${destCity}.`;
            }
        }
        if (reactor && situation) {
            const persona = await db.personas.get(reactor);
            const first = persona?.displayName.split(' ')[0] || 'Someone';
            sendProactiveDM(reactor, situation, {
                trigger: 'flight_arrival',
                relatedId: f.id,
                fallback: companions.includes(reactor) ? `That flight was too easy. Where are we going first in ${destCity}?` : `Wait — you're in ${destCity}?? I'm here till Sunday. Drinks tonight.`,
                toast: `${first} texted you.`,
            }).then(async (msg) => {
                if (msg) await db.flights.update(f.id, { recap: { ...(await db.flights.get(f.id))?.recap as FlightRecap, reactionPersonaId: reactor } });
            }).catch(console.error);
        }
    }

    if (pendingFlights.length > 0) {
        await detectEventAttendance();
    }

    return pendingFlights;
}
