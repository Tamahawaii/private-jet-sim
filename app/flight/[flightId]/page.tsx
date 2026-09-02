'use client';

import React, { use, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db } from '../../../lib/db';
import { aircraftRepo } from '../../../lib/repositories/aircraft';
import { useStore } from '../../lib/store';
import { useSimNow } from '../../lib/useSimNow';
import { getFlightSnapshot } from '../../../lib/flight/engine';
import FlightHUD from './_components/FlightHUD';
import FlightSheet from './_components/FlightSheet';
import ArrivalRecap from './_components/ArrivalRecap';

export default function ActiveFlightPage({ params }: { params: Promise<{ flightId: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const simNow = useSimNow(250);

    const flight = useLiveQuery(() => db.flights.get(resolvedParams.flightId), [resolvedParams.flightId]);
    const aircraft = useLiveQuery(
        () => (flight ? aircraftRepo.getAll().then(f => f.find(a => a.tailNumber === flight.tailNumber)) : undefined),
        [flight?.tailNumber]
    );

    useEffect(() => {
        if (!aircraft) return;
        const st = useStore.getState();
        st.setSelectedAircraftId(aircraft.id);
        st.setFollowSelected(true);
        st.setPeek(null);
    }, [aircraft?.id]);

    if (flight === undefined) return null;
    if (flight === null) {
        return (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white gap-3 pointer-events-auto">
                <div className="font-serif text-2xl">Flight not found</div>
                <button onClick={() => router.push('/')} className="h-10 px-5 rounded-full bg-white text-black text-sm font-semibold">Back to the world</button>
            </div>
        );
    }
    if (!aircraft) return null;

    const isArrived = flight.arrivedAt !== null;
    const snap = getFlightSnapshot(flight, aircraft, simNow);

    return (
        <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-end">
            {!isArrived && <FlightHUD flight={flight} aircraft={aircraft} snap={snap} simNow={simNow} onClose={() => router.push('/')} />}
            {isArrived ? (
               <ArrivalRecap flight={flight} aircraft={aircraft} />
            ) : (
               <FlightSheet flight={flight} aircraft={aircraft} snap={snap} simNow={simNow} />
            )}
        </div>
    );
}
