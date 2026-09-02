import { db } from '../../lib/db';
import { useStore } from './store';
import { sendProactiveDM } from '../../lib/social/proactiveDm';

export async function getCurrentResortBooking() {
    const nowMs = useStore.getState().getNow();
    
    return await db.resortBookings
        .toCollection()
        .filter(b => {
             if (!b.checkOutAt) return false;
             const inMs = new Date(b.checkInAt).getTime();
             const outMs = new Date(b.checkOutAt).getTime();
             return nowMs >= inMs && nowMs < outMs;
        })
        .first();
}

export async function bookResortAndFly(params: {
    resortId: string;
    checkInMs: number;
    nights: number;
    nightlyRate: number;
    // Flight payload
    aircraftId: string;
    originICAO: string;
    destinationICAO: string;
    distanceNM: number;
    durationHours: number;
    flightCost: number;
    waypoints: { lat: number, lng: number }[];
}) {
    const now = params.checkInMs;
    const checkOutMs = now + (params.nights * 24 * 60 * 60 * 1000);
    const durationMs = params.durationHours * 60 * 60 * 1000;
    const estimatedArrivalAt = now + durationMs;
    
    const resortCost = params.nightlyRate * params.nights;
    const totalCost = params.flightCost + resortCost;
    
    let newFlightId = '';

    await db.transaction('rw', [db.aircraft, db.flights, db.player, db.transactions, db.resortBookings], async () => {
        const player = await db.player.get('player');
        const aircraft = await db.aircraft.get(params.aircraftId);
        
        if (!player) throw new Error("Player data not found");
        if (!aircraft) throw new Error("Aircraft missing");
        if (player.netWorth < totalCost) throw new Error("Insufficient funds for booking and flight");

        // 1. Create Flight
        newFlightId = crypto.randomUUID();
        await db.flights.add({
            id: newFlightId,
            tailNumber: aircraft.tailNumber,
            originICAO: params.originICAO,
            destinationICAO: params.destinationICAO,
            departedAt: now,
            estimatedArrivalAt,
            arrivedAt: null,
            distanceNM: params.distanceNM,
            cruiseSpeedKTS: aircraft.speedKnots,
            burnGPH: aircraft.fuelBurnGPH,
            costUSD: params.flightCost,
            waypoints: params.waypoints,
            passengers: ['player'],
            purpose: { type: 'resort', targetId: params.resortId },
            momentsFired: []
        });

        await db.aircraft.update(params.aircraftId, {
            status: 'in_transit',
            currentFlightID: newFlightId
        });

        // 2. Create Resort Booking
        const bookingId = crypto.randomUUID();
        await db.resortBookings.add({
            id: bookingId,
            resortId: params.resortId,
            checkInAt: new Date(now).toISOString(),
            checkOutAt: new Date(checkOutMs).toISOString(),
            defaultNights: params.nights,
            extendedNights: 0,
            totalCharged: resortCost,
            experiencesPurchased: []
        });

        // 3. Deduct total money exactly
        await db.player.update('player', {
            netWorth: player.netWorth - totalCost
        });

        // 4. Log transactions
        await db.transactions.bulkAdd([
            {
                id: crypto.randomUUID(),
                occurredAt: new Date(now).toISOString(),
                type: 'flight_cost',
                amount: params.flightCost,
                description: `Flight ${aircraft.tailNumber} to ${params.destinationICAO}`
            },
            {
                id: crypto.randomUUID(),
                occurredAt: new Date(now).toISOString(),
                type: 'resort_booking',
                amount: resortCost,
                description: `Booking check-in at ${params.resortId} for ${params.nights} nights`
            }
        ]);
    });

    return newFlightId;
}

export async function extendStay(bookingId: string, nightlyRate: number, additionalNights: number) {
    const now = useStore.getState().getNow();
    const additionalCost = nightlyRate * additionalNights;

    await db.transaction('rw', [db.resortBookings, db.player, db.transactions], async () => {
        const player = await db.player.get('player');
        const booking = await db.resortBookings.get(bookingId);
        
        if (!player) throw new Error("Player missing");
        if (!booking || !booking.checkOutAt) throw new Error("Booking missing or invalid");
        if (player.netWorth < additionalCost) throw new Error("Insufficient funds to extend");

        const oldOutMs = new Date(booking.checkOutAt).getTime();
        const newOutMs = oldOutMs + (additionalNights * 24 * 60 * 60 * 1000);

        await db.resortBookings.update(bookingId, {
            checkOutAt: new Date(newOutMs).toISOString(),
            extendedNights: booking.extendedNights + additionalNights,
            totalCharged: booking.totalCharged + additionalCost
        });

        await db.player.update('player', {
            netWorth: player.netWorth - additionalCost
        });

        await db.transactions.add({
            id: crypto.randomUUID(),
            occurredAt: new Date(now).toISOString(),
            type: 'resort_booking',
            amount: additionalCost,
            description: `Extended stay at resort by ${additionalNights} nights`,
            relatedEntityId: bookingId
        });
    });
}

export async function purchaseExperience(resortId: string, bookingId: string, experienceId: string, price: number): Promise<boolean> {
    const now = useStore.getState().getNow();

    try {
        await db.transaction('rw', [db.resortBookings, db.player, db.transactions, db.personaState], async () => {
            const player = await db.player.get('player');
            const booking = await db.resortBookings.get(bookingId);
            
            if (!player) throw new Error("Missing player");
            if (!booking) throw new Error("Missing booking");
            if (player.netWorth < price) throw new Error("Insufficient funds");

            await db.resortBookings.update(bookingId, {
                experiencesPurchased: [...booking.experiencesPurchased, experienceId],
                totalCharged: booking.totalCharged + price
            });

            await db.player.update('player', {
                netWorth: player.netWorth - price
            });

            await db.transactions.add({
                id: crypto.randomUUID(),
                occurredAt: new Date(now).toISOString(),
                type: 'resort_experience',
                amount: price,
                description: `Purchased signature experience`,
                relatedEntityId: experienceId
            });
        });

        // Execute proactive DM trigger out of transaction scope cleanly
        const resort = await db.resorts.get(resortId);
        const collocatedPersonas = await db.personaState.where('currentLocationICAO').equals(resort?.locationICAO || '').toArray();
        const eligiblePersonas = collocatedPersonas.filter(p => !p.lastDmSentAt || (now - new Date(p.lastDmSentAt).getTime() > 24 * 60 * 60 * 1000));
        
        if (eligiblePersonas.length > 0) {
            // Select one random distinct eligible persona and have them text about it
            const target = eligiblePersonas[Math.floor(Math.random() * eligiblePersonas.length)];
            const experience = resort?.signatureExperiences?.find(x => x.id === experienceId);
            sendProactiveDM(target.personaId,
                `You're at ${resort?.name} too and just noticed the player booked the "${experience?.name || experienceId}" experience there. Send ONE short text inviting yourself along or teasing them about it.`,
                { trigger: 'reaction', relatedId: resortId, fallback: `Saw you booked the ${experience?.name || 'experience'}. I'm coming. Don't argue.` }
            ).catch(console.error);
        }

        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}
