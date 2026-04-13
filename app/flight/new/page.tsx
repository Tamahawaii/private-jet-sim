'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { aircraftRepo } from '../../../lib/repositories/aircraft';
import { Aircraft } from '../../../types';
import { Plane, MapPin, Users, CheckCircle2, ChevronRight, ChevronLeft, Rocket, Search, Globe2 } from 'lucide-react';
import { useStore } from '../../lib/store';

// Suspense boundary wrapper to fix Next.js useSearchParams strict mode requirement
function PlannerContent() {
   const router = useRouter();
   const searchParams = useSearchParams();
   const preselectedTail = searchParams.get('aircraft');
   const { setSelectedAircraftId } = useStore();
   
   const fleet = useLiveQuery(() => aircraftRepo.getAll()) || [];
   const parkedFleet = fleet.filter(f => f.flightPhase === 'Hangar');
   
   const [step, setStep] = useState(1);
   const [selectedJet, setSelectedJet] = useState<Aircraft | null>(null);
   const [searchQuery, setSearchQuery] = useState('');
   const [airports, setAirports] = useState<any[]>([]);
   const [destination, setDestination] = useState<any | null>(null);

   useEffect(() => {
       fetch('/airports.json')
          .then(r => r.json())
          .then(d => setAirports(d))
          .catch(console.error);
   }, []);

   useEffect(() => {
       if (preselectedTail && parkedFleet.length > 0 && !selectedJet) {
          const j = parkedFleet.find(f => f.tailNumber === preselectedTail);
          if (j) {
             setSelectedJet(j);
             setStep(2);
          }
       }
   }, [preselectedTail, parkedFleet, selectedJet]);

   const filteredAirports = searchQuery.length >= 2 
      ? airports.filter(a => a.iata.toLowerCase().includes(searchQuery.toLowerCase()) || a.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
      : [];

   const handleDispatch = async () => {
       if (!selectedJet || !destination) return;
       
       await aircraftRepo.update(selectedJet.id, {
           flightPhase: 'Pre-flight',
           destination: { lat: destination.lat, lng: destination.lng, name: `${destination.iata} - ${destination.name}` }
       });
       
       setSelectedAircraftId(selectedJet.id);
       router.push('/world');
   };

   return (
     <div className="absolute inset-0 z-50 bg-[#0a0a0c] pt-24 px-6 md:px-10 pb-10 overflow-y-auto text-white flex flex-col items-center">
       <div className="w-full max-w-4xl">
         
         <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-8">
            <h1 className="text-3xl font-black tracking-widest flex items-center gap-3">
               <Globe2 className="text-[#00f0ff]" size={32} />
               FLIGHT PLANNER
            </h1>
            <button onClick={() => router.push('/world')} className="text-sm tracking-widest text-zinc-500 hover:text-white transition-colors">CANCEL</button>
         </div>

         {/* STEPPER */}
         <div className="flex justify-between relative mb-12">
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 -z-10 -translate-y-1/2"></div>
            {[
               { num: 1, label: 'AIRCRAFT', icon: <Plane size={16}/> },
               { num: 2, label: 'DESTINATION', icon: <MapPin size={16}/> },
               { num: 3, label: 'PASSENGERS', icon: <Users size={16}/> },
               { num: 4, label: 'REVIEW', icon: <CheckCircle2 size={16}/> }
            ].map(s => (
               <div key={s.num} className={`flex flex-col items-center gap-2 ${step >= s.num ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-[#0a0a0c] ${step >= s.num ? 'bg-[#00f0ff] text-black font-bold' : 'bg-zinc-800 text-zinc-500'}`}>
                     {step > s.num ? <CheckCircle2 size={20}/> : s.icon}
                  </div>
                  <span className={`text-[10px] font-bold tracking-widest ${step >= s.num ? 'text-[#00f0ff]' : 'text-zinc-500'}`}>{s.label}</span>
               </div>
            ))}
         </div>

         {/* STEP 1: AIRCRAFT */}
         {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h2 className="text-xl font-mono tracking-widest mb-6">SELECT AVAILABLE AIRCRAFT</h2>
               {parkedFleet.length === 0 ? (
                  <div className="bg-red-900/20 text-red-500 p-6 rounded-xl border border-red-500/20 text-center">
                     NO PARKED AIRCRAFT AVAILABLE FOR DISPATCH.
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {parkedFleet.map(jet => (
                        <div 
                           key={jet.id} 
                           onClick={() => setSelectedJet(jet)}
                           className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedJet?.id === jet.id ? 'bg-[#00f0ff]/10 border-[#00f0ff]' : 'bg-[#141419] border-white/5 hover:border-white/20'}`}
                        >
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-xl font-black font-mono text-white">{jet.tailNumber}</span>
                              <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-zinc-400">{jet.model}</span>
                           </div>
                           <div className="text-sm text-zinc-500 flex items-center gap-2">
                              <MapPin size={14}/> {jet.currentLocation?.name || 'Unknown Hangar'}
                           </div>
                        </div>
                     ))}
                  </div>
               )}
               <div className="mt-8 flex justify-end">
                  <button onClick={() => setStep(2)} disabled={!selectedJet} className="bg-white text-black px-6 py-3 rounded tracking-widest font-bold text-sm disabled:opacity-30 flex items-center gap-2 transition-all hover:bg-zinc-300">
                     NEXT STEP <ChevronRight size={16}/>
                  </button>
               </div>
            </div>
         )}

         {/* STEP 2: DESTINATION */}
         {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h2 className="text-xl font-mono tracking-widest mb-6">SELECT DESTINATION</h2>
               
               <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <input 
                     type="text" 
                     placeholder="Search ICAO code or city..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full bg-[#141419] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white font-mono uppercase tracking-widest focus:outline-none focus:border-[#00f0ff] transition-colors"
                  />
               </div>

               <div className="flex flex-col gap-2">
                  {filteredAirports.map(ap => (
                     <div 
                        key={ap.iata} 
                        onClick={() => setDestination(ap)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${destination?.iata === ap.iata ? 'bg-[#00f0ff]/10 border-[#00f0ff]' : 'bg-[#141419] border-white/5 hover:border-white/20'}`}
                     >
                        <div className="flex items-center gap-4">
                           <span className="text-xl font-black font-mono text-[#00f0ff] w-16">{ap.iata}</span>
                           <span className="text-sm font-bold tracking-widest">{ap.name}</span>
                        </div>
                        <div className="text-xs text-zinc-500 font-mono">
                           {ap.lat.toFixed(2)}°, {ap.lng.toFixed(2)}°
                        </div>
                     </div>
                  ))}
                  {searchQuery.length > 0 && filteredAirports.length === 0 && (
                     <div className="text-center py-8 text-zinc-500 font-mono tracking-widest">NO AIRPORTS FOUND</div>
                  )}
               </div>

               <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(1)} className="text-zinc-400 hover:text-white px-4 py-3 rounded tracking-widest font-bold text-sm flex items-center gap-2 transition-colors">
                     <ChevronLeft size={16}/> BACK
                  </button>
                  <button onClick={() => setStep(3)} disabled={!destination} className="bg-white text-black px-6 py-3 rounded tracking-widest font-bold text-sm disabled:opacity-30 flex items-center gap-2 transition-all hover:bg-zinc-300">
                     NEXT STEP <ChevronRight size={16}/>
                  </button>
               </div>
            </div>
         )}

         {/* STEP 3: PASSENGERS */}
         {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-[#141419] p-12 rounded-xl border border-white/5 border-dashed text-center">
               <Users size={48} className="text-zinc-600 mx-auto mb-4" />
               <h3 className="text-zinc-400 font-mono tracking-widest mb-1 text-xl">MANIFEST OVERRIDE</h3>
               <p className="text-zinc-600 text-sm max-w-md mx-auto mb-8">Passenger manifests and high-profile VIP client generation will unlock in Phase 3. Default simulator crew injected.</p>
               
               <div className="flex justify-between w-full mt-8">
                  <button onClick={() => setStep(2)} className="text-zinc-400 hover:text-white py-3 rounded tracking-widest font-bold text-sm flex items-center gap-2 transition-colors">
                     <ChevronLeft size={16}/> BACK
                  </button>
                  <button onClick={() => setStep(4)} className="bg-white text-black px-6 py-3 rounded tracking-widest font-bold text-sm flex items-center gap-2 transition-all hover:bg-zinc-300">
                     NEXT STEP <ChevronRight size={16}/>
                  </button>
               </div>
            </div>
         )}

         {/* STEP 4: REVIEW */}
         {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h2 className="text-xl font-mono tracking-widest mb-6">PRE-FLIGHT BRIEFING</h2>
               
               <div className="bg-[#141419] p-8 rounded-xl border border-[#00f0ff]/30 shadow-[0_0_50px_rgba(0,240,255,0.05)]">
                  <div className="grid grid-cols-2 gap-8 mb-8">
                     <div>
                        <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">AIRCRAFT</span>
                        <div className="text-2xl font-black font-mono text-white">{selectedJet?.tailNumber}</div>
                        <div className="text-sm text-[#00f0ff]">{selectedJet?.model}</div>
                     </div>
                     <div>
                        <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">ORIGIN</span>
                        <div className="text-lg font-bold text-white truncate">{selectedJet?.currentLocation?.name || 'Hangar'}</div>
                     </div>
                  </div>

                  <div className="w-full bg-[#0a0a0c] p-6 rounded-lg border border-white/5 mb-8">
                     <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">DESTINATION</span>
                     <div className="text-3xl font-black font-mono text-emerald-400 mb-1">{destination?.iata}</div>
                     <div className="text-sm text-emerald-400/70">{destination?.name}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                     <div className="bg-black/40 p-4 rounded text-center">
                        <span className="block text-[10px] text-zinc-500 tracking-widest mb-1">SOB</span>
                        <span className="font-mono text-white font-bold">2 CREW</span>
                     </div>
                     <div className="bg-black/40 p-4 rounded text-center">
                        <span className="block text-[10px] text-zinc-500 tracking-widest mb-1">WX</span>
                        <span className="font-mono text-white font-bold">VMC</span>
                     </div>
                     <div className="bg-black/40 p-4 rounded text-center">
                        <span className="block text-[10px] text-zinc-500 tracking-widest mb-1">STATUS</span>
                        <span className="font-mono text-[#00f0ff] font-bold">CLEARED</span>
                     </div>
                  </div>

                  <button 
                     onClick={handleDispatch}
                     className="w-full bg-[#00f0ff] hover:bg-emerald-400 text-black py-4 rounded font-black tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                     <Rocket size={20}/> FILE PLAN & LAUNCH
                  </button>
               </div>
               <div className="mt-6 flex justify-start">
                  <button onClick={() => setStep(3)} className="text-zinc-400 hover:text-white px-4 py-3 rounded tracking-widest font-bold text-sm flex items-center gap-2 transition-colors">
                     <ChevronLeft size={16}/> BACK
                  </button>
               </div>
            </div>
         )}

       </div>
     </div>
   );
}

export default function FlightPlannerWrapper() {
  return (
    <Suspense fallback={<div className="absolute inset-0 bg-[#0a0a0c] z-50 flex items-center justify-center font-mono text-[#00f0ff] animate-pulse">BOOTING DISPATCHER...</div>}>
      <PlannerContent />
    </Suspense>
  );
}
