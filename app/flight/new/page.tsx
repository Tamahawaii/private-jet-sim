'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, Check } from 'lucide-react';
import Step1Aircraft from './_components/Step1Aircraft';
import Step2Destination from './_components/Step2Destination';
import Step3Passengers from './_components/Step3Passengers';
import Step4Review from './_components/Step4Review';
import { useLiveQuery } from 'dexie-react-hooks';
import { aircraftRepo } from '../../../lib/repositories/aircraft';
import { getAirport } from '../../../lib/flight/airports';
import { useStore } from '../../lib/store';

const STEPS = ['Aircraft', 'Destination', 'Company', 'Briefing'];

function FlightPlannerInternal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillAircraft = searchParams.get('aircraft');
  const prefillDestination = searchParams.get('destination');
  const prefillPurpose = searchParams.get('purpose');

  const fleet = useLiveQuery(() => aircraftRepo.getAll()) || [];

  const [step, setStep] = useState(prefillAircraft ? (prefillDestination ? 3 : 2) : 1);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<any | null>(null);
  const [passengers, setPassengers] = useState<string[]>(['player']);
  const setProvisionalRoute = useStore(s => s.setProvisionalRoute);
  const setPeek = useStore(s => s.setPeek);

  // Compute active aircraft falling back to query param
  const activeAircraft = fleet.find(j => j.tailNumber === selectedAircraftId)
     || (prefillAircraft ? fleet.find(j => j.tailNumber === prefillAircraft) : undefined);

  // If prefilled but aircraft isn't valid or parked, force Step 1
  useEffect(() => {
    if (prefillAircraft && step >= 2 && fleet.length > 0 && !selectedAircraftId) {
      if (!activeAircraft || activeAircraft.status !== 'parked') setStep(1);
    }
  }, [prefillAircraft, step, fleet.length, activeAircraft?.status, selectedAircraftId]);

  useEffect(() => {
     if (step === 2 && prefillDestination && !selectedDestination && activeAircraft) {
         const found = getAirport(prefillDestination);
         if (found) {
             const modified: any = { ...found };
             if (prefillPurpose) {
                 modified.purpose = prefillPurpose;
                 modified.purposeName = prefillPurpose.startsWith('event:') ? 'Attending Event' : prefillPurpose;
             }
             setSelectedDestination(modified);
             setStep(3);
         }
     }
  }, [step, prefillDestination, prefillPurpose, selectedDestination, activeAircraft]);

  // Keep the globe's preview line in sync with the chosen destination
  useEffect(() => {
    setPeek(null);
    if (activeAircraft?.currentLocation && selectedDestination) {
      setProvisionalRoute({
        origin: { lat: activeAircraft.currentLocation.lat, lng: activeAircraft.currentLocation.lng, name: activeAircraft.currentLocationICAO },
        destination: { lat: selectedDestination.lat, lng: selectedDestination.lng, name: selectedDestination.icao },
      });
    }
    return () => setProvisionalRoute(null);
  }, [activeAircraft?.tailNumber, selectedDestination?.icao]);

  useEffect(() => {
    if (activeAircraft) useStore.getState().setSelectedAircraftId(activeAircraft.id);
  }, [activeAircraft?.id]);

  return (
    <div className="absolute inset-y-0 left-0 w-full md:w-[560px] z-50 text-white flex flex-col pointer-events-auto bg-[#070b12] md:bg-[#070b12]/85 md:backdrop-blur-2xl md:border-r md:border-white/10">
        {/* Header */}
        <div className="px-5 md:px-8 pb-3 flex items-center justify-between shrink-0" style={{ paddingTop: 'calc(var(--nav-h) + var(--safe-top) + 6px)' }}>
            <div>
              <div className="eyebrow">Dispatch</div>
              <h1 className="font-serif text-[22px] text-white leading-tight">Plan a flight</h1>
            </div>
            <button onClick={() => router.push(activeAircraft ? `/fleet/${activeAircraft.tailNumber}` : '/fleet')} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300" aria-label="Cancel">
              <X size={16} />
            </button>
        </div>

        {/* Stepper */}
        <div className="px-5 md:px-8 pb-4 shrink-0">
          <ol className="flex items-center gap-2">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = step > n; const active = step === n;
              return (
                <li key={label} className="flex items-center gap-2 min-w-0">
                  <button
                    disabled={!done}
                    onClick={() => done && setStep(n)}
                    className={`flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-semibold tracking-wide transition-colors ${active ? 'bg-white text-black' : done ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'bg-white/5 text-zinc-600'}`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono ${active ? 'bg-black/10' : done ? 'bg-[var(--accent)] text-black' : 'bg-white/10'}`}>{done ? <Check size={9} strokeWidth={3} /> : n}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                  {i < STEPS.length - 1 && <span className={`w-3 h-px ${done ? 'bg-[var(--accent)]/50' : 'bg-white/10'}`} />}
                </li>
              );
            })}
          </ol>
          {(activeAircraft || selectedDestination) && (
            <div className="mt-2 text-[11.5px] font-mono text-zinc-500 truncate">
              {activeAircraft?.tailNumber}{activeAircraft && <span className="text-zinc-700"> · {activeAircraft.model}</span>}{selectedDestination && <span> → <span className="text-[var(--accent)]">{selectedDestination.icao}</span></span>}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 px-5 md:px-8 pb-4 overflow-y-auto no-scrollbar relative">
            {step === 1 && (
               <Step1Aircraft
                  fleet={fleet}
                  prefillError={prefillAircraft ? (!activeAircraft || activeAircraft.status !== 'parked') : false}
                  onSelect={(id) => { setSelectedAircraftId(id); setStep(2); }}
               />
            )}
            {step === 2 && activeAircraft && (
               <Step2Destination
                  aircraft={activeAircraft}
                  prefillDestination={prefillDestination}
                  prefillPurpose={prefillPurpose}
                  onSelect={(dest) => { setSelectedDestination(dest); setStep(3); }}
                  onBack={() => setStep(1)}
               />
            )}
            {step === 3 && activeAircraft && selectedDestination && (
               <Step3Passengers
                  aircraft={activeAircraft}
                  selectedPassengers={passengers}
                  onChange={setPassengers}
                  onNext={() => setStep(4)}
                  onBack={() => setStep(2)}
               />
            )}
            {step === 4 && activeAircraft && selectedDestination && (
               <Step4Review
                  aircraft={activeAircraft}
                  destination={selectedDestination}
                  passengers={passengers}
                  onBack={() => setStep(3)}
               />
            )}
        </div>
    </div>
  );
}

export default function FlightPlannerPage() {
  return (
    <Suspense fallback={<div className="bg-[#070b12] absolute inset-0 text-[var(--accent)] p-24 font-mono text-sm tracking-widest animate-pulse">SECURING INSTRUMENTS...</div>}>
      <FlightPlannerInternal />
    </Suspense>
  );
}
