'use client';

import React, { useState, useEffect } from 'react';
import { useStore, LocationData, Aircraft } from '../lib/store';
import { Plane, AlertTriangle, ArrowRight, Clock, Plus, Trash2 } from 'lucide-react';
import AirportSearch from './AirportSearch';
import { calculateDistanceNM } from '../lib/math';

export default function LogisticsPlanner() {
  const { fleet, setProvisionalRoute, addScheduledLeg, removeScheduledLeg } = useStore();
  
  const [origin, setOrigin] = useState<LocationData | null>(null);
  const [destination, setDestination] = useState<LocationData | null>(null);

  useEffect(() => {
    if (origin && destination) {
       setProvisionalRoute({ origin, destination });
    } else {
       setProvisionalRoute(null);
    }
    return () => setProvisionalRoute(null);
  }, [origin, destination, setProvisionalRoute]);

  const projectedDistance = origin && destination ? calculateDistanceNM(origin.lat, origin.lng, destination.lat, destination.lng) : 0;

  const getLegDate = (index: number) => {
      const d = new Date(Date.now() + (index + 1) * 86400000); // Add 1 day per leg for mock scheduling
      const dateStr = d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return `${dateStr} @ 08:00 LOCAL`;
  };

  const handleBook = (jetId: string) => {
    if (origin && destination) {
       addScheduledLeg(jetId, origin, destination);
       setOrigin(null);
       setDestination(null);
    }
  };

  const getJetViability = (jet: Aircraft) => {
    const rangeNM = jet.model.includes('BBJ') || jet.model.includes('ACJ') ? 8000 : jet.model.includes('Citation') || jet.model.includes('Praetor') ? 3500 : 7500;
    const isOutofRange = projectedDistance > rangeNM;
    
    // Determine where the jet will be based on its currently scheduled routes, or its current active location
    const effectiveLocation = jet.scheduledRoutes.length > 0 ? jet.scheduledRoutes[jet.scheduledRoutes.length - 1].destination : (jet.destination || jet.currentLocation);
    const requiresFerry = origin ? (effectiveLocation.name !== origin.name) : false;
    
    return { rangeNM, isOutofRange, requiresFerry, effectiveLocation };
  };

  return (
    <div className="absolute inset-y-0 left-0 w-[500px] z-20 flex flex-col pt-28 pb-10 px-6 gap-6 bg-black/60 backdrop-blur-xl border-r border-white/5 overflow-y-auto">
      
      {/* Route Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-widest text-[#00f0ff] mb-2 uppercase">Logistics</h1>
        <p className="text-white/60 text-sm">Orchestrate global fleet routing</p>
      </div>

      {/* Origin/Dest Search */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4 border border-white/10 shrink-0 relative overflow-visible">
         <div className="relative z-50">
           <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1 block">Departure</label>
           <AirportSearch value={origin} onChange={setOrigin} placeholder="Select Origin Hub" />
         </div>
         <div className="relative z-40">
           <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1 block">Arrival</label>
           <AirportSearch value={destination} onChange={setDestination} placeholder="Select Destination Hub" excludeIata={origin?.name} />
         </div>

         {origin && destination && (
           <div className="mt-2 pt-4 border-t border-white/10 flex justify-between items-center text-sm font-mono">
             <span className="text-white/50">Direct Distance:</span>
             <span className="text-[#00f0ff] font-bold">{Math.floor(projectedDistance).toLocaleString()} NM</span>
           </div>
         )}
      </div>

      {/* Available Fleet Matrix */}
      {origin && destination && (
        <div className="flex flex-col gap-4 shrink-0">
          <h3 className="text-xs tracking-widest uppercase font-bold text-white/60">Available Assets</h3>
          <div className="flex flex-col gap-3">
             {fleet.map(jet => {
                const { rangeNM, isOutofRange, requiresFerry, effectiveLocation } = getJetViability(jet);
                return (
                  <div key={jet.id} className={`glass-panel p-4 rounded-xl border flex flex-col gap-3 transition-colors ${isOutofRange ? 'opacity-30 border-red-500/30' : 'border-[#00f0ff]/20 hover:border-[#00f0ff]/50'}`}>
                    
                    <div className="flex justify-between items-start">
                       <div>
                          <div className="font-bold tracking-widest text-white">{jet.tailNumber}</div>
                          <div className="text-[10px] uppercase tracking-widest text-[#00f0ff]">{jet.model}</div>
                       </div>
                       <div className="text-right">
                          <div className="text-xs font-mono text-white/60">RNG: {rangeNM.toLocaleString()} <span className="text-[10px]">NM</span></div>
                       </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                       {isOutofRange ? (
                          <span className="text-[10px] uppercase tracking-widest font-bold text-red-500 flex items-center gap-1"><AlertTriangle size={12}/> Out of Range</span>
                       ) : requiresFerry ? (
                          <span className="text-[10px] uppercase tracking-widest font-bold text-amber-500 flex items-center gap-1"><AlertTriangle size={12}/> Ferry {effectiveLocation.name} → {origin.name}</span>
                       ) : (
                          <span className="text-[10px] uppercase tracking-widest font-bold text-green-400 flex items-center gap-1"><Plane size={12}/> At Origin Hub</span>
                       )}

                       <button 
                         onClick={() => handleBook(jet.id)}
                         disabled={isOutofRange}
                         className="px-4 py-2 bg-[#00f0ff]/20 text-[#00f0ff] hover:bg-[#00f0ff]/30 text-xs font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-0"
                       >
                         Dispatch
                       </button>
                    </div>

                  </div>
                );
             })}
          </div>
        </div>
      )}

      {!origin && !destination && (
         <div className="mt-8 flex flex-col gap-4">
            <h3 className="text-xs tracking-widest uppercase font-bold text-white/60">Global Itineraries</h3>
            <div className="flex flex-col gap-4">
               {fleet.filter(j => j.scheduledRoutes.length > 0).map(jet => (
                  <div key={jet.id} className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                     <span className="text-xs font-bold tracking-widest text-[#00f0ff]">{jet.tailNumber} Itinerary</span>
                     <div className="flex flex-col gap-2">
                        {jet.scheduledRoutes.map((leg, i) => (
                           <div key={leg.id} className="flex flex-col p-3 bg-black/40 rounded-lg border border-white/5 group">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Leg 0{i+1} • {getLegDate(i)}</span>
                                <button onClick={() => removeScheduledLeg(jet.id, leg.id)} className="text-red-500/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                              </div>
                              <div className="flex items-center gap-3">
                                 <span className="text-sm font-bold text-white">{leg.origin.name}</span>
                                 <ArrowRight size={14} className="text-[#00f0ff]/50"/>
                                 <span className="text-sm font-bold text-white">{leg.destination.name}</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               ))}
               {fleet.filter(j => j.scheduledRoutes.length > 0).length === 0 && (
                  <div className="text-xs text-white/30 text-center py-10 uppercase tracking-widest">No Future Manifests</div>
               )}
            </div>
         </div>
      )}

    </div>
  );
}
