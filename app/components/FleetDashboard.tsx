'use client';

import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { Plane, Plus, MapPin, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import AirportSearch from './AirportSearch';

export default function FleetDashboard() {
  const { fleet, setSelectedAircraftId, setActiveView, timeMultiplier, setTimeMultiplier, setAircraftRoute } = useStore();

  const handleSelect = (id: string) => {
    setSelectedAircraftId(id);
    setActiveView('StateMachine');
  };

  const isLocked = (lockedUntil: number | null) => lockedUntil ? Date.now() < lockedUntil : false;

  return (
    <div className="absolute inset-0 z-20 flex pt-28 pb-10 px-10 gap-10 bg-black/60 backdrop-blur-xl overflow-y-auto">
      <div className="flex-1 max-w-6xl mx-auto flex flex-col gap-8">
        
        <div className="flex justify-between items-center bg-white/5 border border-white/10 p-6 rounded-2xl glass-panel">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-[#00f0ff] mb-2 uppercase">Hangar Fleet</h1>
            <p className="text-white/60 text-sm">Manage your aircraft and orchestrate flights</p>
          </div>
          
          <div className="flex flex-col items-end gap-3">
             <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                {[1, 10, 60, 3600].map(m => (
                  <button 
                    key={m} 
                    onClick={() => setTimeMultiplier(m)}
                    className={`px-3 py-1 text-xs font-mono rounded transition-colors ${timeMultiplier === m ? 'bg-[#00f0ff]/20 text-[#00f0ff]' : 'text-white/50 hover:text-white'}`}
                  >
                    {m}x
                  </button>
                ))}
             </div>
             <p className="text-xs text-white/40 tracking-widest uppercase">Time Scale Scale</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fleet.map(jet => {
            const locked = isLocked(jet.lockedUntil);
            const imgSource = jet.model.includes('BBJ') || jet.model.includes('ACJ') ? 'bbj' : jet.model.includes('Citation') || jet.model.includes('Praetor') ? 'citation' : 'gulfstream';
            return (
              <motion.div 
                key={jet.id}
                whileHover={{ y: -5 }}
                onClick={() => handleSelect(jet.id)}
                className={`rounded-2xl cursor-pointer transition-all overflow-hidden relative min-h-[180px] group border shadow-xl ${locked ? 'border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'border-[#00f0ff]/20 hover:border-[#00f0ff]/80 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]'}`}
              >
                {/* Background Image injected procedurally */}
                <div className="absolute inset-0 bg-black">
                  <img 
                     src={`/aircraft/${imgSource}.png`} 
                     alt={jet.model}
                     className="w-full h-full object-cover mix-blend-luminosity opacity-30 group-hover:opacity-70 group-hover:mix-blend-normal transition-all duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
                </div>

                <div className="p-6 relative z-10 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                      <Plane className={locked ? 'text-[#d4af37]' : 'text-[#00f0ff]'} />
                      <h2 className="text-xl font-bold tracking-wider text-white drop-shadow-md">{jet.tailNumber}</h2>
                    </div>
                    <span className="text-xs uppercase tracking-widest text-[#00f0ff] font-bold bg-black/50 px-2 py-1 rounded backdrop-blur-md">{jet.model}</span>
                  </div>
                  
                  <div className="flex flex-col gap-3 mt-auto">
                    <div className="flex items-center gap-3 relative z-30">
                      <MapPin size={16} className="text-white/40"/>
                      <div className="text-[10px] uppercase font-bold flex items-center gap-2 text-white/50 w-full">
                        BASE
                        <div className="w-[120px] text-white" onClick={(e) => e.stopPropagation()}>
                           <AirportSearch 
                             value={jet.currentLocation} 
                             onChange={(loc) => {
                                if (!locked) setAircraftRoute(jet.id, loc, null);
                             }}
                            placeholder="Set Hub"
                           />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-white/40"/>
                      <span className="text-sm font-medium">Status: <strong className={locked ? 'text-[#d4af37]' : 'text-[#00f0ff]'}>{jet.flightPhase}</strong></span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

        </div>
      </div>
    </div>
  );
}
