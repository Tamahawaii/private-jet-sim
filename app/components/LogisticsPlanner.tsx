'use client';

import React, { useState } from 'react';
import { useStore, LocationData } from '../lib/store';
import { calculateDistanceNM } from '../lib/math';
import { Plane, MapPin, Navigation, Trash2, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import AirportSearch from './AirportSearch';

export default function LogisticsPlanner() {
  const { fleet, selectedAircraftId, setSelectedAircraftId, addScheduledLeg, removeScheduledLeg, clearSchedule } = useStore();
  
  const [newOrigin, setNewOrigin] = useState<LocationData | null>(null);
  const [newDestination, setNewDestination] = useState<LocationData | null>(null);

  const selectedJet = fleet.find(j => j.id === selectedAircraftId);

  const formatFlightTime = (distanceNm: number, speedKnots: number) => {
    const hours = distanceNm / speedKnots;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const handleAddLeg = () => {
    if (selectedJet && newOrigin && newDestination) {
      addScheduledLeg(selectedJet.id, newOrigin, newDestination);
      setNewOrigin(newDestination);
      setNewDestination(null);
    }
  };

  const currentDist = (newOrigin && newDestination) 
    ? calculateDistanceNM(newOrigin.lat, newOrigin.lng, newDestination.lat, newDestination.lng) 
    : 0;

  return (
    <div className="absolute inset-0 z-20 flex pt-28 pb-10 px-10 gap-6 bg-black/60 backdrop-blur-xl overflow-y-auto">
      {/* Fleet Sidebar */}
      <div className="w-80 flex flex-col gap-4">
        <h2 className="text-xl font-bold tracking-widest text-[#00f0ff] uppercase mb-2">Fleet Assignments</h2>
        <div className="flex flex-col gap-3">
          {fleet.map(jet => (
            <motion.div 
              key={jet.id}
              whileHover={{ x: 5 }}
              onClick={() => setSelectedAircraftId(jet.id)}
              className={`glass-panel p-4 rounded-xl cursor-pointer border transition-colors ${selectedAircraftId === jet.id ? 'border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.2)] bg-[#00f0ff]/10' : 'border-white/10 hover:border-[#00f0ff]/50'}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold tracking-widest">{jet.tailNumber}</span>
                <span className="text-xs text-white/50">{jet.model}</span>
              </div>
              <div className="text-xs text-white/40 mt-1 uppercase">Speed: {jet.speedKnots} KTS</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Logistics Area */}
      <div className="flex-1 flex flex-col gap-6 max-w-4xl">
        {!selectedJet ? (
          <div className="glass-panel flex-1 rounded-2xl border border-white/10 flex items-center justify-center flex-col text-white/40 gap-4">
            <Navigation size={48} className="opacity-20" />
            <p className="uppercase tracking-widest">Select an aircraft to begin routing</p>
          </div>
        ) : (
          <>
            {/* Header info */}
            <div className="glass-panel p-8 rounded-2xl border border-white/10 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold font-sans tracking-widest mb-1 shadow-black">{selectedJet.tailNumber}</h1>
                <p className="text-[#00f0ff] uppercase tracking-widest text-sm">{selectedJet.model}</p>
              </div>
              <div className="text-right">
                 <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Current Origin</div>
                 <div className="font-bold text-xl">{selectedJet.currentLocation.name}</div>
              </div>
            </div>

            {/* Route Queue */}
            <div className="glass-panel p-8 rounded-2xl border border-[#d4af37]/30 flex flex-col gap-6 shadow-[0_0_20px_rgba(212,175,55,0.05)] flex-1">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold tracking-widest uppercase text-[#d4af37]">Scheduled Manifest</h2>
                {selectedJet.scheduledRoutes.length > 0 && (
                  <button onClick={() => clearSchedule(selectedJet.id)} className="text-xs uppercase tracking-widest text-white/40 hover:text-red-400 transition-colors">Clear All</button>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {selectedJet.scheduledRoutes.length === 0 ? (
                  <div className="py-10 text-center text-white/30 uppercase tracking-widest text-sm border border-dashed border-white/10 rounded-xl bg-white/5">
                    No scheduled legs
                  </div>
                ) : (
                  (selectedJet.scheduledRoutes || []).map((leg, i) => {
                    const dist = calculateDistanceNM(leg.origin.lat, leg.origin.lng, leg.destination.lat, leg.destination.lng);
                    return (
                      <div key={leg.id} className="bg-black/50 border border-white/10 p-4 rounded-xl flex items-center justify-between group">
                        <div className="flex items-center gap-6">
                           <div className="w-6 h-6 flex justify-center items-center rounded-full bg-[#d4af37]/20 text-[#d4af37] text-xs font-bold">{i + 1}</div>
                           
                           <div className="flex items-center gap-4">
                             <div className="text-center w-16">
                               <div className="font-bold text-lg">{leg.origin.name}</div>
                             </div>
                             <Plane size={16} className="text-[#d4af37]/50" />
                             <div className="text-center w-16">
                               <div className="font-bold text-lg">{leg.destination.name}</div>
                             </div>
                           </div>

                           <div className="h-8 w-px bg-white/10 mx-4" />

                           <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2 text-xs text-white/60">
                               <MapPin size={12} className="text-[#00f0ff]" /> <span>{Math.round(dist).toLocaleString()} NM</span>
                             </div>
                             <div className="flex items-center gap-2 text-xs text-white/60">
                               <Clock size={12} className="text-[#00f0ff]" /> <span>{formatFlightTime(dist, selectedJet.speedKnots)}</span>
                             </div>
                           </div>
                        </div>

                        <button 
                          onClick={() => removeScheduledLeg(selectedJet.id, leg.id)}
                          className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2 rounded hover:bg-white/5"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Add Leg UI */}
              <div className="mt-auto bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div className="flex gap-4 items-center">
                 <div className="flex-1 z-50">
                   <AirportSearch 
                     value={newOrigin} 
                     onChange={setNewOrigin} 
                     placeholder="Select Origin Airport..." 
                   />
                 </div>
                 <ArrowRight size={20} className="text-white/40 shrink-0" />
                 <div className="flex-1 z-50">
                   <AirportSearch 
                     value={newDestination} 
                     onChange={setNewDestination} 
                     placeholder="Select Destination Airport..."
                     excludeIata={newOrigin?.name}
                   />
                 </div>
              </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-xs text-white/50">
                    <div>Dist: {Math.round(currentDist)} NM</div>
                    <div className="text-[#d4af37]">Est: {formatFlightTime(currentDist, selectedJet.speedKnots)}</div>
                  </div>
                  <button 
                    onClick={handleAddLeg}
                    disabled={!newOrigin || !newDestination}
                    className="p-3 bg-[#00f0ff]/20 text-[#00f0ff] hover:bg-[#00f0ff]/30 border border-[#00f0ff]/50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-[#00f0ff]/20"
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
