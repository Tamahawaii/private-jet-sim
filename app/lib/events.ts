import { BillionaireEvent } from '../../types';
import { db } from '../../lib/db';
import { calculateDistanceNM } from './math';
import { useStore } from './store';

/**
 * Returns the exact event object but with its start/end dates shifted to
 * match the relevant year in simulation time (which could be 2026, 2027, etc.).
 */
export function getEventNextOccurrence(event: BillionaireEvent, simNow: number): BillionaireEvent {
    // Convert current sim epoch to Date
    const simDate = new Date(simNow);
    const simYear = simDate.getUTCFullYear();
    
    // Parse the original 2026 dates
    const anchorStartDate = new Date(event.startDate);
    const anchorEndDate = new Date(event.endDate);
    const durationMs = anchorEndDate.getTime() - anchorStartDate.getTime();
    
    // Create candidate for the current simulation year
    const candidateStartDate = new Date(anchorStartDate);
    candidateStartDate.setUTCFullYear(simYear);
    const candidateEndDate = new Date(candidateStartDate.getTime() + durationMs);
    
    // If the candidate end date has already passed in sim time, shift to next year
    if (candidateEndDate.getTime() < simNow) {
        candidateStartDate.setUTCFullYear(simYear + 1);
    }
    
    // Return a pristine copy of the event with updated date bounds
    const shiftedEvent = { ...event };
    shiftedEvent.startDate = candidateStartDate.toISOString();
    shiftedEvent.endDate = new Date(candidateStartDate.getTime() + durationMs).toISOString();

    return shiftedEvent;
}

export async function detectEventAttendance() {
    const simNow = useStore.getState().getNow();
    
    // Get all parked aircraft
    const parkedFleet = await db.aircraft.filter(a => a.status === 'parked' && a.currentLocation !== undefined).toArray();
    if (parkedFleet.length === 0) return;

    const rawEvents = await db.events.toArray();
    const activeEvents = rawEvents.map(e => getEventNextOccurrence(e, simNow)).filter(e => {
        const start = new Date(e.startDate).getTime();
        const end = new Date(e.endDate).getTime();
        return simNow >= start && simNow <= end; // Event is happening NOW
    });

    if (activeEvents.length === 0) return;

    let airports: any[] = [];
    try {
        const res = await fetch('/airports.json');
        airports = await res.json();
    } catch (e) {
        console.error('Failed to load airports for attendance detection', e);
        return;
    }

    for (const aircraft of parkedFleet) {
        if (!aircraft.currentLocation) continue;
        
        for (const event of activeEvents) {
            const eventAirport = airports.find((a: any) => a.icao === event.locationICAO);
            
            if (eventAirport) {
                const dist = calculateDistanceNM(aircraft.currentLocation.lat, aircraft.currentLocation.lng, eventAirport.lat, eventAirport.lng);
                
                if (dist <= 100) {
                    const existing = await db.eventAttendance.filter(ea => ea.eventId === event.id && ea.aircraftTailNumber === aircraft.tailNumber).first();
                    if (!existing) {
                        await db.eventAttendance.add({
                            id: crypto.randomUUID(),
                            eventId: event.id,
                            attendedAt: new Date(simNow).toISOString(),
                            aircraftTailNumber: aircraft.tailNumber,
                            leftAt: null,
                            prestigeGained: null
                        });
                        console.log(`[ATTENDANCE] Player attended ${event.name} via ${aircraft.tailNumber}`);
                    }
                }
            }
        }
    }
}
