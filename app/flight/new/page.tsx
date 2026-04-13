'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Step1Aircraft from './_components/Step1Aircraft';
import Step2Destination from './_components/Step2Destination';
import Step3Passengers from './_components/Step3Passengers';
import Step4Review from './_components/Step4Review';
import { useLiveQuery } from 'dexie-react-hooks';
import { aircraftRepo } from '../../../lib/repositories/aircraft';
import { Aircraft } from '../../../types';
import airportsData from '../../../data/airports.json';

function FlightPlannerInternal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillAircraft = searchParams.get('aircraft');
  const prefillDestination = searchParams.get('destination');
  const prefillPurpose = searchParams.get('purpose');

  const fleet = useLiveQuery(() => aircraftRepo.getAll()) || [];
  const [events, setEvents] = useState<any[]>([]);

  const [step, setStep] = useState(prefillAircraft ? (prefillDestination ? 3 : 2) : 1);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<any | null>(null);

  // Compute active aircraft falling back to query param
  const activeAircraft = fleet.find(j => j.id === selectedAircraftId) 
     || (prefillAircraft ? fleet.find(j => j.tailNumber === prefillAircraft) : undefined);

  // If prefilled but aircraft isn't valid or parked, force Step 1
  if (prefillAircraft && step === 2 && fleet.length > 0) {
      if (!activeAircraft || activeAircraft.status !== 'parked') {
          setStep(1);
      }
  }

  useEffect(() => {
     if (step === 2 && prefillDestination && !selectedDestination && activeAircraft) {
         const found = airportsData.find(a => a.icao === prefillDestination);
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

  return (
    <div className="absolute inset-0 z-50 bg-[#0a0a0c] text-white flex flex-col md:flex-row overflow-hidden pointer-events-auto">
        {/* Left Panel Sidebar */}
        <div className="w-full md:w-80 bg-black/50 border-r border-white/5 p-6 flex flex-col shrink-0 overflow-y-auto">
            <h1 className="text-xl font-black font-mono tracking-widest mb-8 text-[#00f0ff]">DISPATCHER</h1>
            
            <div className="flex flex-col gap-6 font-mono text-xs tracking-widest">
               <div className={`transition-opacity ${step >= 1 ? 'opacity-100' : 'opacity-30'}`}>
                  <span className="text-[#00f0ff] mr-2">01</span> AIRCRAFT
                  {activeAircraft && <span className="block mt-1 text-zinc-500 font-bold ml-6">{activeAircraft.tailNumber}</span>}
               </div>
               <div className={`transition-opacity ${step >= 2 ? 'opacity-100' : 'opacity-30'}`}>
                  <span className="text-[#00f0ff] mr-2">02</span> DESTINATION
                  {selectedDestination && <span className="block mt-1 text-zinc-500 font-bold ml-6">{selectedDestination.icao}</span>}
               </div>
               <div className={`transition-opacity ${step >= 3 ? 'opacity-100' : 'opacity-30'}`}>
                  <span className="text-[#00f0ff] mr-2">03</span> MANIFEST
               </div>
               <div className={`transition-opacity ${step >= 4 ? 'opacity-100' : 'opacity-30'}`}>
                  <span className="text-[#00f0ff] mr-2">04</span> REVIEW
               </div>
            </div>

            <button 
               onClick={() => router.push('/fleet')}
               className="mt-auto pt-8 text-zinc-500 hover:text-white transition-colors text-left font-mono tracking-widest text-[10px]"
            >
               ✕ ABORT DISPATCH
            </button>
        </div>

        {/* Right Panel Main Content view */}
        <div className="flex-1 bg-black/20 p-6 md:p-12 overflow-y-auto relative outline-none">
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
                  onNext={() => setStep(4)} 
                  onBack={() => setStep(2)}
               />
            )}
            {step === 4 && activeAircraft && selectedDestination && (
               <Step4Review 
                  aircraft={activeAircraft}
                  destination={selectedDestination}
                  onBack={() => setStep(3)}
               />
            )}
        </div>
    </div>
  );
}

export default function FlightPlannerPage() {
  return (
    <Suspense fallback={<div className="bg-[#0a0a0c] absolute inset-0 text-[#00f0ff] p-24 font-mono text-sm tracking-widest animate-pulse">SECURING INSTRUMENTS...</div>}>
      <FlightPlannerInternal />
    </Suspense>
  );
}
