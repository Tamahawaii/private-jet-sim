'use client';

import React, { use } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../lib/db';
import { aircraftRepo } from '../../../lib/repositories/aircraft';
import BottomSheet from './_components/BottomSheet';
import ArrivalRecap from './_components/ArrivalRecap';
import { useRouter } from 'next/navigation';
import { useStore } from '../../lib/store';

export default function ActiveFlightPage({ params }: { params: Promise<{ flightId: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();

    const flight = useLiveQuery(() => db.flights.get(resolvedParams.flightId), [resolvedParams.flightId]);
    const aircraft = useLiveQuery(
        () => (flight ? aircraftRepo.getAll().then(f => f.find(a => a.tailNumber === flight.tailNumber)) : undefined),
        [flight?.tailNumber]
    );

    React.useEffect(() => {
        if (aircraft) useStore.getState().setSelectedAircraftId(aircraft.id);
    }, [aircraft?.id]);

    if (flight === undefined) return null;
    if (flight === null) {
        // Fallback
        return <div className="absolute inset-0 z-50 flex items-center justify-center text-white">FLIGHT NOT FOUND</div>;
    }

    if (!aircraft) return null;

    const isArrived = flight.arrivedAt !== null;

    // We rely on ClientShell exposing MapEngine z-0. 
    // This page just renders the overlay controls.
    return (
        <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-end">
            <button 
               onClick={() => router.push('/world')}
               className="absolute top-24 left-6 pointer-events-auto w-10 h-10 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all font-bold"
            >
               ✕
            </button>
            
            {isArrived ? (
               <ArrivalRecap flight={flight} aircraft={aircraft} />
            ) : (
               <BottomSheet flight={flight} aircraft={aircraft} />
            )}
        </div>
    );
}
