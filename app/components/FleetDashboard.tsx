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
    <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#001D4A] via-black/90 to-transparent pt-40 pb-6 pointer-events-none">
      
      {/* Hangar Graphic Tab */}
      <div className="absolute right-0 bottom-32 bg-[#003366] border-t border-l border-[#00f0ff]/30 text-white px-8 py-2 -rotate-90 origin-bottom-right rounded-tl-xl font-bold tracking-[0.2em] shadow-2xl pointer-events-auto text-xs translate-x-[47%]">
         HANGAR
      </div>

      <div className="flex overflow-x-auto gap-3 px-4 pb-4 snap-x snap-mandatory pointer-events-auto w-full" style={{ scrollbarWidth: 'none' }}>
        
        {/* Time Settings Block */}
        <div className="w-[120px] shrink-0 snap-center flex flex-col justify-center items-center bg-[#001D4A]/60 border border-white/20 rounded-xl p-3 shadow-xl backdrop-blur-md">
            <Clock className="text-[#00f0ff] mb-2" size={20}/>
            <span className="text-[10px] uppercase tracking-widest text-[#00f0ff] font-bold mb-3 text-center leading-tight">Time<br/>Scale</span>
            <div className="flex flex-col gap-1.5 w-full">
               {[1, 10, 60].map(m => (
                 <button 
                   key={m} 
                   onClick={() => setTimeMultiplier(m)}
                   className={`w-full py-1.5 text-[10px] font-mono font-bold rounded shadow transition-all ${timeMultiplier === m ? 'bg-[#00f0ff] text-[#001D4A] scale-105' : 'bg-black/60 text-white/60 border border-white/10 hover:bg-white/20 hover:text-white'}`}
                 >
                   {m}x
                 </button>
               ))}
               <button 
                  onClick={() => setTimeMultiplier(3600)}
                  className={`w-full py-1.5 mt-1 text-[10px] font-mono font-extrabold rounded shadow transition-all ${timeMultiplier === 3600 ? 'bg-[#ff0055] text-white scale-105 shadow-[0_0_10px_#ff0055]' : 'bg-[#ff0055]/20 text-[#ff0055] border border-[#ff0055]/50 hover:bg-[#ff0055]/40'}`}
               >
                 SKIP
               </button>
            </div>
        </div>

        {/* Aircraft Carousel */}
        {fleet.map((jet, i) => {
            const locked = isLocked(jet.lockedUntil);
            const imgSource = jet.model.includes('BBJ') || jet.model.includes('ACJ') ? 'bbj' : jet.model.includes('Citation') || jet.model.includes('Praetor') ? 'citation' : 'gulfstream';
            return (
              <motion.div 
                 key={jet.id}
                 whileTap={{ scale: 0.98 }}
                 onClick={() => handleSelect(jet.id)}
                 className={`w-[260px] shrink-0 snap-center rounded-xl cursor-pointer relative min-h-[190px] group border-2 shadow-2xl overflow-hidden ${locked ? 'border-[#d4af37] shadow-[#d4af37]/20 bg-[#2b2512]' : 'border-[#00f0ff]/40 bg-[#001D4A]/40 hover:border-white'}`}
              >
                  {/* Procedural Image overlay */}
                  <div className="absolute inset-0 bg-transparent mix-blend-screen pointer-events-none">
                     <div className="absolute inset-0 flex items-center justify-center opacity-40 mix-blend-luminosity">
                        <span className="text-white text-5xl opacity-20">✈</span>
                     </div>
                  </div>

                  <div className="p-4 relative z-10 flex flex-col justify-between h-full bg-gradient-to-t from-black via-black/40 to-transparent">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                           <span className={`text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded shadow ${locked ? 'bg-[#d4af37] text-black' : 'bg-[#00f0ff] text-[#001D4A]'}`}>
                              {locked ? 'ACTIVE' : 'IDLE'}
                           </span>
                        </div>
                        <h2 className="text-xl font-black tracking-wider text-white drop-shadow-md">{jet.tailNumber}</h2>
                        <span className="text-[10px] uppercase tracking-widest text-[#00f0ff]/80 font-bold drop-shadow">{jet.model}</span>
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-auto">
                       <div className="bg-black/60 rounded p-2 border border-white/10 flex items-center gap-2 backdrop-blur hover:border-white/30 transition-colors" onClick={e => e.stopPropagation()}>
                          <MapPin size={14} className="text-[#00f0ff]"/>
                          <div className="flex-1">
                             <AirportSearch 
                               value={jet.currentLocation} 
                               onChange={(loc) => { if (!locked) setAircraftRoute(jet.id, loc, null); }}
                               placeholder="Set Fleet Hub"
                             />
                          </div>
                       </div>
                       <div className="w-full text-center py-1.5 uppercase tracking-widest text-[10px] font-bold bg-white/5 border border-white/10 rounded">
                          {locked ? jet.flightPhase : 'Ready for Dispatch'}
                       </div>
                    </div>
                  </div>
              </motion.div>
            )
        })}

      </div>
    </div>
  );
}
